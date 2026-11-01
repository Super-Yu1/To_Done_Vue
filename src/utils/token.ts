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
 * 三态返回值：'valid' 可用 / 'expired' 无效或过期 / 'none' 没有票（从没登录过或已登出）。
 *
 * <p><b>2026-11-01 收紧</b>：只有「三段式 JWT + 数值 exp 且未过期」才算 'valid'。
 * 原来「解不出 exp 就当可用」是错的 —— 随手 `localStorage.setItem('todone_admin_token','x')`
 * 就能把后台外壳（空数据）渲染出来，虽然接口全 401、拿不到任何数据，但看起来像「进去了」。
 * 后端签的就是标准 JWT，收紧不会误伤真实登录态。
 */
export type TokenState = 'valid' | 'expired' | 'none'

export function readTokenState(key: string): TokenState {
  const raw = localStorage.getItem(key)
  if (!raw) return 'none'
  return isExpired(raw) ? 'expired' : 'valid'
}

/** 只有「三段 JWT + 数值 exp 且在将来」返回 false；其余（乱写的串、缺 payload、解不出 exp）一律当无效 */
function isExpired(token: string): boolean {
  const parts = token.split('.')
  if (parts.length !== 3 || !parts[1]) return true
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const exp: unknown = JSON.parse(atob(padded)).exp
    return typeof exp !== 'number' || exp * 1000 <= Date.now()
  } catch {
    return true
  }
}
