/**
 * User-Agent 简写（2026-11-02）。
 *
 * 登录审计里的 UA 是一串 150~200 字符的指纹（版本号、内核、语言、引擎全在里面），
 * 列表里既放不下、也没人会逐字读。表格只显示「浏览器 · 系统」这一层，
 * 完整串（要排查时才看）留给悬停气泡。
 *
 * **判断顺序有讲究**：Edge 的 UA 里同时含 `Edg/` 与 `Chrome/`，Opera 含 `OPR/` 与 `Chrome/`，
 * Chrome 又含 `Safari/` —— 必须先判更具体的那个，否则一律读成 Chrome / Safari。
 */

export interface UserAgentSummary {
  /** 浏览器 + 主版本号（如 `Chrome 137`）；识别不出为空串 */
  browser: string
  /** 系统（如 `Windows 10`）；识别不出为空串 */
  os: string
  /** 列表里显示的短文本；整串都识别不出时退回 UA 前 24 个字符 */
  label: string
}

/** 浏览器规则：数组顺序 = 判断顺序，从上往下取第一个命中的 */
const BROWSER_RULES: { pattern: RegExp; name: string }[] = [
  // Edge 两个写法都要认：桌面版 `Edg/`，老版本 / iOS 是 `EdgA/`、`EdgiOS/`
  { pattern: /Edg(?:e|A|iOS)?\/([\d.]+)/, name: 'Edge' },
  { pattern: /OPR\/([\d.]+)/, name: 'Opera' },
  { pattern: /Firefox\/([\d.]+)/, name: 'Firefox' },
  { pattern: /Chrome\/([\d.]+)/, name: 'Chrome' },
  // Safari 的版本在 `Version/` 里，`Safari/` 后面那串是 WebKit 的版本，不是浏览器版本
  { pattern: /Version\/([\d.]+).*Safari\//, name: 'Safari' },
  // 非浏览器客户端：登录审计里它们确实会出现（脚本 / 调试工具），单独标出来比归到「其他」更有用
  { pattern: /curl\/([\d.]+)/, name: 'curl' },
  { pattern: /PostmanRuntime\/([\d.]+)/, name: 'Postman' },
  { pattern: /python-requests\/([\d.]+)/, name: 'python-requests' },
]

/** 系统规则：同样是顺序优先（Android 的 UA 里也有 `Linux`，必须排在它前面） */
function detectOs(ua: string): string {
  // Windows 11 的 UA 仍然是 `Windows NT 10.0`（微软刻意不改），这里照 UA 的原义显示 Windows 10
  if (/Windows NT 10\.0/.test(ua)) return 'Windows 10'
  if (/Windows NT 6\.3/.test(ua)) return 'Windows 8.1'
  if (/Windows NT 6\.2/.test(ua)) return 'Windows 8'
  if (/Windows NT 6\.1/.test(ua)) return 'Windows 7'
  if (/Windows NT 6\.0/.test(ua)) return 'Windows Vista'
  if (/Windows NT 5\.1/.test(ua)) return 'Windows XP'
  if (/Windows/.test(ua)) return 'Windows'

  const android = ua.match(/Android\s+([\d.]+)/)?.[1]
  if (android) return `Android ${android.split('.')[0]}`
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS'
  // macOS 也走 `Mac OS X 10_15_7` 这种下划线写法；只取大版本，13/14 这一层对排查没差别
  const mac = ua.match(/Mac OS X\s+(\d+)[._]/)
  if (mac) return `macOS ${mac[1]}`
  if (/Mac OS X/.test(ua)) return 'macOS'
  if (/CrOS/.test(ua)) return 'ChromeOS'
  if (/Linux/.test(ua)) return 'Linux'

  return ''
}

function detectBrowser(ua: string): string {
  for (const rule of BROWSER_RULES) {
    const version = ua.match(rule.pattern)?.[1]
    // 主版本号就够：小版本只在同型号对比时才有意义，列表里多出来的字符先吃掉半列
    if (version) return `${rule.name} ${version.split('.')[0]}`
  }
  return ''
}

/** 把一条 UA 拆成「浏览器 · 系统」；空 UA 返回 `—` */
export function describeUserAgent(userAgent?: string | null): UserAgentSummary {
  const ua = userAgent?.trim()
  if (!ua) return { browser: '', os: '', label: '—' }

  const browser = detectBrowser(ua)
  const os = detectOs(ua)
  const label = [browser, os].filter(Boolean).join(' · ')

  // 整串都认不出（少见的内嵌浏览器 / 自定义客户端）：给个截断原串，至少还能看出是「谁」
  return { browser, os, label: label || ua.slice(0, 24) }
}
