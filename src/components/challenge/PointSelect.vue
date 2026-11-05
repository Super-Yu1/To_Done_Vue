<script setup lang="ts">
/**
 * 点选验证（2026-11-05）：按提示文案的顺序依次点击图上的字，点满即提交。
 *
 * **顺序敏感** —— 服务端按点击先后校验，错一位就是 4009；所以这里只在最后一个点落下时才提交，
 * 中途不让「重来」把已点记录悄悄打乱（要看已点位置，图上的序号会显示）。
 *
 * 坐标按**图片原始尺寸**提交：显示尺寸会被容器缩过，直接用 `offsetX` 会小一圈。
 * 若后端改成按显示尺寸校验，把下面两个 `scale` 改成 1 即可。
 */
import { computed, ref } from 'vue'
import type { ChallengeClick, ChallengePayload } from '@/types'

const props = defineProps<{
  payload: ChallengePayload
  submitting?: boolean
}>()

const emit = defineEmits<{ answer: [payload: { points: ChallengeClick[] }] }>()

const imgSrc = computed(() => (props.payload.image ? `data:image/png;base64,${props.payload.image}` : ''))
const total = computed(() => props.payload.count ?? 1)

const imgRef = ref<HTMLImageElement | null>(null)
const clicks = ref<ChallengeClick[]>([])
/** 已点位置在**显示坐标系**里的圆点（和 clicks 一一对应） */
const marks = ref<{ left: number; top: number }[]>([])

function onClick(event: MouseEvent) {
  const img = imgRef.value
  if (!img || props.submitting || clicks.value.length >= total.value) return

  const rect = img.getBoundingClientRect()
  const ratioX = img.naturalWidth / rect.width
  const ratioY = img.naturalHeight / rect.height
  const localX = event.clientX - rect.left
  const localY = event.clientY - rect.top

  clicks.value = [...clicks.value, { x: Math.round(localX * ratioX), y: Math.round(localY * ratioY) }]
  marks.value = [...marks.value, { left: localX, top: localY }]

  if (clicks.value.length === total.value) {
    emit('answer', { points: clicks.value })
  }
}
</script>

<template>
  <div class="point">
    <p class="point__tip">{{ payload.tip || '请按顺序点击图中的文字' }}</p>

    <div class="point__stage">
      <img ref="imgRef" class="point__img" :src="imgSrc" alt="点选验证" draggable="false" @click="onClick" />
      <span
        v-for="(mark, index) in marks"
        :key="index"
        class="point__mark"
        :style="{ left: `${mark.left}px`, top: `${mark.top}px` }"
      >
        {{ index + 1 }}
      </span>
    </div>

    <p class="point__progress">
      已选 {{ clicks.length }} / {{ total }}
    </p>
  </div>
</template>

<style scoped>
.point {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
}

.point__tip {
  margin: 0;
  font-size: 13px;
  font-weight: 550;
  color: var(--color-text);
  text-align: center;
}

.point__stage {
  position: relative;
  display: inline-block;
  max-width: 100%;
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: crosshair;
  user-select: none;
}

.point__img {
  display: block;
  width: 100%;
  height: auto;
}

/* 已点位置：黄圈 + 序号，一眼看出「点到第几个了」 */
.point__mark {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin: -11px 0 0 -11px;
  border: 2px solid var(--color-accent);
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.92);
  color: var(--color-brand-ink);
  font-size: 11px;
  font-weight: 700;
  pointer-events: none;
}

.point__progress {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-3);
  font-variant-numeric: tabular-nums;
}
</style>
