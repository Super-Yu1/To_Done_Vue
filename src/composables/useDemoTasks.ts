/**
 * 演示模式的数据源（8.6）：内置示范数据的内存态，与回收站页共用同一份（见 mock/demoState）。
 * 读写都是真的——新建 / 编辑 / 删除 / 切状态立即生效，只是不落库、不请求后端，刷新即还原；
 * 独立于 stores 是有意为之：不往真实链路的 store 里塞 mock 分支。
 */
import { computed, reactive, ref } from 'vue'
import { demoTrash, demoTasks, nextDemoId } from '@/mock/demoState'
import { DEMO_TRASH_RETENTION_DAYS } from '@/mock/demoTrash'
import { PAGE_SIZE, TASK_PRIORITY_LABEL, TASK_STATUS_LABEL } from '@/constants'
import { groupTasksByState } from '@/utils/task'
import { readStrikeMs, sleep } from '@/utils/timing'
import { isDueToday, isOverdue, toIsoLocal } from '@/utils/date'
import type { Task, TaskPayload, TaskQuery, TaskStats, TaskStatus } from '@/types'

export function useDemoTasks() {
  const query = reactive<TaskQuery>({
    page: 1,
    size: PAGE_SIZE,
    keyword: '',
    status: undefined,
    priority: undefined,
    sortBy: 'recordedAt',
    sortDirection: 'DESC',
  })

  const loading = ref(false)

  /**
   * 可见列表。这里用 ref + 显式重建而不是 computed：
   * 勾选完成时要把划线播完再落位，重排的时机得由 changeStatus 掌握，
   * 这与 stores/todo 的做法一致（两处同构）。
   */
  const ordered = ref<Task[]>([])

  function applyFilters(): Task[] {
    const keyword = query.keyword?.trim().toLowerCase() ?? ''
    return demoTasks.value.filter((task) => {
      if (query.status && task.status !== query.status) return false
      if (query.priority && task.priority !== query.priority) return false
      if (keyword) {
        const target = `${task.title} ${task.description ?? ''}`.toLowerCase()
        if (!target.includes(keyword)) return false
      }
      return true
    })
  }

  /** 重算可见列表：初始化、筛选变化、以及每次写操作之后各调一次 */
  function rebuild() {
    ordered.value = groupTasksByState(applyFilters())
  }

  rebuild()

  const total = computed(() => ordered.value.length)
  const tasks = computed(() => ordered.value.slice(0, query.page * query.size))
  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / query.size)))
  const hasMore = computed(() => tasks.value.length < total.value)

  /** 演示模式的统计同样从内存数据算，口径与 /api/tasks/stats 一致 */
  const stats = computed<TaskStats>(() => {
    const list = demoTasks.value
    const done = list.filter((task) => task.status === 'DONE').length
    return {
      total: list.length,
      todo: list.length - done,
      inProgress: 0,
      done,
      overdue: list.filter((task) => isOverdue(task.dueDate, task.status)).length,
      dueToday: list.filter((task) => isDueToday(task.dueDate, task.status)).length,
      completionRate: list.length > 0 ? done / list.length : 0,
      // 回收站条数跟着内存态走：删一条任务这里就 +1，清空即归零
      trashCount: demoTrash.value.length,
      trashRetentionDays: DEMO_TRASH_RETENTION_DAYS,
    }
  })

  /** 筛选条件变化：回到第 1 页（8.5），并模拟一次极短的加载态让骨架屏可感知 */
  async function applyQuery() {
    query.page = 1
    rebuild()
    loading.value = true
    try {
      await sleep(120)
    } finally {
      loading.value = false
    }
  }

  function loadMore() {
    if (hasMore.value) {
      query.page += 1
    }
  }

  /**
   * 勾选完成 / 取消完成：先改这一行的状态（划线先播），等划线播完再重排让它落位。
   */
  async function changeStatus(id: string, status: TaskStatus) {
    const target = demoTasks.value.find((task) => task.id === id)
    if (!target) return

    // ① 只改这一行：ordered 里的元素与 demoTasks 是同一批对象，所以样式立刻变、位置先不动
    target.status = status
    target.statusLabel = TASK_STATUS_LABEL[status]
    target.completedAt = status === 'DONE' ? toIsoLocal(new Date()) : null

    // ② 等划线播完再重排落位
    await sleep(readStrikeMs())
    rebuild()
  }

  /** 新建：只在内存里加一条，落位交给统一排序规则 */
  function create(payload: TaskPayload) {
    const task: Task = {
      id: nextDemoId('task'),
      title: payload.title,
      description: payload.description ?? null,
      status: payload.status,
      statusLabel: TASK_STATUS_LABEL[payload.status],
      priority: payload.priority,
      priorityLabel: TASK_PRIORITY_LABEL[payload.priority],
      dueDate: payload.dueDate ?? null,
      completedAt: payload.status === 'DONE' ? toIsoLocal(new Date()) : null,
      recordedAt: toIsoLocal(new Date()),
      images: [],
    }
    demoTasks.value = [task, ...demoTasks.value]
    rebuild()
  }

  /** 编辑：勾了「将时间更新为当前时间」才刷新 recordedAt（刷新即置顶，与真实页一致） */
  function update(id: string, payload: TaskPayload) {
    const target = demoTasks.value.find((task) => task.id === id)
    if (!target) return

    target.title = payload.title
    target.description = payload.description ?? null
    target.status = payload.status
    target.statusLabel = TASK_STATUS_LABEL[payload.status]
    target.priority = payload.priority
    target.priorityLabel = TASK_PRIORITY_LABEL[payload.priority]
    target.dueDate = payload.dueDate ?? null
    if (payload.refreshRecordedAt) target.recordedAt = toIsoLocal(new Date())
    rebuild()
  }

  /** 删除：真的移入演示回收站（内存），于是回收站页能看到它、也能恢复回来 */
  function remove(id: string) {
    const target = demoTasks.value.find((task) => task.id === id)
    if (!target) return

    demoTasks.value = demoTasks.value.filter((task) => task.id !== id)
    demoTrash.value = [
      // 沿用同一个 id：与真实链路的软删除一致（回收站里就是原任务，恢复即原样回来）
      { ...target, deletedAt: toIsoLocal(new Date()), remainingDays: DEMO_TRASH_RETENTION_DAYS },
      ...demoTrash.value,
    ]
    rebuild()
  }

  return {
    query,
    tasks,
    stats,
    total,
    totalPages,
    loading,
    applyQuery,
    loadMore,
    changeStatus,
    create,
    update,
    remove,
  }
}
