/**
 * 账号字段的校验（2026-10-31）。
 *
 * 用户名与手机号改成**行内编辑**之后，正式页与演示页都要判断「这个值能不能提交」——
 * 规则放在这里一份，两处共用，避免「正式页校验一套、演示页又写一套」。
 * 契约与后端一致（6.5 ⑤ / 8.8），提示文案刻意收短：行内没有表单标签来解释上下文。
 */

/** 手机号：本期不发短信、不用于登录，只校验形态；唯一性由后端 1008 保证 */
export const PHONE_PATTERN = /^\d{6,20}$/

/** 用户名：去掉首尾空白后不能为空，上限与输入框 `maxlength` 一致 */
export function validateName(value: string): string | null {
  const name = value.trim()
  if (!name) return '请填写用户名'
  if (name.length > 32) return '用户名最多 32 个字符'
  return null
}

/** 手机号留空即解绑，所以「空」是合法值，不算错误 */
export function validatePhone(value: string): string | null {
  const phone = value.trim()
  if (!phone) return null
  return PHONE_PATTERN.test(phone) ? null : '手机号只能是 6–20 位数字'
}
