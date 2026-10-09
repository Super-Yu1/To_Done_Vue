/**
 * 演示模式的回收站数据（8.6 / 6.5 ⑩）：不落库。
 * 元素结构与接口一致——任务字段 + deletedAt + remainingDays，
 * 其中 remainingDays 按「保留天数 − 已删除天数」算出，文案不写死 90。
 */
import { placeholderImage } from './placeholder'
import { isoDaysFromNow } from '@/utils/date'
import { TASK_PRIORITY_LABEL, TASK_STATUS_LABEL } from '@/constants'
import type { TaskImage, TaskPriority, TrashTask } from '@/types'

/** 回收站保留天数：取后端配置默认值 90（附录 B），与 stats 接口下发的 trashRetentionDays 同源 */
export const DEMO_TRASH_RETENTION_DAYS = 90

interface DemoTrashSeed {
  title: string
  description?: string
  priority: TaskPriority
  /** 已删除几天 */
  deletedDaysAgo: number
  /** 记录时间：几天前 */
  recordedDaysAgo: number
  images?: number
}

const SEEDS: DemoTrashSeed[] = [
  {
    title: '整理上季度的报销单',
    description: '票据早交过了，这条是重复记的。',
    priority: 'LOW',
    deletedDaysAgo: 2,
    recordedDaysAgo: 21,
  },
  {
    title: '给旧笔记做一次归档',
    description: '先删掉，等周末有空再恢复回来整理。',
    priority: 'MEDIUM',
    deletedDaysAgo: 9,
    recordedDaysAgo: 35,
    images: 1,
  },
  {
    title: '研究一下别的清单工具',
    description: '对比了三个，结论是自己写一个更顺手。',
    priority: 'LOW',
    deletedDaysAgo: 26,
    recordedDaysAgo: 48,
  },
  {
    title: '把测试数据清一清',
    description: '留着当反面样本，已经很久没动了。',
    priority: 'HIGH',
    deletedDaysAgo: 86,
    recordedDaysAgo: 120,
  },
]

function buildImages(variant: number, count: number): TaskImage[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `demo-trash-image-${variant + 1}-${index + 1}`,
    sortOrder: index + 1,
    objectKey: `task/demo/202609/trash-${variant + 1}-${index + 1}.svg`,
    url: placeholderImage(index),
  }))
}

export const DEMO_TRASH_TASKS: TrashTask[] = SEEDS.map((seed, index) => ({
  id: `demo-trash-${String(index + 1).padStart(2, '0')}`,
  title: seed.title,
  description: seed.description ?? null,
  // 回收站列表不展示状态，这里按「删除时未完成」处理
  status: 'TODO',
  statusLabel: TASK_STATUS_LABEL.TODO,
  priority: seed.priority,
  priorityLabel: TASK_PRIORITY_LABEL[seed.priority],
  dueDate: null,
  completedAt: null,
  recordedAt: isoDaysFromNow(-seed.recordedDaysAgo, 9),
  deletedAt: isoDaysFromNow(-seed.deletedDaysAgo, 14),
  remainingDays: DEMO_TRASH_RETENTION_DAYS - seed.deletedDaysAgo,
  images: buildImages(index, seed.images ?? 0),
}))
