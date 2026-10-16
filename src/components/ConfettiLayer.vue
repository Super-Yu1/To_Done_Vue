<script setup lang="ts">
/**
 * 粒子层（认证页左栏彩蛋 + 演示模式「全部划掉」共用，2026-10-16 抽成一个组件）：
 * 通过模板 ref 调 `fire(簇数)` 触发；爆点位置由百分比给（相对本层），
 * 层自带裁剪与 `pointer-events: none`，动画结束（2.2s）整层 DOM 清掉、计时器随卸载清理。
 *
 * 放在哪：**父元素要有 `position: relative`** —— 本层 `inset: 0` 铺满它，粒子飞不出这个盒子，
 * 所以不会有一颗粒子飘到别的区域上。
 */
import { onUnmounted, ref } from 'vue'

interface Particle {
  angle: number
  dist: number
  dur: number
  size: number
  tone: 'done' | 'ink'
}

interface Burst {
  id: number
  x: number
  y: number
  particles: Particle[]
}

/** 最长一颗粒子的飞行时长上取整：到点就把整层撤掉（与下方 keyframes 对齐） */
const CONFETTI_MS = 2200
/** 八个爆点，都落在中部 —— 不随机到边上，飞得远的粒子也留在这个盒子里 */
const SPOTS = [
  { x: 30, y: 30 },
  { x: 48, y: 26 },
  { x: 66, y: 34 },
  { x: 38, y: 46 },
  { x: 58, y: 52 },
  { x: 32, y: 64 },
  { x: 52, y: 68 },
  { x: 66, y: 60 },
]

const bursts = ref<Burst[]>([])
const timers: number[] = []
let seq = 0

onUnmounted(() => {
  timers.forEach((id) => window.clearTimeout(id))
  timers.length = 0
})

/** 每簇十来颗：内圈 34~56px、外圈 78~132px 交替，才像炸开而不是一个圆环 */
function build(count: number): Burst[] {
  const jitter = () => Math.random() * 6 - 3
  return SPOTS.slice(0, count).map((spot) => ({
    id: (seq += 1),
    x: spot.x + jitter(),
    y: spot.y + jitter(),
    particles: Array.from({ length: 12 }, (_, index) => ({
      angle: index * 30 + Math.random() * 14,
      dist: index % 2 === 0 ? 34 + Math.random() * 22 : 78 + Math.random() * 54,
      dur: 1100 + Math.random() * 700,
      size: index % 5 === 0 ? 8 : index % 2 === 0 ? 6 : 4,
      // 绿色代表「完成」，深灰代表「任务本身」，两者交错
      tone: index % 3 === 1 ? 'ink' : 'done',
    })),
  }))
}

/** 放一簇粒子；`count` 给 5（克制）或 8（首次） */
function fire(count = 8) {
  bursts.value = build(Math.min(count, SPOTS.length))
  timers.push(
    window.setTimeout(() => {
      bursts.value = []
    }, CONFETTI_MS),
  )
}

defineExpose({ fire })
</script>

<template>
  <div v-if="bursts.length" class="confetti" aria-hidden="true">
    <span
      v-for="burst in bursts"
      :key="burst.id"
      class="confetti__burst"
      :style="{ left: `${burst.x}%`, top: `${burst.y}%` }"
    >
      <i
        v-for="(particle, index) in burst.particles"
        :key="index"
        class="confetti__dot"
        :class="`confetti__dot--${particle.tone}`"
        :style="{
          '--angle': `${particle.angle}deg`,
          '--dist': `${particle.dist}px`,
          '--dur': `${particle.dur}ms`,
          '--size': `${particle.size}px`,
        }"
      />
    </span>
  </div>
</template>

<style scoped>
.confetti {
  position: absolute;
  inset: 0;
  z-index: 5;
  overflow: hidden;
  pointer-events: none;
}

.confetti__burst {
  position: absolute;
  width: 0;
  height: 0;
}

.confetti__dot {
  position: absolute;
  /* 尺寸由 JS 给（核心 8px / 中间 6px / 火花 4px） */
  width: var(--size);
  height: var(--size);
  margin: calc(var(--size) / -2) 0 0 calc(var(--size) / -2);
  border-radius: var(--radius-pill);
  background-color: var(--color-status-done);
  animation: confetti-fly var(--dur) cubic-bezier(0.2, 0.7, 0.3, 1) forwards;
}

/* 深灰的那几颗代表「任务本身」，与完成态的绿交错 */
.confetti__dot--ink {
  background-color: var(--color-text);
}

@keyframes confetti-fly {
  0% {
    opacity: 1;
    transform: rotate(var(--angle)) translateX(4px) scale(1);
  }
  70% {
    opacity: 0.9;
  }
  100% {
    opacity: 0;
    transform: rotate(var(--angle)) translateX(var(--dist)) scale(0.35);
  }
}

/* 系统「减少动效」：装饰性动画整层不出现（文案与提示照旧） */
@media (prefers-reduced-motion: reduce) {
  .confetti {
    display: none;
  }
}
</style>
