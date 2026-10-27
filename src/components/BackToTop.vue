<script setup lang="ts">
/**
 * 回到顶部（任务 / 回收站右下角）：滚过一屏左右才浮出来，点一下回到顶部。
 * 只挂在长列表页，不做全局挂载——设置类页面本身不需要它。
 * 减少动效（系统偏好）时平滑滚退化为瞬移：动画由全局 --dur-base 归零负责，
 * 滚动的 behavior 得在这里单独判断（CSS 管不到 scrollTo）。
 */
import { onMounted, onUnmounted, ref } from 'vue'
import AppIcon from './AppIcon.vue'

/** 出现门槛：页面往下滚过这么多像素才浮出来，避免刚滚动就抢视线 */
const SHOW_AFTER = 400

const visible = ref(false)

/**
 * 滚的是谁：桌面骨架里滚的是内容区自己（`.app-layout__main`，外壳 `overflow: hidden`、
 * 整页不滚），窄屏折行后才滚窗口 —— 这里取「真的能滚的那个」，两种骨架都成立。
 */
function activeScroller(): HTMLElement | null {
  const el = document.querySelector<HTMLElement>('.app-layout__main')
  return el && el.scrollHeight > el.clientHeight + 1 ? el : null
}

function currentTop(): number {
  const el = activeScroller()
  return el ? el.scrollTop : window.scrollY
}

function onScroll() {
  visible.value = currentTop() > SHOW_AFTER
}

function scrollToTop() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const behavior: ScrollBehavior = reduced ? 'auto' : 'smooth'
  const el = activeScroller()
  if (el) el.scrollTo({ top: 0, behavior })
  else window.scrollTo({ top: 0, behavior })
}

onMounted(() => {
  onScroll() // 带着滚动位置进这个页面时，先对齐一次状态
  // scroll 不冒泡，但**捕获阶段**能从任意后代收到 —— 内滚动容器与窗口一次覆盖
  document.addEventListener('scroll', onScroll, { passive: true, capture: true })
  window.addEventListener('scroll', onScroll, { passive: true })
})

onUnmounted(() => {
  document.removeEventListener('scroll', onScroll, { capture: true })
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <el-tooltip content="回到顶部" placement="top">
    <button
      class="back-to-top"
      :class="{ 'is-visible': visible }"
      type="button"
      aria-label="回到顶部"
      :aria-hidden="!visible"
      :tabindex="visible ? 0 : -1"
      @click="scrollToTop"
    >
      <AppIcon name="up" :size="17" />
    </button>
  </el-tooltip>
</template>

<style scoped>
/*
 * 位置（2026-10-27 定稿）：**任务行右侧空白带的正中**。
 * 空白带 = 页面左右内边距（clamp 16~40）+ 外壳左右内边距（--sidebar-offset 24），
 * 按钮宽 34，`right` 取 (带宽 - 34) / 2，于是两侧留白始终相等、随窗口自适应。
 * 层级压在弹窗遮罩（2000+）之下、内容之上；顶栏是 sticky z-index: 10，两者不重叠。
 */
.back-to-top {
  /*
   * 2026-10-27 定稿位置：**贴在任务行右侧的空白带正中，且不被滚动容器裁切**。
   * 为什么不用 sticky + translateX：按钮是 .page 的子元素，右移后会超出
   * `.app-layout__main` 的横向范围，而它 `overflow-y: auto`（按规范横向也算 auto），
   * 多出来的部分会被裁掉 —— 这正是「按钮被挡住一半」的原因。
   * 改成 fixed 后脱离滚动容器的裁切；`right` 仍按「页面内边距 + 外壳内边距」推算，
   * 于是两侧留白相等、随窗口宽度自适应。
   */
  position: fixed;
  right: calc((clamp(16px, 2.5vw, 40px) + var(--sidebar-offset) - 34px) / 2);
  /* 2026-10-27：离底边再抬一个按钮直径（24 → 58），按钮不再贴边 */
  bottom: 58px;
  z-index: 10;
  transform: translateY(6px);

  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;

  border: 1px solid var(--glass-border);
  border-radius: var(--radius-pill);
  background-color: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  color: var(--color-text-2);
  cursor: pointer;

  /* 未出现时不占交互：只留一点点位移，浮出时像"从下沿升起" */
  opacity: 0;
  pointer-events: none;
  transition:
    opacity var(--dur-base) var(--ease),
    transform var(--dur-base) var(--ease),
    color var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease);
}

.back-to-top.is-visible {
  opacity: 1;
  pointer-events: auto;
  transform: none;
}

.back-to-top:hover {
  /* 玻璃件悬停只擦亮自己，不换描边色 */
  background-color: var(--glass-bg-hover);
  color: var(--color-text);
}
</style>
