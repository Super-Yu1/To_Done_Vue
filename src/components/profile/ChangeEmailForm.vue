<script setup lang="ts">
/**
 * 更换邮箱（UC-04 / 6.5 ⑤）：新邮箱 + 邮箱验证码 + 图形验证码。
 * 邮箱是登录凭证，换完需要用新邮箱重新登录。
 * demo 为真时两个验证码控件都不请求后端（8.6）。
 */
import { reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import CaptchaField from '@/components/CaptchaField.vue'
import EmailCodeField from '@/components/EmailCodeField.vue'
import type { ChangeEmailPayload } from '@/types'

defineProps<{ demo?: boolean; saving?: boolean }>()
const emit = defineEmits<{ submit: [ChangeEmailPayload] }>()

const formRef = ref<FormInstance>()
const captchaRef = ref<InstanceType<typeof CaptchaField>>()
const form = reactive({ email: '', emailCode: '', captchaId: '', captchaCode: '' })

const rules: FormRules = {
  email: [
    { required: true, message: '请填写新邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  emailCode: [{ required: true, message: '请填写邮箱验证码', trigger: 'blur' }],
  captchaCode: [{ required: true, message: '请填写图形验证码', trigger: 'blur' }],
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  emit('submit', { email: form.email.trim(), emailCode: form.emailCode })
}

/** 换图形码：它是一次性的，校验失败后必须换 */
async function refreshCaptcha() {
  await captchaRef.value?.refresh()
}

/** 成功后清空输入并换一张图形码 */
async function reset() {
  form.email = ''
  form.emailCode = ''
  formRef.value?.clearValidate()
  await refreshCaptcha()
}

defineExpose({ refreshCaptcha, reset })
</script>

<template>
  <section class="section">
    <h2 class="section__title">更换邮箱</h2>
    <p class="section__hint">邮箱是登录凭证，更换后需要用新邮箱重新登录。</p>
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
      <el-form-item label="新邮箱" prop="email">
        <el-input v-model="form.email" type="email" placeholder="new@example.com" />
      </el-form-item>
      <el-form-item label="邮箱验证码" prop="emailCode">
        <EmailCodeField
          v-model="form.emailCode"
          :email="form.email"
          scene="CHANGE_EMAIL"
          :captcha-id="form.captchaId"
          :captcha-code="form.captchaCode"
          :demo="demo"
          @refresh-captcha="refreshCaptcha"
        />
      </el-form-item>
      <el-form-item label="图形验证码" prop="captchaCode">
        <CaptchaField
          ref="captchaRef"
          v-model="form.captchaCode"
          v-model:captcha-id="form.captchaId"
          :demo="demo"
        />
      </el-form-item>
      <el-button type="primary" :loading="saving" @click="handleSubmit">更换邮箱</el-button>
    </el-form>
  </section>
</template>
