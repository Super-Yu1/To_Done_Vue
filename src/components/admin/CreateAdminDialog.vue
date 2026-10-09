<script setup lang="ts">
/**
 * 新增管理员弹窗（8.9）：名字、密码、确认密码；
 * 名字撞车后端返回 5002，就地提示；创建后密码不可修改，成功后要提醒妥善保存。
 */
import { reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { PASSWORD_HINT, PASSWORD_PATTERN } from '@/constants'
import type { CreateAdminPayload } from '@/types'

defineProps<{ submitting?: boolean; serverError?: string }>()
const visible = defineModel<boolean>('visible', { required: true })
const emit = defineEmits<{ confirm: [CreateAdminPayload] }>()

const formRef = ref<FormInstance>()
const form = reactive({ name: '', password: '', confirmPassword: '' })

const rules: FormRules = {
  name: [{ required: true, message: '请填写管理员名', trigger: 'blur' }],
  password: [
    { required: true, message: '请填写密码', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback) =>
        PASSWORD_PATTERN.test(value) ? callback() : callback(new Error(PASSWORD_HINT)),
      trigger: 'blur',
    },
  ],
  confirmPassword: [
    {
      validator: (_rule, value: string, callback) =>
        value === form.password ? callback() : callback(new Error('两次输入的密码不一致')),
      trigger: 'blur',
    },
  ],
}

watch(visible, (opened) => {
  if (!opened) return
  form.name = ''
  form.password = ''
  form.confirmPassword = ''
  formRef.value?.clearValidate()
})

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  emit('confirm', { name: form.name.trim(), password: form.password })
}
</script>

<template>
  <el-dialog v-model="visible" title="新增管理员" width="480px" append-to-body>
    <p class="dialog-hint">
      管理员名即登录名，全站唯一；密码{{ PASSWORD_HINT }}。
      <strong>密码一旦创建不可修改</strong>，请妥善保存。
    </p>
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
      <el-form-item label="管理员名" prop="name">
        <el-input v-model="form.name" maxlength="32" autocomplete="off" />
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input v-model="form.password" type="password" show-password autocomplete="new-password" />
      </el-form-item>
      <el-form-item label="确认密码" prop="confirmPassword">
        <el-input v-model="form.confirmPassword" type="password" show-password autocomplete="new-password" />
      </el-form-item>
      <p v-if="serverError" class="dialog-error">{{ serverError }}</p>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">创建</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.dialog-hint {
  margin-bottom: 16px;
  font-size: 12px;
  line-height: 1.8;
  color: var(--color-text-2);
}

.dialog-error {
  font-size: 12px;
  color: var(--color-danger);
}
</style>
