/**
 * 登录密码错误计数（2026-10-28 需求：连续输错 2 次密码，第 3 次起才要图形验证码）。
 *
 * 这里只是「登录页该不该先弹窗」的判断，**不是安全闸** —— 真正的判定在后端
 * （见 `docs/后端修改说明.md`）。本地这份被清掉时不是漏洞：下一次请求后端会回 4008，
 * 登录页据此把弹窗补上。
 *
 * 为什么落 localStorage 而不是内存：刷新不该把已经错过的次数洗掉，否则「错两次才要码」
 * 这条规则按 F5 就绕过去了；按邮箱分开存，换账号登录不会背着别人那两次。
 */
import {
  LOGIN_CAPTCHA_AFTER_FAILURES,
  LOGIN_FAILURE_KEY,
  LOGIN_FAILURE_TTL_MS,
} from '@/constants'

interface FailureRecord {
  /** 连续输错密码的次数 */
  count: number
  /** 最后一次输错的时间戳，用来判过期 */
  at: number
}

type FailureMap = Record<string, FailureRecord>

/** 邮箱大小写与首尾空格不该把同一个账号拆成两份计数 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function readMap(): FailureMap {
  try {
    const raw = localStorage.getItem(LOGIN_FAILURE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    return parsed !== null && typeof parsed === 'object' ? (parsed as FailureMap) : {}
  } catch {
    // 存坏了就当没有：它只影响"要不要先弹窗"，不该把登录本身卡住
    return {}
  }
}

function writeMap(map: FailureMap): void {
  try {
    localStorage.setItem(LOGIN_FAILURE_KEY, JSON.stringify(map))
  } catch {
    // 隐私模式下写不进去也不影响登录，只是刷新后重新计数
  }
}

function readRecord(email: string): FailureRecord | null {
  const key = normalizeEmail(email)
  if (!key) return null
  const record: FailureRecord | undefined = readMap()[key]
  if (!record) return null
  if (typeof record.count !== 'number' || typeof record.at !== 'number') return null
  // 距最后一次输错超过窗口就作废：与后端的计数过期对齐
  return Date.now() - record.at > LOGIN_FAILURE_TTL_MS ? null : record
}

/** 该邮箱在窗口内连续输错了几次密码 */
export function readLoginFailures(email: string): number {
  return readRecord(email)?.count ?? 0
}

/** 是否已经该出图形码了（错满 2 次 → 第 3 次起） */
export function needsLoginCaptcha(email: string): boolean {
  return readLoginFailures(email) >= LOGIN_CAPTCHA_AFTER_FAILURES
}

/**
 * 记一次**密码错误**（冻结 / 注销 / 图形码错都不要调它），返回累计次数。
 * 写之前顺手清掉过期条目，免得这个键随用过的邮箱一直长。
 */
export function recordLoginFailure(email: string): number {
  const key = normalizeEmail(email)
  if (!key) return 0
  const map = readMap()
  const now = Date.now()
  for (const [mail, record] of Object.entries(map)) {
    if (now - record.at > LOGIN_FAILURE_TTL_MS) delete map[mail]
  }
  const count = (map[key]?.count ?? 0) + 1
  map[key] = { count, at: now }
  writeMap(map)
  return count
}

/** 登录成功后清零（只清这一个邮箱） */
export function clearLoginFailures(email: string): void {
  const key = normalizeEmail(email)
  if (!key) return
  const map = readMap()
  if (!(key in map)) return
  delete map[key]
  writeMap(map)
}
