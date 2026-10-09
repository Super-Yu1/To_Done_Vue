/**
 * 演示模式用的图形验证码（3.2 / 6.5 ①）：
 * 本地生成 4 位字符 + 干扰线并画成内联 SVG，返回结构与真实接口一致，
 * 因此演示模式不请求后端也能完整走一遍「点图刷新 → 填码 → 获取邮箱码」的流程。
 */
import type { CaptchaResult } from '@/types'

/** 去掉容易看混的字符，形态与真实 4 位字符验证码一致 */
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CAPTCHA_LENGTH = 4
const NOISE_LINES = 8
/** 有效期取 3.2 的 120 秒 */
const EXPIRE_SECONDS = 120

function randomInt(max: number): number {
  return Math.floor(Math.random() * max)
}

function randomCode(): string {
  return Array.from({ length: CAPTCHA_LENGTH }, () => CHARS[randomInt(CHARS.length)] ?? 'A').join('')
}

function buildImage(code: string): string {
  const chars = [...code]
    .map((char, index) => {
      const x = 20 + index * 25
      const y = 26 + randomInt(5)
      const rotate = randomInt(24) - 12
      return (
        `<text x="${x}" y="${y}" fill="#5b6470" font-size="22" font-weight="600" ` +
        `font-family="ui-monospace, Menlo, monospace" transform="rotate(${rotate} ${x} ${y})">${char}</text>`
      )
    })
    .join('')

  const lines = Array.from({ length: NOISE_LINES }, () => {
    const x1 = randomInt(120)
    const y1 = randomInt(40)
    const x2 = randomInt(120)
    const y2 = randomInt(40)
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#cfd4da" stroke-width="1"/>`
  }).join('')

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40">` +
    `<rect width="120" height="40" fill="#f4f5f6"/>` +
    lines +
    chars +
    `</svg>`

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** 生成一张演示用验证码；captchaId 只为让调用方的状态形状与真实接口一致 */
export function createDemoCaptcha(): CaptchaResult {
  const code = randomCode()
  return {
    captchaId: `demo-captcha-${Math.random().toString(36).slice(2, 10)}`,
    image: buildImage(code),
    expiresInSeconds: EXPIRE_SECONDS,
  }
}
