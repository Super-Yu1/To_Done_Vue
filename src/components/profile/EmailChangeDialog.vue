<script setup lang="ts">
/**
 * 更换邮箱（UC-04 / 6.5 ⑤）：新邮箱 + 邮箱验证码。
 * 接口（`PUT /api/users/me/email`）的请求体只要这两项——图形码只在「获取验证码」那一步用一次
 * （由 EmailCodeField 自带的弹窗处理），提交不需要。原先这里还常驻着一个图形码字段，
 * 它的值从来没进过请求体（2026-10-15 核实 Swagger 后删除）。
 * 邮箱是登录凭证，成功后由调用方清 token 跳登录，所以这里不提供「关闭后再看结果」的中间态。
 */
import { computed, reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import EmailCodeField from '@/components/EmailCodeField.vue'
import type { ChangeEmailPayload } from '@/types'

const props = defineProps<{
  visible: boolean
  saving?: boolean
  /** 演示模式：邮箱验证码字段不请求后端（8.6） */
  demo?: boolean
}>()

const emit = defineEmits<{ 'update:visible': [boolean]; submit: [ChangeEmailPayload] }>()

const visibleProxy = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
})

const formRef = ref<FormInstance>()
const form = reactive({ email: '', emailCode: '' })

const rules: FormRules = {
  email: [
    { required: true, message: '请填写新邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  emailCode: [{ required: true, message: '请填写验证码', trigger: 'blur' }],
}

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    form.email = ''
    form.emailCode = ''
    formRef.value?.clearValidate()
  },
)

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  emit('submit', { email: form.email.trim(), emailCode: form.emailCode })
}
</script>

<template>
  <el-dialog v-model="visibleProxy" title="更换邮箱" width="460px">
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      @submit.prevent="handleSubmit"
    >
      <el-form-item label="新邮箱" prop="email">
        <el-input v-model="form.email" type="email" placeholder="new@example.com" />
      </el-form-item>
      <el-form-item label="验证码" prop="emailCode">
        <!-- 发信的图形码由字段自己的弹窗处理（点「获取验证码」时弹一次） -->
        <EmailCodeField
          v-model="form.emailCode"
          :email="form.email"
          scene="CHANGE_EMAIL"
          :demo="demo"
        />
      </el-form-item>
      <p class="dialog-hint">邮箱是登录凭证，更换成功后会退出登录，需要（用新邮箱）重新登录。</p>
    </el-form>

    <template #footer>
      <el-button @click="visibleProxy = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSubmit">更换邮箱</el-button>
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
