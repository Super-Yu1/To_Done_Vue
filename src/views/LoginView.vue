<script setup lang="ts">
/** 登录（UC-02 / 6.5 ④）：邮箱 + 密码 + 图形验证码；用户名不再用于登录 */
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import AuthShell from '@/components/AuthShell.vue'
import CaptchaField from '@/components/CaptchaField.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const formRef = ref<FormInstance>()
const captchaRef = ref<InstanceType<typeof CaptchaField>>()

const form = reactive({
  email: '',
  password: '',
  captchaId: '',
  captchaCode: '',
})

const rules: FormRules = {
  email: [
    { required: true, message: '请填写邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  password: [{ required: true, message: '请填写密码', trigger: 'blur' }],
  captchaCode: [{ required: true, message: '请填写图形验证码', trigger: 'blur' }],
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  try {
    await auth.login({ ...form })
    ElMessage.success('登录成功')
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/tasks'
    await router.push(redirect)
  } catch {
    // 失败原因由 http 层提示（1003 / 1006 / 1007 共用同一弹窗通道）；
    // 图形验证码只有一次机会，失败后必须换一张并清空输入
    await captchaRef.value?.refresh()
  }
}
</script>

<template>
  <AuthShell title="登录" subtitle="用邮箱登录，管理员请走后台入口">
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
      <el-form-item label="邮箱" prop="email">
        <el-input v-model="form.email" type="email" autocomplete="username" placeholder="you@example.com" />
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input v-model="form.password" type="password" autocomplete="current-password" show-password />
      </el-form-item>
      <el-form-item label="图形验证码" prop="captchaCode">
        <CaptchaField
          ref="captchaRef"
          v-model="form.captchaCode"
          v-model:captcha-id="form.captchaId"
        />
      </el-form-item>

      <el-button class="submit" type="primary" :loading="auth.loading" @click="handleSubmit">
        登录
      </el-button>
    </el-form>

    <div class="links">
      <RouterLink class="links__item" to="/forgot-password">忘记密码</RouterLink>
      <RouterLink class="links__item" to="/register">注册新账号</RouterLink>
    </div>

    <div class="demo-entry">
      <el-button text @click="router.push('/demo')">先逛逛演示</el-button>
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

.demo-entry {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
  text-align: center;
}
</style>
