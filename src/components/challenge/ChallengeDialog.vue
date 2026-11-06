<script setup lang="ts">
/**
 * 人机验证弹窗（2026-11-05）：按题面 `type` 渲染三选一，答完把结果交回 `useChallenge`。
 *
 * 三档的差别只在「怎么答」，弹窗本身（标题、取消、红字、loading）完全一致 ——
 * 所以这里只做分发，交互细节留给 `SliderPuzzle / PointSelect / ImageCode`。
 *
 * 答错（4009）时**不关窗**：红字贴在题目下面，让用户原地再来一次；
 * 只有票据失效（4010）才由 `useChallenge` 关掉重取，那种情况下重试同一道题毫无意义。
 */
import { computed } from 'vue'
import SliderPuzzle from './SliderPuzzle.vue'
import PointSelect from './PointSelect.vue'
import ImageCode from './ImageCode.vue'
import type { ChallengeAnswerRequest, ChallengeResponse } from '@/types'

const props = defineProps<{
  challenge: ChallengeResponse | null
  submitting?: boolean
  /** 4009 的原文，贴在题目下方 */
  error?: string
}>()

const visible = defineModel<boolean>('visible', { required: true })

const emit = defineEmits<{
  answer: [payload: ChallengeAnswerRequest]
  cancel: []
}>()

const type = computed(() => props.challenge?.type ?? 'IMAGE_CODE')
const payload = computed(() => props.challenge?.payload ?? {})

/** 关窗（点 X、点遮罩、按 Esc）都算取消 —— 不能让它静默关掉却把 Promise 挂着 */
function handleClosed() {
  emit('cancel')
}
</script>

<template>
  <el-dialog
    v-model="visible"
    width="420px"
    append-to-body
    align-center
    destroy-on-close
    class="challenge-dialog"
    :close-on-click-modal="!submitting"
    :close-on-press-escape="!submitting"
    :show-close="!submitting"
    @closed="handleClosed"
  >
    <template #header>
      <div class="challenge-dialog__header">
        <!-- 标题只写「验证」（2026-11-05 用户口径）：不解释目的，也不出现「证明你是真人」这类字眼 -->
        <span class="challenge-dialog__title">验证</span>
      </div>
    </template>

    <div class="challenge-dialog__body">
      <SliderPuzzle
        v-if="type === 'SLIDER_PUZZLE'"
        :payload="payload"
        :submitting="submitting"
        @answer="emit('answer', $event)"
      />
      <PointSelect
        v-else-if="type === 'POINT_SELECT'"
        :payload="payload"
        :submitting="submitting"
        @answer="emit('answer', $event)"
      />
      <ImageCode
        v-else
        :payload="payload"
        :submitting="submitting"
        :error="error"
        @answer="emit('answer', $event)"
      />

      <p v-if="error" class="challenge-dialog__error">{{ error }}</p>
    </div>

    <template #footer>
      <el-button :disabled="submitting" @click="visible = false">取消</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.challenge-dialog__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.challenge-dialog__title {
  font-size: 17px;
  font-weight: 650;
  color: var(--color-text);
}

.challenge-dialog__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
}

/* 红字贴着题目：答错时眼睛正看着题，不必再去找 toast */
.challenge-dialog__error {
  margin: 0;
  font-size: 12.5px;
  color: var(--color-danger);
  text-align: center;
}
</style>
