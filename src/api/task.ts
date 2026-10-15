/** 任务接口（6.4 #12~#18、6.5 ⑥⑦⑧⑪） */
import { request, upload } from './http'
import type { PageResult, Task, TaskPayload, TaskQuery, TaskStats, TaskStatus } from '@/types'

/**
 * 配图随任务一起提交：data 段是任务 JSON（part 的 Content-Type 为 application/json），
 * images 段是 0~9 个文件（见 6.5 ⑦）。
 */
function buildTaskForm(payload: TaskPayload, images: File[]): FormData {
  const form = new FormData()
  form.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
  images.forEach((file) => form.append('images', file))
  return form
}

/** 分页查询任务（不含回收站） */
export function fetchTasks(params: TaskQuery): Promise<PageResult<Task>> {
  return request<PageResult<Task>>({ url: '/tasks', method: 'GET', params })
}

/** 统计概览（含 trashRetentionDays，前端文案不写死 90） */
export function fetchTaskStats(): Promise<TaskStats> {
  return request<TaskStats>({ url: '/tasks/stats', method: 'GET' })
}

/** 任务详情（含配图，结构与列表元素一致） */
export function fetchTask(id: string): Promise<Task> {
  return request<Task>({ url: `/tasks/${id}`, method: 'GET' })
}

/** 新建任务（multipart：任务 + 配图；imageOrder 已正式生效，'NEW' 数须与文件数一致） */
export function createTask(
  payload: TaskPayload,
  images: File[] = [],
  onProgress?: (percent: number) => void,
): Promise<Task> {
  return upload<Task>('/tasks', buildTaskForm(payload, images), { onProgress })
}

/** 更新任务（multipart：任务 + 配图增删，imageOrder 表达最终顺序） */
export function updateTask(
  id: string,
  payload: TaskPayload,
  images: File[] = [],
  onProgress?: (percent: number) => void,
): Promise<Task> {
  return upload<Task>(`/tasks/${id}`, buildTaskForm(payload, images), { method: 'PUT', onProgress })
}

/** 变更状态（不刷新 recordedAt，任务位置不动） */
export function changeTaskStatus(id: string, status: TaskStatus): Promise<void> {
  return request<void>({ url: `/tasks/${id}/status`, method: 'PATCH', data: { status } })
}

/** 删除任务（软删除，移入回收站） */
export function removeTask(id: string): Promise<void> {
  return request<void>({ url: `/tasks/${id}`, method: 'DELETE' })
}
