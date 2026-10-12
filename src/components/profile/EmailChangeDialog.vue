<script setup lang="ts">
/**
 * 更换邮箱（UC-04 / 6.5 ⑤）：新邮箱 + 邮箱验证码 + 图形验证码。
 * 邮箱是登录凭证，成功后由调用方清 token 跳登录，所以这里不提供「关闭后再看结果」的中间态。
 * 每次打开都重置输入并换一张图形码——图形码是一次性的，复用上一次的必然失败。
 */
import { computed, nextTick, reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import CaptchaField from '@/components/CaptchaField.vue'
import EmailCodeField from '@/components/EmailCodeField.vue'
import type { ChangeEmailPayload } from '@/types'

const props = defineProps<{
  visible: boolean
  saving?: boolean
  /** 演示模式：两个验证码控件都不请求后端（8.6） */
  demo?: boolean
}>()

const emit = defineEmits<{ 'update:visible': [boolean]; submit: [ChangeEmailPayload] }>()

const visibleProxy = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
})

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

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) return
    form.email = ''
    form.emailCode = ''
    form.captchaCode = ''
    formRef.value?.clearValidate()
    await nextTick()
    await refreshCaptcha()
  },
)

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  emit('submit', { email: form.email.trim(), emailCode: form.emailCode })
}

/** 换图形码：校验失败后由调用方触发（一次性，失败必须换） */
async function refreshCaptcha() {
  await captchaRef.value?.refresh()
}

defineExpose({ refreshCaptcha })
</script>

<template>
  <el-dialog v-model="visibleProxy" title="更换邮箱" width="460px">
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      @submit.prevent="handleSubmit"
    >
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
      <p class="dialog-hint">邮箱是登录凭证，更换成功后会退出登录，需要（用新邮箱）重新登录。</p>
    </el-form>

    <template #footer>
      <el-button @click="visibleProxy = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSubmit">更换邮箱</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.dialog-hint {
  margin-top: -6px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--color-text-2);
}
</style>
