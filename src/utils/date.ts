/**
 * 时间工具：后端时间统一为不带时区的 ISO-8601（如 2026-10-01T18:00:00，见 6.1），
 * JS 对这种格式按本地时间解析，所以直接 new Date 即可，不做时区换算。
 */
import type { TaskStatus } from '@/types'

const pad = (value: number): string => String(value).padStart(2, '0')

/** 解析后端时间串；非法或空值返回 null */
export function parseDate(value?: string | null): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Date → 后端格式的本地时间串（与 el-date-picker 的 value-format 一致） */
export function toIsoLocal(date: Date): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  )
}

/** 格式化为 YYYY-MM-DD HH:mm */
export function formatDateTime(value?: string | null): string {
  const date = parseDate(value)
  if (!date) return ''
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 格式化为 YYYY-MM-DD */
export function formatDate(value?: string | null): string {
  const date = parseDate(value)
  if (!date) return ''
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** 是否同一天（本地时区） */
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  )
}

/** 逾期：有截止时间、未完成、且已过截止时刻 */
export function isOverdue(dueDate?: string | null, status: TaskStatus = 'TODO'): boolean {
  const date = parseDate(dueDate)
  if (!date || status === 'DONE') return false
  return date.getTime() < Date.now()
}

/** 今天到期：截止时间落在今天（不含已完成） */
export function isDueToday(dueDate?: string | null, status: TaskStatus = 'TODO'): boolean {
  const date = parseDate(dueDate)
  if (!date || status === 'DONE') return false
  return isSameDay(date, new Date())
}

/**
 * 相对今天偏移若干天的本地时间串；演示数据靠它生成，
 * 避免写死绝对日期导致「逾期若干」随时间失效。
 */
export function isoDaysFromNow(days: number, hour = 18, minute = 0): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(hour, minute, 0, 0)
  return toIsoLocal(date)
}
