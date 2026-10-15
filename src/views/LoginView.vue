<script setup lang="ts">
/**
 * 登录（UC-02 / 6.5 ④）：邮箱 + 密码；图形码在点「登录」时弹窗输入（2026-10-15，原先常驻表单）。
 * 登录接口要 captchaId + captchaCode（Swagger 必填），所以弹窗确认后才带着它提交。
 */
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import AuthShell from '@/components/AuthShell.vue'
import CaptchaDialog from '@/components/CaptchaDialog.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

/**
 * token 失效被踢回来时，http 层在地址栏留了 expired=1（那边不弹 toast 的原因见 http.ts）。
 * 这里做成**页面内的常驻提示**而不是 toast：整页跳转刚结束时弹提示容易与加载抢时序，
 * 常驻一行反而看得清，提交一次后自然消失。
 */
const expiredNotice = ref(false)

onMounted(() => {
  if (!route.query.expired) return
  expiredNotice.value = true
  const rest = { ...route.query }
  delete rest.expired
  void router.replace({ path: route.path, query: rest })
})

const formRef = ref<FormInstance>()
const captchaVisible = ref(false)

const form = reactive({
  email: '',
  password: '',
})

const rules: FormRules = {
  email: [
    { required: true, message: '请填写邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  password: [{ required: true, message: '请填写密码', trigger: 'blur' }],
}

/** 校验通过先弹图形码，不在这里发请求 */
async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  captchaVisible.value = true
}

async function handleCaptchaConfirm(payload: { captchaId: string; captchaCode: string }) {
  try {
    await auth.login({ ...form, ...payload })
    captchaVisible.value = false
    ElMessage.success('登录成功')
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/tasks'
    await router.push(redirect)
  } catch {
    // 失败原因由 http 层提示（4001 图形码错 / 1003 邮箱或密码错 / 1006 冻结 / 1007 注销）。
    // 一律关掉弹窗：密码也可能填错，留住弹窗会逼用户为一次输错连填两次图形码；
    // 弹窗是 destroy-on-close 的，下次点「登录」自然是一张新图。
    captchaVisible.value = false
  }
}
</script>

<template>
  <AuthShell title="登录" subtitle="用邮箱登录，管理员请走后台入口">
    <p v-if="expiredNotice" class="expired-notice">登录状态已失效，请重新登录</p>

    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
      <el-form-item label="邮箱" prop="email">
        <el-input v-model="form.email" type="email" autocomplete="username" placeholder="you@example.com" />
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input v-model="form.password" type="password" autocomplete="current-password" show-password />
      </el-form-item>

      <el-button class="submit" type="primary" :loading="auth.loading" @click="handleSubmit">
        登录
      </el-button>
    </el-form>

    <CaptchaDialog
      v-model:visible="captchaVisible"
      tip="登录前过一次图形码（防刷），输入后即可登录。"
      :loading="auth.loading"
      @confirm="handleCaptchaConfirm"
    />

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
/* 失效提示与表单同宽，用次要底色区分于校验错误（那是红字，这是状态说明） */
.expired-notice {
  margin-bottom: 16px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-hover);
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-2);
}

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
