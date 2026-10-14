<script setup lang="ts">
/**
 * 图形验证码弹窗（2026-10-14 交互调整）：
 * 图形码只在**真正要用到它**的时候才打扰用户——点「获取验证码」或提交表单时弹出来输入，
 * 而不是常驻在表单里（常量常驻会让「填邮箱 → 拿码 → 提交」这条主线被一行无关注输入打断）。
 *
 * 图形码是一次机会：外部请求失败（图形码错）时调用 expose 出来的 refresh() 换一张，弹窗保持打开。
 * `destroy-on-close` 让每次打开都是新实例：图形码自然是新的、输入框也是空的。
 */
import { ref } from 'vue'
import CaptchaField from './CaptchaField.vue'

withDefaults(
  defineProps<{
    title?: string
    tip?: string
    confirmText?: string
    loading?: boolean
    demo?: boolean
  }>(),
  { title: '输入图形验证码', tip: '', confirmText: '确定', loading: false, demo: false },
)

const visible = defineModel<boolean>('visible', { required: true })
const emit = defineEmits<{ confirm: [payload: { captchaId: string; captchaCode: string }] }>()

const captchaRef = ref<InstanceType<typeof CaptchaField>>()
const captchaId = ref('')
const captchaCode = ref('')

function refresh() {
  captchaRef.value?.refresh()
}

defineExpose({ refresh })
</script>

<template>
  <el-dialog v-model="visible" :title="title" width="380px" append-to-body destroy-on-close>
    <p v-if="tip" class="captcha-dialog__tip">{{ tip }}</p>
    <CaptchaField
      ref="captchaRef"
      v-model="captchaCode"
      v-model:captcha-id="captchaId"
      :demo="demo"
    />

    <template #footer>
      <el-button :disabled="loading" @click="visible = false">取消</el-button>
      <el-button
        type="primary"
        :loading="loading"
        :disabled="!captchaCode"
        @click="emit('confirm', { captchaId, captchaCode })"
      >
        {{ confirmText }}
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.captcha-dialog__tip {
  margin: 0 0 12px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--color-text-2);
}
</style>
