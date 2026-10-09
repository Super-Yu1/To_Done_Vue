<script setup lang="ts">
/**
 * 改资料弹窗（8.9）：名字、邮箱两项均可改；
 * 改邮箱会刷新 password_updated_at，必须在二次确认里写明「该用户需用新邮箱重新登录」。
 */
import { reactive, ref, watch } from 'vue'
import { ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import type { AdminUser, AdminUserUpdatePayload } from '@/types'

const props = defineProps<{
  user: AdminUser | null
  submitting?: boolean
  /** 后端就地提示：如 1002「该邮箱已被注册」 */
  serverError?: string
}>()

const visible = defineModel<boolean>('visible', { required: true })
const emit = defineEmits<{ confirm: [AdminUserUpdatePayload] }>()

const formRef = ref<FormInstance>()
const form = reactive({ name: '', email: '' })

const rules: FormRules = {
  name: [{ required: true, message: '请填写名字', trigger: 'blur' }],
  email: [
    { required: true, message: '请填写邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
}

watch(visible, (opened) => {
  if (!opened) return
  form.name = props.user?.name ?? ''
  form.email = props.user?.email ?? ''
  formRef.value?.clearValidate()
})

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  const emailChanged = !!props.user && form.email !== props.user.email
  if (emailChanged) {
    try {
      await ElMessageBox.confirm(
        '邮箱是登录凭证，该用户需用新邮箱重新登录，当前登录状态会立即失效。',
        '确认更换邮箱',
        { confirmButtonText: '确认更换', cancelButtonText: '取消' },
      )
    } catch {
      return
    }
  }

  emit('confirm', { name: form.name.trim(), email: form.email.trim() })
}
</script>

<template>
  <el-dialog v-model="visible" title="编辑用户资料" width="480px" append-to-body>
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
      <el-form-item label="名字" prop="name">
        <el-input v-model="form.name" maxlength="32" />
      </el-form-item>
      <el-form-item label="邮箱" prop="email">
        <el-input v-model="form.email" type="email" />
      </el-form-item>
      <p v-if="serverError" class="dialog-error">{{ serverError }}</p>
      <p v-else class="dialog-hint">手机号不在后台维护，由用户本人在个人中心修改。</p>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.dialog-error {
  font-size: 12px;
  color: var(--color-danger);
}

.dialog-hint {
  font-size: 12px;
  color: var(--color-text-2);
}
</style>
