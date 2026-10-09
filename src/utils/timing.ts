/**
 * 与动效节奏有关的小工具。
 * 时长一律以 CSS 变量为唯一来源，JS 侧只读不写死，避免同一段节奏在两处各写一份毫秒数。
 */

/** 读取 :root 上的时长变量（如 --dur-strike），返回毫秒；读不到或非法时用兜底值 */
export function readCssDurationMs(name: string, fallbackMs: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const value = Number.parseFloat(raw)
  if (!Number.isFinite(value) || value < 0) return fallbackMs
  if (raw.endsWith('ms')) return value
  if (raw.endsWith('s')) return value * 1000
  return value
}

/** 等待若干毫秒：用于把「先划掉、再落位」这类动作排成先后顺序 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

/** 划线动画的兜底时长，与 main.css 的 --dur-strike 对齐 */
const STRIKE_FALLBACK_MS = 300

/**
 * 勾选完成时「横线划掉」的时长。
 * 真实页与演示页都靠它决定何时把卡片下移，所以只留这一个入口。
 */
export function readStrikeMs(): number {
  return readCssDurationMs('--dur-strike', STRIKE_FALLBACK_MS)
}
