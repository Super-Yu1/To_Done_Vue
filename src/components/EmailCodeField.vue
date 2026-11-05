<script setup lang="ts">
/**
 * 邮箱验证码字段（3.2 / 6.5 ②，交互见 8.8）：6 位数字，按钮进入 60 秒倒计时。
 *
 * 2026-11-05 起发信**必须带人机验证票据**：点「获取验证码」先取题（`scene=EMAIL_CODE`），
 * 需要验证就弹窗、答完换票，再带 `challengeTicket` 发信；票过期（4010）会自动重取一次。
 * 换邮箱的「旧邮箱确认码」走 `direct` 模式（`POST /users/me/email-code`，服务端取收件人、免票据）。
 * 演示模式（`demo`）不请求后端、也不真发信，只把倒计时跑起来。
 */
import { computed, onUnmounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import ChallengeDialog from '@/components/challenge/ChallengeDialog.vue'
import { sendCurrentEmailCode } from '@/api/auth'
import { isChallengeExpiredError, isChallengeRequiredError } from '@/api/http'
import { sendEmailCode } from '@/api/verify'
import { useChallenge } from '@/composables/useChallenge'
import { EMAIL_CODE_LENGTH, EMAIL_CODE_RESEND_SECONDS } from '@/constants'
import type { EmailCodeScene } from '@/types'

/** 演示模式下的「有效期」，取 3.2 的 5 分钟 */
const DEMO_CODE_EXPIRE_SECONDS = 300

const props = defineProps<{
  email?: string
  scene?: EmailCodeScene
  demo?: boolean
  /**
   * direct：直接发到当前登录邮箱（2026-10-18 后端新增 `POST /users/me/email-code`，
   * 无请求体、免图形码，收件人由服务端取）。换邮箱的旧邮箱码走这个模式。
   */
  direct?: boolean
}>()

const code = defineModel<string>({ required: true })
const emit = defineEmits<{ sent: [number] }>()

const seconds = ref(0)
let timer: number | undefined

const sending = ref(false)

/**
 * 人机验证（2026-11-05 两段式）：发信**必须**带票（发信没有密码这道门槛，最低档就是滑块）。
 * `account` 传收件邮箱 —— 不带的话服务端按「零失败记录」判 NONE，业务接口却会回 4008。
 */
const {
  visible: challengeVisible,
  submitting: challengeSubmitting,
  error: challengeError,
  challenge: challengeData,
  request: requestChallenge,
  submit: submitChallenge,
  cancel: cancelChallenge,
} = useChallenge({
  scene: 'EMAIL_CODE',
  account: () => props.email,
  demo: () => Boolean(props.demo),
})

const buttonText = computed(() => (seconds.value > 0 ? `${seconds.value} 秒后重发` : '获取验证码'))
const isDisabled = computed(() => seconds.value > 0)

function stopTimer() {
  window.clearInterval(timer)
}

function startCountdown(secondsToWait: number) {
  seconds.value = secondsToWait
  stopTimer()
  timer = window.setInterval(() => {
    seconds.value -= 1
    if (seconds.value <= 0) stopTimer()
  }, 1000)
}

onUnmounted(stopTimer)

/** 点按钮：direct 直接请求当前邮箱发码；其余先取题换票，再带票发信 */
function handleSend() {
  if (props.direct) {
    void sendDirectCode()
    return
  }
  if (!props.email) {
    ElMessage.warning('请先填写邮箱')
    return
  }
  void sendWithTicket()
}

/**
 * 取题 → 换票 → 发信。
 * 票即使刚拿到也可能在发请求前失效（120 秒），所以 4008 / 4010 都重取一次再试；
 * 4009（答错）由 `useChallenge` 留在弹窗里让用户原地重来，这里不需要分支。
 */
async function sendWithTicket() {
  // 演示模式不请求后端：取题会真的打到 /verify/challenge，这里直接跑倒计时
  if (props.demo) {
    startCountdown(EMAIL_CODE_RESEND_SECONDS)
    ElMessage.success('演示模式不会真的发邮件，填任意 6 位数字即可继续')
    emit('sent', DEMO_CODE_EXPIRE_SECONDS)
    return
  }

  sending.value = true
  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const outcome = await requestChallenge()
      if (outcome === null) return
      const ticket = outcome === 'none' ? '' : outcome

      try {
        const result = await sendEmailCode({
          email: props.email ?? '',
          scene: props.scene ?? 'CHANGE_EMAIL',
          challengeTicket: ticket,
        })
        startCountdown(result.resendAfterSeconds || EMAIL_CODE_RESEND_SECONDS)
        ElMessage.success('验证码已发送，请查收邮件')
        emit('sent', result.expiresInSeconds)
        return
      } catch (error) {
        const retryable = isChallengeRequiredError(error) || isChallengeExpiredError(error)
        if (retryable && attempt === 0) continue
        return
      }
    }
  } finally {
    sending.value = false
  }
}

/** direct：当前登录邮箱，服务端取收件人；演示模式不请求后端 */
async function sendDirectCode() {
  if (props.demo) {
    startCountdown(EMAIL_CODE_RESEND_SECONDS)
    ElMessage.success('演示模式不会真的发邮件，填任意 6 位数字即可继续')
    emit('sent', DEMO_CODE_EXPIRE_SECONDS)
    return
  }

  sending.value = true
  try {
    const result = await sendCurrentEmailCode()
    startCountdown(result.resendAfterSeconds || EMAIL_CODE_RESEND_SECONDS)
    ElMessage.success('验证码已发送到当前邮箱，请查收')
    emit('sent', result.expiresInSeconds)
  } finally {
    sending.value = false
  }
}

</script>

<template>
  <div class="email-code-field">
    <el-input
      v-model="code"
      placeholder="邮箱验证码"
      :maxlength="EMAIL_CODE_LENGTH"
      autocomplete="off"
    />
    <el-button
      class="email-code-field__button"
      :disabled="isDisabled || sending"
      @click="handleSend"
    >
      {{ sending ? '发送中…' : buttonText }}
    </el-button>

    <ChallengeDialog
      v-model:visible="challengeVisible"
      :challenge="challengeData"
      :submitting="challengeSubmitting"
      :error="challengeError"
      @answer="submitChallenge"
      @cancel="cancelChallenge"
    />
  </div>
</template>

<style scoped>
.email-code-field {
  display: flex;
  gap: 8px;
  width: 100%;
}

.email-code-field :deep(.el-input) {
  flex: 1;
}

.email-code-field__button {
  flex: none;
  min-width: 112px;
}
</style>
