<script setup lang="ts">
/**
 * 修改密码（UC-09）：需原密码，新密码走全站统一规则；改完强制重新登录（由调用方执行）。
 * 每次打开都清空输入——密码字段不该在弹窗里留残留。
 */
import { computed, reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { PASSWORD_HINT, PASSWORD_PATTERN } from '@/constants'
import type { ChangePasswordPayload } from '@/types'

const props = defineProps<{ visible: boolean; saving?: boolean }>()
const emit = defineEmits<{ 'update:visible': [boolean]; submit: [ChangePasswordPayload] }>()

const visibleProxy = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
})

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

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    form.oldPassword = ''
    form.newPassword = ''
    form.confirmPassword = ''
    formRef.value?.clearValidate()
  },
)

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  emit('submit', { oldPassword: form.oldPassword, newPassword: form.newPassword })
}
</script>

<template>
  <el-dialog v-model="visibleProxy" title="修改密码" width="420px">
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      @submit.prevent="handleSubmit"
    >
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
      <p class="dialog-hint">新密码{{ PASSWORD_HINT }}；修改成功后会退出登录，需要用新密码重新登录。</p>
    </el-form>

    <template #footer>
      <el-button @click="visibleProxy = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSubmit">修改密码</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.dialog-hint {
  margin-top: -6px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--color-text-2);
}
</style>
