<script setup lang="ts">
/**
 * 管理员登录（6.5 ⑫）：用独立账号 + 图形验证码；后台没有注册入口（8.9）。
 * 与前台登录页一致：图形码在点「登录」时弹窗输入（2026-10-15，原先常驻表单）。
 */
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import AuthShell from '@/components/AuthShell.vue'
import CaptchaDialog from '@/components/CaptchaDialog.vue'
import { useAdminStore } from '@/stores/admin'

const adminStore = useAdminStore()
const route = useRoute()
const router = useRouter()

/** 管理员 token 失效被踢回来时读地址栏的 expired=1，与前台登录页同一处理（常驻提示而非 toast） */
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
const submitting = ref(false)

const form = reactive({
  name: '',
  password: '',
})

const rules: FormRules = {
  name: [{ required: true, message: '请填写管理员名', trigger: 'blur' }],
  password: [{ required: true, message: '请填写密码', trigger: 'blur' }],
}

/** 校验通过先弹图形码，不在这里发请求 */
async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  captchaVisible.value = true
}

async function handleCaptchaConfirm(payload: { captchaId: string; captchaCode: string }) {
  submitting.value = true
  try {
    await adminStore.login({ ...form, ...payload })
    captchaVisible.value = false
    ElMessage.success('登录成功')
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/admin/users'
    await router.push(redirect)
  } catch {
    // 5001（账号或密码错）/ 4001（图形码错）提示由 http 层给出，一律关掉弹窗；
    // 与前台登录同一理由：密码也可能是错的，下次点「登录」自然拿到一张新图
    captchaVisible.value = false
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthShell title="后台登录" subtitle="管理员账号由服务器配置创建，后台没有注册入口">
    <p v-if="expiredNotice" class="expired-notice">登录状态已失效，请重新登录</p>

    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
      <el-form-item label="管理员名" prop="name">
        <el-input v-model="form.name" autocomplete="username" />
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input v-model="form.password" type="password" show-password autocomplete="current-password" />
      </el-form-item>

      <el-button class="submit" type="primary" :loading="submitting" @click="handleSubmit">
        登录
      </el-button>
    </el-form>

    <CaptchaDialog
      v-model:visible="captchaVisible"
      tip="后台登录同样要过一次图形码（防刷），输入后即可登录。"
      :loading="submitting"
      @confirm="handleCaptchaConfirm"
    />
  </AuthShell>
</template>

<style scoped>
/* 与前台登录页同款：状态说明用次要底色，与红色校验错误区分开 */
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
</style>
