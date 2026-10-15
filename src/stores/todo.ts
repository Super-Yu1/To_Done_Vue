/** 任务列表 / 筛选 / 统计（见 8.3、8.5、8.8） */
import { reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import * as taskApi from '@/api/task'
import { PAGE_SIZE, TASK_PRIORITY_LABEL, TASK_STATUS_LABEL } from '@/constants'
import { groupTasksByState } from '@/utils/task'
import { toIsoLocal } from '@/utils/date'
import { readStrikeMs, sleep } from '@/utils/timing'
import type { Task, TaskPayload, TaskPriority, TaskQuery, TaskStats, TaskStatus } from '@/types'

/** 行内快捷改 / 批量改的并发上限：N 个请求别一次全压出去 */
const BATCH_CONCURRENCY = 4

/**
 * 行内快捷改的 data 段：与编辑弹窗保存时同构，两处刻意的不同 ——
 * ① `refreshRecordedAt` 恒为 false：否则后端默认刷新 recordedAt，任务会跳到未完成组最上面；
 * ② 不带 imageOrder：契约里省略 = 保留全部旧图（也不会动已上传的图）。
 */
function quickPayload(task: Task): TaskPayload {
  return {
    title: task.title,
    description: task.description ?? undefined,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    refreshRecordedAt: false,
  }
}

/** 并发跑 N 个请求，返回失败的条目（调用方决定怎么提示） */
async function runBatch<T>(items: T[], worker: (item: T) => Promise<unknown>): Promise<T[]> {
  const queue = [...items]
  const failed: T[] = []
  async function next(): Promise<void> {
    const item = queue.shift()
    if (!item) return
    try {
      await worker(item)
    } catch {
      failed.push(item)
    }
    await next()
  }
  await Promise.all(Array.from({ length: Math.min(BATCH_CONCURRENCY, items.length) }, next))
  return failed
}

export const useTodoStore = defineStore('todo', () => {
  /** query 用 reactive 承载全部筛选与分页参数，页面直接 v-model（8.3） */
  const query = reactive<TaskQuery>({
    page: 1,
    size: PAGE_SIZE,
    keyword: '',
    status: undefined,
    priority: undefined,
  })

  const tasks = ref<Task[]>([])
  const stats = ref<TaskStats | null>(null)
  const total = ref(0)
  const totalPages = ref(0)
  const loading = ref(false)

  /** 空值统一剔除，保证「未填 = 不筛选」（8.3） */
  function buildParams(): TaskQuery {
    const params: TaskQuery = { ...query }
    if (!params.keyword) delete params.keyword
    if (!params.status) delete params.status
    if (!params.priority) delete params.priority
    return params
  }

  async function fetchPage(page: number, append: boolean) {
    loading.value = true
    query.page = page
    try {
      const result = await taskApi.fetchTasks(buildParams())
      // 顺序统一由 groupTasksByState 决定：未完成在前、已完成在后（见 utils/task）
      tasks.value = groupTasksByState(append ? [...tasks.value, ...result.records] : result.records)
      total.value = result.total
      totalPages.value = result.totalPages
    } finally {
      loading.value = false
    }
  }

  /** 筛选切换 / 重组列表：从第 1 页重取（8.5） */
  async function fetchTasks() {
    await fetchPage(1, false)
  }

  /** 滚动到底加载下一页；取不满一页即到底（8.5） */
  async function loadMore() {
    if (loading.value || query.page >= totalPages.value) return
    await fetchPage(query.page + 1, true)
  }

  async function fetchStats() {
    stats.value = await taskApi.fetchTaskStats()
  }

  async function refresh() {
    await Promise.all([fetchTasks(), fetchStats()])
  }

  /** 新建：images 为新增配图；onProgress 透传上传进度（0~100），无图时不会触发 */
  async function createTask(
    payload: TaskPayload,
    images: File[] = [],
    onProgress?: (percent: number) => void,
  ) {
    await taskApi.createTask(payload, images, onProgress)
    await refresh()
  }

  /** 更新：images 为本次新增的图，payload.imageOrder 表达最终顺序（含删除） */
  async function updateTask(
    id: string,
    payload: TaskPayload,
    images: File[] = [],
    onProgress?: (percent: number) => void,
  ) {
    await taskApi.updateTask(id, payload, images, onProgress)
    await refresh()
  }

  /**
   * 勾选完成 / 取消完成：乐观更新，失败回滚。
   * 刻意分两步走，让动效有先后：先只改这一行的状态（横线自左向右划掉），
   * 等划线播完再重排（卡片下移到已完成那一段），而不是两件事挤在同一帧。
   * recordedAt 不动（V8.11 ②），只写 completedAt —— 它决定卡片在已完成组里的位置。
   */
  async function changeStatus(id: string, status: TaskStatus) {
    const previous = tasks.value.find((item) => item.id === id)
    if (!previous) return

    const next: Task = {
      ...previous,
      status,
      statusLabel: TASK_STATUS_LABEL[status],
      completedAt: status === 'DONE' ? toIsoLocal(new Date()) : null,
    }

    // ① 只替换这一行、不重排：数组顺序不变，划线动画这才播得出来
    tasks.value = tasks.value.map((item) => (item.id === id ? next : item))

    // 请求与划线并行发出；先挂上失败处理，避免延迟 await 变成未处理的拒绝
    let failed = false
    const request = taskApi.changeTaskStatus(id, status).catch(() => {
      failed = true
    })

    // ② 等划线播完再落位
    await sleep(readStrikeMs())
    tasks.value = groupTasksByState(tasks.value)
    await request

    if (failed) {
      // 失败时立刻回滚：划线收起，位置归位
      tasks.value = groupTasksByState(tasks.value.map((item) => (item.id === id ? previous : item)))
    }
  }

  /** 删除任务后刷新列表；删除末页最后一条时自动回退页码（8.3） */
  async function removeTask(id: string) {
    await taskApi.removeTask(id)
    const isLastOfPage = tasks.value.length === 1 && query.page > 1
    await Promise.all([fetchPage(isLastOfPage ? query.page - 1 : query.page, false), fetchStats()])
  }

  /**
   * 行内快捷改（E：优先级 / 截止时间）：乐观更新这一行，**不整表刷新**——
   * 刷新会把无限滚动已加载的多页缩回第 1 页，等于把用户拽回列表顶部。
   * 失败即回滚（提示由 http 层给）。
   */
  async function patchTask(id: string, patch: { priority?: TaskPriority; dueDate?: string | null }) {
    const previous = tasks.value.find((item) => item.id === id)
    if (!previous) return

    const next: Task = {
      ...previous,
      ...(patch.priority
        ? { priority: patch.priority, priorityLabel: TASK_PRIORITY_LABEL[patch.priority] }
        : {}),
      ...(patch.dueDate !== undefined ? { dueDate: patch.dueDate } : {}),
    }
    tasks.value = tasks.value.map((item) => (item.id === id ? next : item))

    try {
      await taskApi.updateTask(id, quickPayload(next))
    } catch {
      tasks.value = tasks.value.map((item) => (item.id === id ? previous : item))
    }
  }

  /** 批量改状态（F）：N 个 PATCH，全部跑完后统一重取第 1 页与统计；返回失败条数 */
  async function batchChangeStatus(targets: Task[], status: TaskStatus) {
    const failed = await runBatch(targets, (task) => taskApi.changeTaskStatus(task.id, status))
    await refresh()
    return failed.length
  }

  /** 批量改优先级（F）：每条一次 PUT（data 与行内快捷改同构），跑完统一重取 */
  async function batchChangePriority(targets: Task[], priority: TaskPriority) {
    const failed = await runBatch(targets, (task) =>
      taskApi.updateTask(task.id, quickPayload({ ...task, priority })),
    )
    await refresh()
    return failed.length
  }

  /** 批量删除（F）：N 个软删除，跑完统一重取；返回失败条数 */
  async function batchRemoveTasks(targets: Task[]) {
    const failed = await runBatch(targets, (task) => taskApi.removeTask(task.id))
    await refresh()
    return failed.length
  }

  return {
    query,
    tasks,
    stats,
    total,
    totalPages,
    loading,
    fetchTasks,
    loadMore,
    fetchStats,
    refresh,
    createTask,
    updateTask,
    changeStatus,
    removeTask,
    patchTask,
    batchChangeStatus,
    batchChangePriority,
    batchRemoveTasks,
  }
})
