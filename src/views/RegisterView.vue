<script setup lang="ts">
/** 注册（UC-01 / 6.5 ③）：邮箱 + 密码 + 名字 + 邮箱验证码 + 图形验证码；name 不查重 */
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

const form = reactive({
  email: '',
  password: '',
  name: '',
  emailCode: '',
  captchaId: '',
  captchaCode: '',
})

const rules: FormRules = {
  email: [
    { required: true, message: '请填写邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请填写密码', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback) =>
        PASSWORD_PATTERN.test(value) ? callback() : callback(new Error(PASSWORD_HINT)),
      trigger: 'blur',
    },
  ],
  name: [{ required: true, message: '请填写名字', trigger: 'blur' }],
  emailCode: [{ required: true, message: '请填写邮箱验证码', trigger: 'blur' }],
  captchaCode: [{ required: true, message: '请填写图形验证码', trigger: 'blur' }],
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  try {
    await auth.register({ ...form })
    ElMessage.success('注册成功')
    await router.push('/tasks')
  } catch {
    // 1002 邮箱已被注册等提示由 http 层给出；图形码一次性，失败后换一张
    await captchaRef.value?.refresh()
  }
}
</script>

<template>
  <AuthShell title="注册" :subtitle="`密码${PASSWORD_HINT}`">
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
      <el-form-item label="邮箱" prop="email">
        <el-input v-model="form.email" type="email" autocomplete="username" placeholder="you@example.com" />
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input v-model="form.password" type="password" autocomplete="new-password" show-password />
      </el-form-item>
      <el-form-item label="名字" prop="name">
        <el-input v-model="form.name" placeholder="显示名，可重复" maxlength="32" />
      </el-form-item>
      <el-form-item label="邮箱验证码" prop="emailCode">
        <EmailCodeField
          v-model="form.emailCode"
          :email="form.email"
          scene="REGISTER"
          :captcha-id="form.captchaId"
          :captcha-code="form.captchaCode"
          @refresh-captcha="captchaRef?.refresh()"
        />
      </el-form-item>
      <el-form-item label="图形验证码" prop="captchaCode">
        <CaptchaField ref="captchaRef" v-model="form.captchaCode" v-model:captcha-id="form.captchaId" />
      </el-form-item>

      <el-button class="submit" type="primary" :loading="auth.loading" @click="handleSubmit">
        注册
      </el-button>
    </el-form>

    <div class="links">
      <RouterLink class="links__item" to="/login">已有账号，去登录</RouterLink>
      <RouterLink class="links__item" to="/demo">先逛逛演示</RouterLink>
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
