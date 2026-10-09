<script setup lang="ts">
/** 基本资料（UC-09）：名字与手机号可改，邮箱与注册时间只读；只负责收集，提交交给调用方 */
import { reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { formatDateTime } from '@/utils/date'
import type { UpdateProfilePayload, User } from '@/types'

const props = defineProps<{ user: User | null; saving?: boolean }>()
const emit = defineEmits<{ submit: [UpdateProfilePayload] }>()

/** 手机号本期不发短信、不用于登录，这里只校验形态，唯一性由后端 1008 保证 */
const PHONE_PATTERN = /^\d{6,20}$/

const formRef = ref<FormInstance>()
const form = reactive({ name: '', phone: '' })

const rules: FormRules = {
  name: [{ required: true, message: '请填写名字', trigger: 'blur' }],
  phone: [
    {
      validator: (_rule, value: string, callback) =>
        !value || PHONE_PATTERN.test(value) ? callback() : callback(new Error('手机号只能是数字')),
      trigger: 'blur',
    },
  ],
}

/** 用户信息到达或刷新后同步进表单 */
watch(
  () => props.user,
  (user) => {
    form.name = user?.name ?? ''
    form.phone = user?.phone ?? ''
  },
  { immediate: true },
)

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  emit('submit', { name: form.name.trim(), phone: form.phone.trim() })
}
</script>

<template>
  <section class="section">
    <h2 class="section__title">基本资料</h2>
    <p class="section__hint">名字只是称呼，可以重复；手机号留空即解绑，填写时全站唯一。</p>
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
      <el-form-item label="名字" prop="name">
        <el-input v-model="form.name" maxlength="32" />
      </el-form-item>
      <el-form-item label="手机号" prop="phone">
        <el-input v-model="form.phone" maxlength="20" placeholder="选填，本期不发短信、不用于登录" />
      </el-form-item>
      <el-form-item label="邮箱">
        <el-input :model-value="user?.email ?? ''" disabled />
      </el-form-item>
      <el-form-item label="注册时间">
        <el-input :model-value="formatDateTime(user?.createdAt)" disabled />
      </el-form-item>
      <el-button type="primary" :loading="saving" @click="handleSubmit">保存资料</el-button>
    </el-form>
  </section>
</template>
