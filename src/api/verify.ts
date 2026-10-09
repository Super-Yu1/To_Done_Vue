/** 验证码接口（免登录，见 6.4 #1 #2、6.5 ①②） */
import { request } from './http'
import type { CaptchaResult, EmailCodePayload, EmailCodeResult } from '@/types'

/** 获取图形验证码：只下发 captchaId 与 Base64 图片，答案留在服务端 */
export function getCaptcha(): Promise<CaptchaResult> {
  return request<CaptchaResult>({ url: '/verify/captcha', method: 'GET' })
}

/** 发送邮箱验证码（须带图形验证码） */
export function sendEmailCode(payload: EmailCodePayload): Promise<EmailCodeResult> {
  return request<EmailCodeResult>({ url: '/verify/email-code', method: 'POST', data: payload })
}
