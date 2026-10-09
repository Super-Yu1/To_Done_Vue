<script setup lang="ts">
/** 找回密码（UC-03 / 6.5 ⑤）：邮箱 + 邮箱验证码 + 新密码；邮箱不存在时后端也返回成功（防枚举） */
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import AuthShell from '@/components/AuthShell.vue'
import CaptchaField from '@/components/CaptchaField.vue'
import EmailCodeField from '@/components/EmailCodeField.vue'
import { PASSWORD_HINT, PASSWORD_PATTERN } from '@/constants'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const formRef = ref<FormInstance>()
const captchaRef = ref<InstanceType<typeof CaptchaField>>()
const submitting = ref(false)

const form = reactive({
  email: '',
  emailCode: '',
  newPassword: '',
  captchaId: '',
  captchaCode: '',
})

const rules: FormRules = {
  email: [
    { required: true, message: '请填写邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  emailCode: [{ required: true, message: '请填写邮箱验证码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请填写新密码', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback) =>
        PASSWORD_PATTERN.test(value) ? callback() : callback(new Error(PASSWORD_HINT)),
      trigger: 'blur',
    },
  ],
  captchaCode: [{ required: true, message: '请填写图形验证码', trigger: 'blur' }],
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    await auth.resetPassword({
      email: form.email,
      emailCode: form.emailCode,
      newPassword: form.newPassword,
    })
    ElMessage.success('密码已重置，请用新密码登录')
    await router.push('/login')
  } catch {
    await captchaRef.value?.refresh()
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthShell title="找回密码" :subtitle="`新密码要求：${PASSWORD_HINT}`">
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
      <el-form-item label="邮箱" prop="email">
        <el-input v-model="form.email" type="email" autocomplete="username" placeholder="you@example.com" />
      </el-form-item>
      <el-form-item label="邮箱验证码" prop="emailCode">
        <EmailCodeField
          v-model="form.emailCode"
          :email="form.email"
          scene="RESET_PASSWORD"
          :captcha-id="form.captchaId"
          :captcha-code="form.captchaCode"
          @refresh-captcha="captchaRef?.refresh()"
        />
      </el-form-item>
      <el-form-item label="图形验证码" prop="captchaCode">
        <CaptchaField ref="captchaRef" v-model="form.captchaCode" v-model:captcha-id="form.captchaId" />
      </el-form-item>
      <el-form-item label="新密码" prop="newPassword">
        <el-input v-model="form.newPassword" type="password" autocomplete="new-password" show-password />
      </el-form-item>

      <el-button class="submit" type="primary" :loading="submitting" @click="handleSubmit">
        重置密码
      </el-button>
    </el-form>

    <div class="links">
      <RouterLink class="links__item" to="/login">返回登录</RouterLink>
      <RouterLink class="links__item" to="/register">注册新账号</RouterLink>
    </div>
  </AuthShell>
</template>

<style scoped>
.submit {
  width: 100%;
}

.links {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  font-size: 12px;
}

.links__item {
  color: var(--color-text-2);
}

.links__item:hover {
  color: var(--color-text);
}
</style>
