<script setup lang="ts">
/**
 * 图形验证码字段（3.2 / 6.5 ①，交互见 8.8）：
 * 4 位字符、有效期 120 秒、一次机会；图片点击即刷新，校验失败后由调用方再次 refresh。
 * demo 为真时不请求后端，改由本地生成一张验证码，交互与真实一致（8.6）。
 */
import { computed, onMounted, ref } from 'vue'
import { getCaptcha } from '@/api/verify'
import { createDemoCaptcha } from '@/mock/demoCaptcha'

const props = withDefaults(defineProps<{ demo?: boolean }>(), { demo: false })

const code = defineModel<string>({ required: true })
const captchaId = defineModel<string>('captchaId', { required: true })

const image = ref('')
const loading = ref(false)

/** 后端下发 Base64 图；未带 data URI 前缀时补上，避免 img 直接渲染失败 */
const imageSrc = computed(() => {
  if (!image.value) return ''
  return image.value.startsWith('data:') ? image.value : `data:image/png;base64,${image.value}`
})

async function refresh() {
  loading.value = true
  try {
    const result = props.demo ? createDemoCaptcha() : await getCaptcha()
    image.value = result.image
    captchaId.value = result.captchaId
    code.value = ''
  } catch {
    // 获取失败已由 http 层提示，保留当前图片，用户可再点一次
  } finally {
    loading.value = false
  }
}

onMounted(refresh)
defineExpose({ refresh })
</script>

<template>
  <div class="captcha-field">
    <el-input v-model="code" placeholder="图形验证码" maxlength="4" autocomplete="off" />
    <button
      class="captcha-field__image"
      type="button"
      title="看不清？点击刷新"
      :disabled="loading"
      @click="refresh"
    >
      <img v-if="imageSrc" :src="imageSrc" alt="图形验证码" />
      <span v-else class="text-3">点击获取</span>
    </button>
  </div>
</template>

<style scoped>
.captcha-field {
  display: flex;
  gap: 8px;
  width: 100%;
}

.captcha-field :deep(.el-input) {
  flex: 1;
}

.captcha-field__image {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 120px;
  height: 32px;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-text-3);
  font-size: 12px;
  cursor: pointer;
}

.captcha-field__image:disabled {
  cursor: progress;
}

.captcha-field__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
