/**
 * 复制文本到剪贴板：优先 Clipboard API（要求安全上下文），
 * 不可用或被拒时退回临时 textarea + execCommand（兼容兜底）。
 * 只回答「成功与否」，提示交给调用方，保持与 http 层一致的职责切分。
 */
export async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // 落到下面的兜底
    }
  }

  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.top = '-1000px'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}
