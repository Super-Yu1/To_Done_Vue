<script setup lang="ts">
/** 修改密码（UC-09）：需原密码，新密码走全站统一规则；改完强制重新登录 */
import { reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { PASSWORD_HINT, PASSWORD_PATTERN } from '@/constants'
import type { ChangePasswordPayload } from '@/types'

defineProps<{ saving?: boolean }>()
const emit = defineEmits<{ submit: [ChangePasswordPayload] }>()

const formRef = ref<FormInstance>()
const form = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })

const rules: FormRules = {
  oldPassword: [{ required: true, message: '请填写原密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请填写新密码', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback) =>
        PASSWORD_PATTERN.test(value) ? callback() : callback(new Error(PASSWORD_HINT)),
      trigger: 'blur',
    },
  ],
  confirmPassword: [
    {
      validator: (_rule, value: string, callback) =>
        value === form.newPassword ? callback() : callback(new Error('两次输入的密码不一致')),
      trigger: 'blur',
    },
  ],
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  emit('submit', { oldPassword: form.oldPassword, newPassword: form.newPassword })
}
</script>

<template>
  <section class="section">
    <h2 class="section__title">修改密码</h2>
    <p class="section__hint">新密码{{ PASSWORD_HINT }}；修改成功后需要重新登录。</p>
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
      <el-form-item label="原密码" prop="oldPassword">
        <el-input
          v-model="form.oldPassword"
          type="password"
          show-password
          autocomplete="current-password"
        />
      </el-form-item>
      <el-form-item label="新密码" prop="newPassword">
        <el-input
          v-model="form.newPassword"
          type="password"
          show-password
          autocomplete="new-password"
        />
      </el-form-item>
      <el-form-item label="确认新密码" prop="confirmPassword">
        <el-input
          v-model="form.confirmPassword"
          type="password"
          show-password
          autocomplete="new-password"
        />
      </el-form-item>
      <el-button type="primary" :loading="saving" @click="handleSubmit">修改密码</el-button>
    </el-form>
  </section>
</template>
