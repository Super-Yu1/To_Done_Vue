/**
 * 验证相关接口（免登录，见 6.4 #1 #2、6.5 ①②）。
 *
 * 2026-11-05 换成**两段式人机验证**：
 *   `GET  /verify/challenge?scene=…&account=…`  → 题面（可能是 NONE）
 *   `POST /verify/challenge/{id}/answer`        → 一次性票据（塞进业务请求的 `challengeTicket`）
 * 旧的 `GET /verify/captcha` 与请求体里的 `captchaId / captchaCode` 已经删除，不要再调。
 *
 * 票据是**一次性 + 只能用于签发它的入口**：登录的票不能拿去发信，反之亦然；用过即失效，
 * 重试同一个业务请求前必须重新取题换票（否则一定 4010）。
 */
import { request } from './http'
import type {
  ChallengeAnswerRequest,
  ChallengeResponse,
  ChallengeScene,
  ChallengeTicket,
  EmailCodePayload,
  EmailCodeResult,
} from '@/types'

/**
 * 取题面。
 *
 * `account` 建议**一定带上**（登录填登录邮箱、发信填收件邮箱）：不带的话服务端按「零失败记录」
 * 判等级，可能返回 `NONE`，但业务接口那边仍会判成「要验证」而回 4008 —— 那一次就白跑了。
 */
export function getChallenge(scene: ChallengeScene, account?: string): Promise<ChallengeResponse> {
  return request<ChallengeResponse>({
    url: '/verify/challenge',
    method: 'GET',
    params: account ? { scene, account } : { scene },
  })
}

/** 交答案换票。答案只在服务端 Redis，响应里不会有任何「正确答案」字段 */
export function answerChallenge(
  challengeId: string,
  payload: ChallengeAnswerRequest,
): Promise<ChallengeTicket> {
  return request<ChallengeTicket>({
    url: `/verify/challenge/${challengeId}/answer`,
    method: 'POST',
    data: payload,
  })
}

/** 发送邮箱验证码（**必须**带人机验证票据） */
export function sendEmailCode(payload: EmailCodePayload): Promise<EmailCodeResult> {
  return request<EmailCodeResult>({ url: '/verify/email-code', method: 'POST', data: payload })
}
