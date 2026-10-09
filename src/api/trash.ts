/** 回收站接口（6.4 #19~#22、6.5 ⑩） */
import { request } from './http'
import type { PageResult, TrashQuery, TrashTask } from '@/types'

/** 回收站列表：元素追加 deletedAt 与 remainingDays，按 deletedAt DESC */
export function fetchTrashTasks(params: TrashQuery): Promise<PageResult<TrashTask>> {
  return request<PageResult<TrashTask>>({ url: '/trash/tasks', method: 'GET', params })
}

/** 恢复任务：deleted_at 置空，配图不变 */
export function restoreTask(id: string): Promise<void> {
  return request<void>({ url: `/trash/tasks/${id}/restore`, method: 'POST' })
}

/** 彻底删除单条（连同配图一起删，不可恢复） */
export function purgeTask(id: string): Promise<void> {
  return request<void>({ url: `/trash/tasks/${id}`, method: 'DELETE' })
}

/** 清空回收站 */
export function clearTrash(): Promise<{ removed: number }> {
  return request<{ removed: number }>({ url: '/trash/tasks', method: 'DELETE' })
}
