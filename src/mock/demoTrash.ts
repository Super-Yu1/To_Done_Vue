/**
 * 演示模式的回收站数据（8.6 / 6.5 ⑩）：不落库。
 * 元素结构与接口一致——任务字段 + deletedAt + remainingDays，
 * 其中 remainingDays 按「保留天数 − 已删除天数」算出，文案不写死 90。
 */
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

// 主题与任务列表同一个人（摄影 / 旅行），已删除的也都是「拍照片」这条线上的事
const SEEDS: DemoTrashSeed[] = [
  {
    title: '删掉一批试拍的废片',
    description: '对焦全虚的那组，留着也不会有第二眼。',
    priority: 'LOW',
    deletedDaysAgo: 2,
    recordedDaysAgo: 21,
  },
  {
    title: '把去年的照片刻成光盘',
    description: '硬盘快满了先刻一份，等有 NAS 再说。',
    priority: 'MEDIUM',
    deletedDaysAgo: 9,
    recordedDaysAgo: 35,
    images: 1,
  },
  {
    title: '试了三个相册管理软件',
    description: '对比完的结论是：先用文件夹加标签就够。',
    priority: 'LOW',
    deletedDaysAgo: 26,
    recordedDaysAgo: 48,
  },
  {
    title: '清掉手机里的相机缓存',
    description: '占了七八个 G，删了也不影响照片本身。',
    priority: 'HIGH',
    deletedDaysAgo: 86,
    recordedDaysAgo: 120,
  },
]

function buildImages(variant: number, count: number): TaskImage[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `demo-trash-image-${variant + 1}-${index + 1}`,
    sortOrder: index + 1,
    // 与任务列表同一批真实照片（2026-11-05）：回收站只挂 1 张，用马丘比丘那张配「刻光盘」
    objectKey: `task/demo/202609/demo-05.jpg`,
    url: '/demo/demo-05.jpg',
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
