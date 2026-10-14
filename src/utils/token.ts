/**
 * 登录态的前端预判（**不代替**后端鉴权）。
 *
 * 需求（2026-10-14 定稿）：**登录过期 → 回登录页；其他情况（从没登录过 / 已登出）→ 一律演示模式。**
 * 于是必须能区分「没登录过」和「登录过期」——浏览器里那张过期的 token 正好就是「过期」的证据，
 * 所以这里**只判断、不删除**：一旦把它清掉，「过期」就退化成「没登录过」，进站也就不该再去登录页了。
 *
 * 运行时真正的 401 由 `api/http.ts` 处理（清 token + 回登录页），那时证据消失，
 * 之后再进站走演示模式 —— 与需求一致（过期的那一刻回登录页，之后视同未登录）。
 *
 * 三态返回值：'valid' 可用 / 'expired' 过期 / 'none' 没有票（从没登录过或已登出）。
 * 不是标准 JWT（解不出 exp）按 'valid' 处理：交给后端判，避免误伤。
 */
export type TokenState = 'valid' | 'expired' | 'none'

export function readTokenState(key: string): TokenState {
  const raw = localStorage.getItem(key)
  if (!raw) return 'none'
  return isExpired(raw) ? 'expired' : 'valid'
}

function isExpired(token: string): boolean {
  const payload = token.split('.')[1]
  if (!payload) return false
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const exp: unknown = JSON.parse(atob(padded)).exp
    return typeof exp === 'number' && exp * 1000 <= Date.now()
  } catch {
    return false
  }
}
