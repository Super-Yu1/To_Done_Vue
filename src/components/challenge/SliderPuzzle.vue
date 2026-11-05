<script setup lang="ts">
/**
 * 滑块拼图（2026-11-05）：把拼图块拖到背景图的缺口上，松手即提交。
 *
 * 服务端不只看终点，还要看**轨迹像不像人**：
 *   · `trail` 至少 8 个点、`durationMs` 在 300~8000ms 之间、相邻两点位移不超过 80px；
 *   · 任何一个不满足都会被判 4009「不是人拖的」。
 * 所以这里不能只记起止两点：`pointermove` 每来一次就采一个点，并把两位移之间的大跳**插值补齐**
 * （快速甩动时浏览器可能一次移动就跨过上百像素，不补点就必然触发 80px 那条）。
 */
import { computed, ref } from 'vue'
import type { ChallengeAnswerRequest, ChallengePayload } from '@/types'

const props = defineProps<{
  payload: ChallengePayload
  submitting?: boolean
}>()

const emit = defineEmits<{ answer: [ChallengeAnswerRequest] }>()

/** 相邻采样点的最大位移（px）：超过就补点，这条是服务端的硬阈值 */
const MAX_STEP = 40

const bgSrc = computed(() => (props.payload.background ? `data:image/png;base64,${props.payload.background}` : ''))
const pieceSrc = computed(() => (props.payload.piece ? `data:image/png;base64,${props.payload.piece}` : ''))

/** 拼图块初始纵向位置（px），横向从 0 开始拖 */
const startY = computed(() => props.payload.y ?? 0)
/** 背景图宽度即坐标系宽度；容器按它定宽，拖动位移就直接是后端要的 `x` */
const trackWidth = computed(() => props.payload.width ?? 280)

const offset = ref(0)
const dragging = ref(false)

let originX = 0
let baseOffset = 0
let startedAt = 0
let trail: [number, number][] = []

function pushPoint(x: number) {
  const t = Math.round(performance.now() - startedAt)
  const last = trail[trail.length - 1]
  if (!last) {
    trail.push([t, Math.round(x)])
    return
  }
  // 补点：两次 move 之间跨得太大时，按 MAX_STEP 均分成若干中间点
  const dx = x - last[1]
  const steps = Math.floor(Math.abs(dx) / MAX_STEP)
  for (let i = 1; i <= steps; i += 1) {
    trail.push([t - Math.round(((steps - i) * 16) / steps), Math.round(last[1] + (dx * i) / (steps + 1))])
  }
  trail.push([t, Math.round(x)])
}

function start(event: PointerEvent) {
  if (props.submitting) return
  dragging.value = true
  originX = event.clientX
  baseOffset = offset.value
  startedAt = performance.now()
  trail = []
  pushPoint(offset.value)
  ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
}

function move(event: PointerEvent) {
  if (!dragging.value) return
  const next = Math.min(trackWidth.value, Math.max(0, baseOffset + event.clientX - originX))
  offset.value = next
  pushPoint(next)
}

function end() {
  if (!dragging.value) return
  dragging.value = false
  const durationMs = Math.round(performance.now() - startedAt)
  pushPoint(offset.value)

  // 兜底：快速一点没动就松手时点数可能不足，补够 8 个（后端硬要求）
  while (trail.length < 8) {
    trail.push([durationMs, Math.round(offset.value)])
  }
  emit('answer', {
    x: Math.round(offset.value),
    trail: trail.slice(0, 200),
    durationMs,
  })
}
</script>

<template>
  <div class="slider">
    <div
      class="slider__stage"
      :style="{ width: `${trackWidth}px` }"
      @pointerdown.prevent="start"
      @pointermove.prevent="move"
      @pointerup="end"
      @pointercancel="end"
    >
      <img class="slider__bg" :src="bgSrc" alt="滑块背景" draggable="false" />
      <!-- 拼图块：只跟着横向位移走，纵向固定在后端给的 `y` -->
      <img
        class="slider__piece"
        :src="pieceSrc"
        alt=""
        draggable="false"
        :style="{ transform: `translate(${offset}px, ${startY}px)` }"
      />
      <div class="slider__track">
        <div class="slider__fill" :style="{ width: `${offset + 28}px` }" />
        <div class="slider__handle" :style="{ transform: `translateX(${offset}px)` }" aria-hidden="true">
          ⇢
        </div>
      </div>
    </div>
    <p class="slider__hint">按住滑块拖到缺口处，松手验证</p>
  </div>
</template>

<style scoped>
.slider {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
}

.slider__stage {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-md);
  background-color: var(--color-hover);
  /* 竖屏下不要超出弹窗 */
  max-width: 100%;
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.slider__stage:active {
  cursor: grabbing;
}

.slider__bg {
  display: block;
  width: 100%;
  height: auto;
}

.slider__piece {
  position: absolute;
  top: 0;
  left: 0;
  width: 48px;
  height: 48px;
  border-radius: var(--radius-sm);
  filter: drop-shadow(0 2px 6px rgba(17, 24, 39, 0.35));
  pointer-events: none;
}

/* 底部滑轨：给「可拖动」一个明确的落点，而不是让人对着图片猜 */
.slider__track {
  position: relative;
  height: 36px;
  margin: 10px 8px 8px;
  border-radius: var(--radius-pill);
  background-color: var(--seg-track-bg);
  overflow: hidden;
}

.slider__fill {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  background-color: color-mix(in srgb, var(--color-accent) 26%, transparent);
}

.slider__handle {
  position: absolute;
  top: 3px;
  left: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 30px;
  border-radius: var(--radius-pill);
  background-color: var(--seg-thumb-bg);
  box-shadow: var(--seg-thumb-shadow);
  color: var(--color-text-2);
  font-size: 15px;
}

.slider__hint {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-3);
}
</style>
