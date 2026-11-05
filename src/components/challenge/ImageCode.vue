<script setup lang="ts">
/**
 * 图形码（2026-11-05）：看图填 4 位字符，回车或点确认提交。
 *
 * 这是三档验证里最高的一档（后台登录固定用它）。答案由服务端校验、**大小写不敏感**，
 * 所以这里不做任何本地格式校验，错了就让 4009 的红字回来说话。
 */
import { computed, nextTick, onMounted, ref } from 'vue'
import type { ChallengePayload } from '@/types'

const props = defineProps<{
  payload: ChallengePayload
  submitting?: boolean
  /** 上一次答错的提示：清空输入并把焦点收回来，方便直接重打 */
  error?: string
}>()

const emit = defineEmits<{ answer: [payload: { code: string }] }>()

const imgSrc = computed(() => (props.payload.image ? `data:image/png;base64,${props.payload.image}` : ''))
const code = ref('')
const inputRef = ref<{ focus: () => void } | null>(null)

function submit() {
  const value = code.value.trim()
  if (!value || props.submitting) return
  emit('answer', { code: value })
}

onMounted(() => {
  void nextTick(() => inputRef.value?.focus())
})

// 答错时清空并聚焦：4 位而已，重打比「改一个字」快
defineExpose({ reset: () => (code.value = '') })
</script>

<template>
  <div class="image-code">
    <img class="image-code__img" :src="imgSrc" alt="图形验证码" draggable="false" />

    <div class="image-code__row">
      <el-input
        ref="inputRef"
        v-model="code"
        class="image-code__input"
        maxlength="6"
        placeholder="输入图中的字符"
        autocomplete="off"
        @keyup.enter="submit"
      />
      <el-button type="primary" :loading="submitting" @click="submit">验证</el-button>
    </div>

    <p class="image-code__hint">不区分大小写</p>
  </div>
</template>

<style scoped>
.image-code {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.image-code__img {
  display: block;
  width: 100%;
  max-width: 220px;
  height: auto;
  border-radius: var(--radius-md);
  background-color: var(--color-hover);
}

.image-code__row {
  display: flex;
  gap: 8px;
  width: 100%;
}

.image-code__input {
  flex: 1;
}

.image-code__hint {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-3);
}
</style>
