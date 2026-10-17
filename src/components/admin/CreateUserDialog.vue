<script setup lang="ts">
/**
 * 创建用户弹窗（8.9 新增）：只填邮箱 + 用户名，密码由服务端随机生成。
 * 成功后本弹窗关闭、外层接着弹「初始密码」一次性展示；1002 邮箱被活跃账号占用时保持打开、就地提示。
 */
import { reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import type { AdminUserCreatePayload } from '@/types'

defineProps<{ submitting?: boolean; serverError?: string }>()
const visible = defineModel<boolean>('visible', { required: true })
const emit = defineEmits<{ confirm: [AdminUserCreatePayload] }>()

const formRef = ref<FormInstance>()
const form = reactive({ email: '', name: '' })

const rules: FormRules = {
  email: [
    { required: true, message: '请填写邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
    { max: 128, message: '邮箱最多 128 个字符', trigger: 'blur' },
  ],
  name: [
    { required: true, message: '请填写用户名', trigger: 'blur' },
    { max: 64, message: '用户名最多 64 个字符', trigger: 'blur' },
  ],
}

watch(visible, (opened) => {
  if (!opened) return
  form.email = ''
  form.name = ''
  formRef.value?.clearValidate()
})

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  emit('confirm', { email: form.email.trim(), name: form.name.trim() })
}
</script>

<template>
  <el-dialog v-model="visible" title="创建用户" width="480px" append-to-body>
    <p class="dialog-hint">
      不需要邮箱验证码：管理员直接建号，初始密码由服务端生成（12 位，含字母与数字）。
    </p>
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
      <el-form-item label="邮箱" prop="email">
        <el-input v-model="form.email" type="email" maxlength="128" placeholder="登录邮箱" />
      </el-form-item>
      <el-form-item label="用户名" prop="name">
        <el-input v-model="form.name" maxlength="64" placeholder="显示名，不唯一" />
      </el-form-item>
      <p v-if="serverError" class="dialog-error">{{ serverError }}</p>
      <p v-else class="dialog-hint">
        <strong>初始密码只在创建后展示一次</strong>，请等弹窗出现、复制完成再关掉。
      </p>
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
