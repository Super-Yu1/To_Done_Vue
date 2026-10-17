/**
 * 演示模式的占位图：内联 SVG data URI，不发任何网络请求，
 * 所以演示时配图与头像都能正常显示，控制台也不会出现 404。
 */
const IMAGE_FILLS = ['#e9e9e9', '#e4e6e9', '#eceae6']

function toDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** 写进 SVG 文本前先转义，避免内容里的 < & 等字符破坏 XML */
function escapeXml(value: string): string {
  const MAP: Record<string, string> = {
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    "'": '&apos;',
  }
  return value.replace(/[<>&"']/g, (char) => MAP[char] ?? char)
}

/** 配图占位：灰阶风景图，三种底色轮换 */
export function placeholderImage(variant: number): string {
  const fill = IMAGE_FILLS[variant % IMAGE_FILLS.length] ?? IMAGE_FILLS[0]
  return toDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="112" height="112">` +
      `<rect width="112" height="112" fill="${fill}"/>` +
      `<path d="M18 86 50 46l22 24 12-14 26 30z" fill="#cfcfcf"/>` +
      `<circle cx="40" cy="34" r="9" fill="#cfcfcf"/>` +
      `</svg>`,
  )
}

/** 头像占位：中性底 + 用户名首字，用来演示「已有头像」的样子 */
export function placeholderAvatar(label: string): string {
  return toDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144">` +
      `<rect width="144" height="144" fill="#e6e7e9"/>` +
      `<text x="72" y="76" fill="#8c8c8c" font-size="60" text-anchor="middle" ` +
      `dominant-baseline="middle" font-family="-apple-system, PingFang SC, Microsoft YaHei, sans-serif">` +
      `${escapeXml(label.slice(0, 1))}</text>` +
      `</svg>`,
  )
}
