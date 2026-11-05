/**
 * 人机验证的编排（2026-11-05 两段式：取题 → 答题 → 换票）。
 *
 * 三处入口（用户登录 / 后台登录 / 发邮箱验证码）走的是同一条流程，差别只在 `scene`
 * 与「票必不必填」；把它收在这里，调用方只看到两个动作：
 *
 * ```ts
 * const challenge = useChallenge({ scene: 'USER_LOGIN', account: () => form.email })
 * const outcome = await challenge.request()   // 'none' 不需要票 / string 票 / null 取消或失败
 * ```
 *
 * 演示模式（`demo`）直接判 `'none'`：演示页没有真后端，让人拖滑块只是白费劲。
 */
import { ref } from 'vue'
import { answerChallenge, getChallenge } from '@/api/verify'
import { isChallengeExpiredError, messageOf } from '@/api/http'
import type { ChallengeAnswerRequest, ChallengeResponse, ChallengeScene } from '@/types'

/** `'none'` = 本题不需要验证；`string` = 票；`null` = 用户取消 / 取题失败 */
export type ChallengeOutcome = string | 'none' | null

interface Options {
  scene: ChallengeScene | (() => ChallengeScene)
  /** 取题时带的账号（登录填邮箱、发信填收件邮箱）—— 不带会让服务端判错等级，见 api 注释 */
  account?: () => string | undefined
  /** 演示模式下直接跳过 */
  demo?: () => boolean
}

export function useChallenge(options: Options) {
  /** 弹窗显隐 */
  const visible = ref(false)
  /** 正在交答案 */
  const submitting = ref(false)
  /** 弹窗内的红字（答错时用，不弹全局 toast —— 提示要贴在题目旁边） */
  const error = ref('')
  /** 当前题面 */
  const challenge = ref<ChallengeResponse | null>(null)

  let settle: ((outcome: ChallengeOutcome) => void) | null = null

  function resolveWith(outcome: ChallengeOutcome) {
    const done = settle
    settle = null
    visible.value = false
    done?.(outcome)
  }

  /** 关弹窗并让上一次 `request()` 立即收尾（不会留下永远 pending 的 Promise） */
  function cancel() {
    if (!settle) return
    resolveWith(null)
  }

  /**
   * 取题；需要验证就打开弹窗，等用户答完拿到票。
   * 调用方拿到的三种结果：`'none'` 直接发请求、`string` 塞进 `challengeTicket`、`null` 放弃。
   */
  async function request(): Promise<ChallengeOutcome> {
    if (options.demo?.()) return 'none'

    // 上一轮还挂着（用户连点两次）就直接收掉，避免两个 resolver 打架
    if (settle) resolveWith(null)

    error.value = ''
    challenge.value = null

    const scene = typeof options.scene === 'function' ? options.scene() : options.scene
    try {
      const response = await getChallenge(scene, options.account?.())
      if (response.type === 'NONE') return 'none'
      challenge.value = response
      visible.value = true
      return await new Promise<ChallengeOutcome>((resolve) => {
        settle = resolve
      })
    } catch {
      // 取题失败（含 4011 风险过高）：http 层已经弹过提示，这里只负责别卡住调用方
      return null
    }
  }

  /** 交答案（弹窗内部调） */
  async function submit(answer: ChallengeAnswerRequest) {
    const id = challenge.value?.challengeId
    if (!id || submitting.value) return

    submitting.value = true
    error.value = ''
    try {
      const result = await answerChallenge(id, answer)
      resolveWith(result.ticket)
    } catch (err) {
      // 4010：题/票都失效了，重试同一道题一定还是 4010 —— 关掉，让调用方重新取题
      if (isChallengeExpiredError(err)) {
        resolveWith(null)
        return
      }
      // 4009（答错 / 轨迹异常 / 次数用尽）留在弹窗里：用户能原地再拖一次
      error.value = messageOf(err) || '验证未通过，请重试'
    } finally {
      submitting.value = false
    }
  }

  return { visible, submitting, error, challenge, request, submit, cancel }
}
