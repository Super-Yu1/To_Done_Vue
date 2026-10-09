<script setup lang="ts">
/** 管理员登录（6.5 ⑫）：用独立账号 + 图形验证码；后台没有注册入口（8.9） */
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import AuthShell from '@/components/AuthShell.vue'
import CaptchaField from '@/components/CaptchaField.vue'
import { useAdminStore } from '@/stores/admin'

const adminStore = useAdminStore()
const route = useRoute()
const router = useRouter()

const formRef = ref<FormInstance>()
const captchaRef = ref<InstanceType<typeof CaptchaField>>()
const submitting = ref(false)

const form = reactive({
  name: '',
  password: '',
  captchaId: '',
  captchaCode: '',
})

const rules: FormRules = {
  name: [{ required: true, message: '请填写管理员名', trigger: 'blur' }],
  password: [{ required: true, message: '请填写密码', trigger: 'blur' }],
  captchaCode: [{ required: true, message: '请填写图形验证码', trigger: 'blur' }],
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    await adminStore.login({ ...form })
    ElMessage.success('登录成功')
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/admin/users'
    await router.push(redirect)
  } catch {
    // 5001 提示由 http 层给出；图形码一次性，失败后换一张
    await captchaRef.value?.refresh()
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthShell title="后台登录" subtitle="管理员账号由服务器配置创建，后台没有注册入口">
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
      <el-form-item label="管理员名" prop="name">
        <el-input v-model="form.name" autocomplete="username" />
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input v-model="form.password" type="password" show-password autocomplete="current-password" />
      </el-form-item>
      <el-form-item label="图形验证码" prop="captchaCode">
        <CaptchaField ref="captchaRef" v-model="form.captchaCode" v-model:captcha-id="form.captchaId" />
      </el-form-item>

      <el-button class="submit" type="primary" :loading="submitting" @click="handleSubmit">
        登录
      </el-button>
    </el-form>
  </AuthShell>
</template>

<style scoped>
.submit {
  width: 100%;
}
</style>
