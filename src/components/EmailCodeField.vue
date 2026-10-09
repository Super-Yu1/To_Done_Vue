<script setup lang="ts">
/**
 * 邮箱验证码字段（3.2 / 6.5 ②，交互见 8.8）：6 位数字，按钮进入 60 秒倒计时；
 * 发送失败（图形码错 / 频次限制等）时通知调用方刷新图形验证码。
 * demo 为真时不请求后端，也不真的发信，直接进入倒计时（8.6）。
 */
import { computed, onUnmounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { sendEmailCode } from '@/api/verify'
import { EMAIL_CODE_LENGTH, EMAIL_CODE_RESEND_SECONDS } from '@/constants'
import type { EmailCodeScene } from '@/types'

/** 演示模式下的「有效期」，取 3.2 的 5 分钟 */
const DEMO_CODE_EXPIRE_SECONDS = 300

const props = defineProps<{
  email: string
  scene: EmailCodeScene
  captchaId: string
  captchaCode: string
  demo?: boolean
}>()

const code = defineModel<string>({ required: true })
const emit = defineEmits<{ sent: [number]; 'refresh-captcha': [] }>()

const seconds = ref(0)
let timer: number | undefined

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

async function handleSend() {
  if (!props.email) {
    ElMessage.warning('请先填写邮箱')
    return
  }
  if (!props.captchaCode) {
    ElMessage.warning('请先填写图形验证码')
    return
  }
  if (props.demo) {
    startCountdown(EMAIL_CODE_RESEND_SECONDS)
    ElMessage.success('演示模式不会真的发邮件，填任意 6 位数字即可继续')
    emit('sent', DEMO_CODE_EXPIRE_SECONDS)
    return
  }

  try {
    const result = await sendEmailCode({
      email: props.email,
      scene: props.scene,
      captchaId: props.captchaId,
      captchaCode: props.captchaCode,
    })
    startCountdown(result.resendAfterSeconds || EMAIL_CODE_RESEND_SECONDS)
    ElMessage.success('验证码已发送，请查收邮件')
    emit('sent', result.expiresInSeconds)
  } catch {
    // 失败原因已由 http 层提示；图形码一次性，失败后必须换一张
    emit('refresh-captcha')
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
    <el-button class="email-code-field__button" :disabled="isDisabled" @click="handleSend">
      {{ buttonText }}
    </el-button>
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
