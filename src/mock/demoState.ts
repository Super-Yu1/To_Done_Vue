/**
 * 演示模式的内存态：任务与回收站共用同一份数据，跨页面共享，刷新即还原。
 * 用模块级 ref 而不是建 Pinia store：演示模式的读写不该混进真实链路的 store，
 * 也不需要和真实数据并排出现在 devtools 里（与 useTheme 的做法一致）。
 */
import { ref } from 'vue'
import { DEMO_TASKS } from './demoTasks'
import { DEMO_TRASH_TASKS } from './demoTrash'
import type { Task, TrashTask } from '@/types'

/** 深拷贝：演示模式的改动不回写 mock 模块，刷新即重新克隆一份 */
function cloneTasks(): Task[] {
  return DEMO_TASKS.map((task) => ({ ...task, images: task.images.map((image) => ({ ...image })) }))
}

function cloneTrash(): TrashTask[] {
  return DEMO_TRASH_TASKS.map((task) => ({
    ...task,
    images: task.images.map((image) => ({ ...image })),
  }))
}

/** 演示模式的任务列表（内存） */
export const demoTasks = ref<Task[]>(cloneTasks())

/** 演示模式的回收站（内存）：删除任务会真的进来，恢复 / 彻底删除 / 清空也真的生效 */
export const demoTrash = ref<TrashTask[]>(cloneTrash())

let sequence = 0

/** 演示模式新增对象的 id：只求前端内唯一，不与后端 UUID 的形状冲突 */
export function nextDemoId(prefix: string): string {
  sequence += 1
  return `demo-${prefix}-${Date.now().toString(36)}-${sequence}`
}
