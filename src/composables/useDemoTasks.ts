/**
 * 演示模式的数据源（8.6）：内置示范数据的内存态，与回收站页共用同一份（见 mock/demoState）。
 * 读写都是真的——新建 / 编辑 / 删除 / 切状态立即生效，只是不落库、不请求后端，刷新即还原；
 * 独立于 stores 是有意为之：不往真实链路的 store 里塞 mock 分支。
 */
import { computed, reactive, ref } from 'vue'
import { demoTrash, demoTasks, nextDemoId } from '@/mock/demoState'
import { DEMO_TRASH_RETENTION_DAYS } from '@/mock/demoTrash'
import { PAGE_SIZE, TASK_PRIORITY_LABEL, TASK_STATUS_LABEL } from '@/constants'
import { readStrikeMs, sleep } from '@/utils/timing'
import { isDueToday, isOverdue, toIsoLocal } from '@/utils/date'
import type { Task, TaskPayload, TaskPriority, TaskQuery, TaskStats, TaskStatus } from '@/types'

export function useDemoTasks() {
  const query = reactive<TaskQuery>({
    page: 1,
    size: PAGE_SIZE,
    keyword: '',
    // 默认停在「未完成」+ 按截止时间近→远（2026-10-18）：与真实页一致
    status: 'TODO',
    sortBy: 'dueDate',
    sortDirection: 'asc',
    priority: undefined,
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
      // 快捷筛选（2026-10-18）：与真实页新加的两个服务端参数同口径
      if (query.overdue && !isOverdue(task.dueDate, task.status)) return false
      if (query.dueToday && !isDueToday(task.dueDate, task.status)) return false
      if (keyword) {
        const target = `${task.title} ${task.description ?? ''}`.toLowerCase()
        if (!target.includes(keyword)) return false
      }
      return true
    })
  }

  /** 重算可见列表：初始化、筛选变化、以及每次写操作之后各调一次 */
  function rebuild() {
    // 2026-10-18：不再按状态分组（「全部」里已完成与未完成混排），顺序交给排序字段
    ordered.value = applyFilters()
  }

  rebuild()

  const total = computed(() => ordered.value.length)
  /*
   * 演示数据固定 24 条，一次展示全部（2026-10-18）：
   * 不按 `page * size` 截断，否则「共 24 条」但「全部」页签只显示第一页 20 条，
   * 会让人误以为演示数据少了 4 条。真实页仍按 20 条/页 + 无限滚动。
   */
  const tasks = computed(() => ordered.value)
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

  /** 未完成的高优先级任务数（统计筛选栏第三枚胶囊） */
  const highPriorityCount = computed(
    () => demoTasks.value.filter((task) => task.status === 'TODO' && task.priority === 'HIGH').length,
  )

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

    // ② 当前只看单一状态、而这一行已不属于它：TaskItem 已在本地播完退场动画，
    //    这里立即重算可见列表（行移除）；其余场景等划线播完再重排落位。
    if (query.status && query.status !== status) {
      rebuild()
      return
    }

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

  /**
   * 行内快捷改（E）：与真实 store 的 patchTask 同构 —— 只改这一行，
   * recordedAt 不动，所以 rebuild() 之后位置不会跳。
   */
  function patchTask(id: string, patch: { priority?: TaskPriority; dueDate?: string | null }) {
    const target = demoTasks.value.find((task) => task.id === id)
    if (!target) return
    if (patch.priority) {
      target.priority = patch.priority
      target.priorityLabel = TASK_PRIORITY_LABEL[patch.priority]
    }
    if (patch.dueDate !== undefined) target.dueDate = patch.dueDate
    rebuild()
  }

  /** 批量改状态（F）：演示态没有后端，直接遍历内存，最后统一重排一次；返回失败条数（恒 0） */
  function batchSetStatus(ids: string[], status: TaskStatus) {
    ids.forEach((id) => {
      const target = demoTasks.value.find((task) => task.id === id)
      if (!target) return
      target.status = status
      target.statusLabel = TASK_STATUS_LABEL[status]
      target.completedAt = status === 'DONE' ? toIsoLocal(new Date()) : null
    })
    rebuild()
    return 0
  }

  function batchSetPriority(ids: string[], priority: TaskPriority) {
    ids.forEach((id) => {
      const target = demoTasks.value.find((task) => task.id === id)
      if (!target) return
      target.priority = priority
      target.priorityLabel = TASK_PRIORITY_LABEL[priority]
    })
    rebuild()
    return 0
  }

  /** 批量删除：一次性移入演示回收站（沿用各自 id，与真实链路的软删除一致） */
  function batchRemove(ids: string[]) {
    const targets = demoTasks.value.filter((task) => ids.includes(task.id))
    const now = toIsoLocal(new Date())
    demoTasks.value = demoTasks.value.filter((task) => !ids.includes(task.id))
    demoTrash.value = [
      ...targets.map((task) => ({ ...task, deletedAt: now, remainingDays: DEMO_TRASH_RETENTION_DAYS })),
      ...demoTrash.value,
    ]
    rebuild()
    return 0
  }

  return {
    query,
    tasks,
    stats,
    highPriorityCount,
    total,
    totalPages,
    loading,
    applyQuery,
    loadMore,
    changeStatus,
    create,
    update,
    remove,
    patchTask,
    batchSetStatus,
    batchSetPriority,
    batchRemove,
  }
}
