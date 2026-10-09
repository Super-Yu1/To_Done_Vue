/**
 * 演示模式的回收站（8.6）：数据与任务页共享同一份内存态（mock/demoState），
 * 恢复 / 彻底删除 / 清空都真的生效，只是不落库，刷新即还原。
 */
import { computed } from 'vue'
import { demoTrash, demoTasks } from '@/mock/demoState'
import type { Task, TrashTask } from '@/types'

/** 回收站条目去掉 deletedAt / remainingDays 就是一条普通任务（与真实链路恢复的语义一致） */
function toTask(task: TrashTask): Task {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    statusLabel: task.statusLabel,
    priority: task.priority,
    priorityLabel: task.priorityLabel,
    dueDate: task.dueDate,
    completedAt: task.completedAt,
    recordedAt: task.recordedAt,
    images: task.images,
  }
}

export function useDemoTrash() {
  const tasks = computed(() => demoTrash.value)
  const total = computed(() => demoTrash.value.length)

  /** 恢复：recordedAt 不变，所以它回到原本的位置（列表按统一规则重新落位） */
  function restore(task: TrashTask) {
    demoTasks.value = [toTask(task), ...demoTasks.value]
    demoTrash.value = demoTrash.value.filter((item) => item.id !== task.id)
  }

  function purge(task: TrashTask) {
    demoTrash.value = demoTrash.value.filter((item) => item.id !== task.id)
  }

  /** 清空：返回清掉的条数，供提示文案使用 */
  function clear(): number {
    const count = demoTrash.value.length
    demoTrash.value = []
    return count
  }

  return { tasks, total, restore, purge, clear }
}
