<script setup lang="ts">
/**
 * 更换邮箱（UC-04 / 6.5 ⑤，2026-10-18 改双验证码）：
 * 先把验证码发到**当前邮箱**并填写，再填新邮箱与其验证码；两个码都通过才更换。
 * 后端契约（待后端合入）：`PUT /api/users/me/email` 请求体 `{ email, emailCode, oldEmailCode }`，
 * 发码接口新增 `CHANGE_EMAIL_OLD` 场景（收件邮箱必须是当前登录邮箱）。
 * 图形码只在「获取验证码」那一步用一次（EmailCodeField 自带弹窗），提交不需要。
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
  /** 当前登录邮箱（旧邮箱验证码发到这里） */
  currentEmail: string
}>()

const emit = defineEmits<{ 'update:visible': [boolean]; submit: [ChangeEmailPayload] }>()

const visibleProxy = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
})

const formRef = ref<FormInstance>()
const form = reactive({ email: '', emailCode: '', oldEmailCode: '' })

const rules: FormRules = {
  email: [
    { required: true, message: '请填写新邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  emailCode: [{ required: true, message: '请填写新邮箱验证码', trigger: 'blur' }],
  oldEmailCode: [{ required: true, message: '请填写当前邮箱验证码', trigger: 'blur' }],
}

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    form.email = ''
    form.emailCode = ''
    form.oldEmailCode = ''
    formRef.value?.clearValidate()
  },
)

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  emit('submit', {
    email: form.email.trim(),
    emailCode: form.emailCode,
    oldEmailCode: form.oldEmailCode,
  })
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
      <!-- 第一步：验证当前（旧）邮箱 -->
      <div class="email-current">
        <span class="email-current__label">当前邮箱</span>
        <span class="email-current__value">{{ currentEmail }}</span>
      </div>

      <el-form-item label="当前邮箱验证码" prop="oldEmailCode">
        <!-- 直接发到当前登录邮箱：无请求体、免图形码，收件人由服务端取 -->
        <EmailCodeField v-model="form.oldEmailCode" direct :demo="demo" />
      </el-form-item>

      <p class="dialog-step">验证当前邮箱后，再填写要更换的新邮箱。</p>

      <!-- 第二步：验证新邮箱 -->
      <el-form-item label="新邮箱" prop="email">
        <el-input v-model="form.email" type="email" placeholder="new@example.com" />
      </el-form-item>
      <el-form-item label="新邮箱验证码" prop="emailCode">
        <!-- 发信的图形码由字段自己的弹窗处理（点「获取验证码」时弹一次） -->
        <EmailCodeField
          v-model="form.emailCode"
          :email="form.email"
          scene="CHANGE_EMAIL"
          :demo="demo"
        />
      </el-form-item>

      <p class="dialog-hint">
        两个验证码都通过后才会更换邮箱。邮箱是登录凭证，更换成功后会退出登录，需要（用新邮箱）重新登录。
      </p>
    </el-form>

    <template #footer>
      <el-button @click="visibleProxy = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSubmit">更换邮箱</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
/* 当前邮箱只读展示：换邮箱前先让用户确认「从哪个邮箱换」 */
.email-current {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 16px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  background-color: var(--color-bg-soft);
  font-size: 13px;
  line-height: 1.6;
}

.email-current__label {
  flex: none;
  color: var(--color-text-3);
}

.email-current__value {
  color: var(--color-text);
  font-weight: 500;
  word-break: break-all;
}

/* 两步之间的过渡说明 */
.dialog-step {
  margin: -2px 0 16px;
  font-size: 12px;
  color: var(--color-text-3);
}

.dialog-hint {
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--color-text-2);
}
</style>
