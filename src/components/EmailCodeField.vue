<script setup lang="ts">
/**
 * 邮箱验证码字段（3.2 / 6.5 ②，交互见 8.8）：6 位数字，按钮进入 60 秒倒计时。
 * 2026-10-14 起：图形码不再常驻表单 —— 点「获取验证码」弹窗输入，发出后自动关掉；
 * 发送失败（图形码错 / 频次限制）弹窗保持打开并换一张新图形码。
 * demo 为真时不请求后端、也不真发信，走同一套弹窗交互（图形码本地生成），只把倒计时跑起来。
 */
import { computed, onUnmounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import CaptchaDialog from '@/components/CaptchaDialog.vue'
import { sendCurrentEmailCode } from '@/api/auth'
import { isCaptchaError } from '@/api/http'
import { sendEmailCode } from '@/api/verify'
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

const captchaVisible = ref(false)
const sending = ref(false)
const captchaDialogRef = ref<InstanceType<typeof CaptchaDialog>>()

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

/** 点按钮：普通模式打开图形码弹窗，direct 模式直接请求当前邮箱发码 */
function handleSend() {
  if (props.direct) {
    void sendDirectCode()
    return
  }
  if (!props.email) {
    ElMessage.warning('请先填写邮箱')
    return
  }
  captchaVisible.value = true
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

async function handleCaptchaConfirm(payload: { captchaId: string; captchaCode: string }) {
  if (props.demo) {
    captchaVisible.value = false
    startCountdown(EMAIL_CODE_RESEND_SECONDS)
    ElMessage.success('演示模式不会真的发邮件，填任意 6 位数字即可继续')
    emit('sent', DEMO_CODE_EXPIRE_SECONDS)
    return
  }

  sending.value = true
  try {
    const result = await sendEmailCode({
      email: props.email ?? '',
      scene: props.scene ?? 'CHANGE_EMAIL',
      captchaId: payload.captchaId,
      captchaCode: payload.captchaCode,
    })
    captchaVisible.value = false
    startCountdown(result.resendAfterSeconds || EMAIL_CODE_RESEND_SECONDS)
    ElMessage.success('验证码已发送，请查收邮件')
    emit('sent', result.expiresInSeconds)
  } catch (error) {
    // 图形码错：红字提示 + 换一张（弹窗留着，4 位不用从头再来）；
    // 其它失败（60 秒冷却 / 每日上限）交给 http 层提示，并关掉弹窗，免得让人对着一张没用的码继续填
    if (isCaptchaError(error)) {
      captchaDialogRef.value?.markError()
    } else {
      captchaVisible.value = false
    }
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

    <CaptchaDialog
      ref="captchaDialogRef"
      v-model:visible="captchaVisible"
      :loading="sending"
      :demo="demo"
      @confirm="handleCaptchaConfirm"
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
