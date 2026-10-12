<script setup lang="ts">
/**
 * 编辑资料（UC-09 / 6.5 ⑤）：名字与手机号共用这一个弹窗。
 * 只提交**改动过**的字段——接口契约是两个字段都可选、只改传了的；没有改动时保存按钮直接禁用，
 * 避免一次什么都没改的请求。
 */
import { computed, reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import type { UpdateProfilePayload, User } from '@/types'

const props = defineProps<{
  visible: boolean
  user: User | null
  saving?: boolean
}>()

const emit = defineEmits<{ 'update:visible': [boolean]; submit: [UpdateProfilePayload] }>()

/** 手机号本期不发短信、不用于登录，这里只校验形态，唯一性由后端 1008 保证 */
const PHONE_PATTERN = /^\d{6,20}$/

const visibleProxy = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
})

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

/** 手机号留空即解绑，所以「空」也是一种有效改动 */
const dirty = computed(
  () => form.name.trim() !== (props.user?.name ?? '') || form.phone.trim() !== (props.user?.phone ?? ''),
)

watch(
  () => [props.visible, props.user] as const,
  ([visible]) => {
    if (!visible) return
    form.name = props.user?.name ?? ''
    form.phone = props.user?.phone ?? ''
    formRef.value?.clearValidate()
  },
  { immediate: true },
)

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  const payload: UpdateProfilePayload = {}
  if (form.name.trim() !== (props.user?.name ?? '')) payload.name = form.name.trim()
  if (form.phone.trim() !== (props.user?.phone ?? '')) payload.phone = form.phone.trim()
  emit('submit', payload)
}
</script>

<template>
  <el-dialog v-model="visibleProxy" title="编辑资料" width="420px">
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      @submit.prevent="handleSubmit"
    >
      <el-form-item label="名字" prop="name">
        <el-input v-model="form.name" maxlength="32" placeholder="显示用的称呼，可以重复" />
      </el-form-item>
      <el-form-item label="手机号" prop="phone">
        <el-input v-model="form.phone" maxlength="20" placeholder="选填，留空即解绑" />
      </el-form-item>
      <p class="dialog-hint">手机号本期不发短信、不用于登录，填写时全站唯一。</p>
    </el-form>

    <template #footer>
      <el-button @click="visibleProxy = false">取消</el-button>
      <el-button type="primary" :loading="saving" :disabled="!dirty" @click="handleSubmit">
        保存
      </el-button>
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
