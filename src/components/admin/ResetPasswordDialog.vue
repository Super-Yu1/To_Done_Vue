<script setup lang="ts">
/**
 * 重置用户密码弹窗（8.9）：不需要用户原密码，也不回显任何密码；
 * 成功后旧密码立即失效，该用户需重新登录。
 */
import { reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { PASSWORD_HINT, PASSWORD_PATTERN } from '@/constants'
import type { AdminUser } from '@/types'

const props = defineProps<{ user: AdminUser | null; submitting?: boolean }>()
const visible = defineModel<boolean>('visible', { required: true })
const emit = defineEmits<{ confirm: [string] }>()

const formRef = ref<FormInstance>()
const form = reactive({ newPassword: '', confirmPassword: '' })

const rules: FormRules = {
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

watch(visible, (opened) => {
  if (!opened) return
  form.newPassword = ''
  form.confirmPassword = ''
  formRef.value?.clearValidate()
})

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  emit('confirm', form.newPassword)
}
</script>

<template>
  <el-dialog v-model="visible" title="重置用户密码" width="480px" append-to-body>
    <p class="dialog-hint">
      正在重置「{{ user?.name || user?.email }}」的密码。新密码{{ PASSWORD_HINT }}；
      提交后旧密码立即失效（不需要原密码），请把新密码告知本人。
    </p>
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
      <el-form-item label="新密码" prop="newPassword">
        <el-input v-model="form.newPassword" type="password" show-password autocomplete="new-password" />
      </el-form-item>
      <el-form-item label="确认新密码" prop="confirmPassword">
        <el-input v-model="form.confirmPassword" type="password" show-password autocomplete="new-password" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">重置密码</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.dialog-hint {
  margin-bottom: 16px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--color-text-2);
}
</style>
