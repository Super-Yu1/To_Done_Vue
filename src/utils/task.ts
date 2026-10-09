/**
 * 任务列表排序规则（2026-10-09 需求变更）：
 * ① 未完成在前、已完成在后；
 * ② 未完成组内按**创建时间**（recordedAt）倒序——最近的在上；
 * ③ 已完成组内按**完成时间**（completedAt）倒序。
 *
 * 真实页与演示页共用这一处规则，避免两边各写一套导致顺序不一致。
 */
import type { Task } from '@/types'

/** ISO-8601 同格式字符串可直接比较，缺失值一律排到组末 */
function byTimeDesc(left: string | null, right: string | null): number {
  return (right ?? '').localeCompare(left ?? '')
}

export function groupTasksByState(tasks: Task[]): Task[] {
  const unfinished: Task[] = []
  const finished: Task[] = []

  tasks.forEach((task) => {
    if (task.status === 'DONE') {
      finished.push(task)
    } else {
      unfinished.push(task)
    }
  })

  unfinished.sort((left, right) => byTimeDesc(left.recordedAt, right.recordedAt))
  finished.sort((left, right) => byTimeDesc(left.completedAt, right.completedAt))

  return [...unfinished, ...finished]
}
