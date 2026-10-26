<script setup lang="ts">
/**
 * 全局轻量提示（2026-10-27）。
 *
 * 背景：原生 `title` 的显示延迟由浏览器决定（Chrome 约 1 秒，各平台还不一致），
 * 用 CSS / JS 都改不了。要「更快且全局统一」，只能自己接管：
 *   · 鼠标进入 / 键盘聚焦到任意 `[title]` 元素时，把 title 暂存到 `data-tip-text` 并**移除属性**
 *     （移除的瞬间原生气泡就不会再弹），到点后显示自绘气泡；
 *   · 离开、滚动、按 Esc 时恢复 title 并收起气泡 —— 复制、读屏、`aria-label` 都不受影响。
 *
 * 全站只挂这一个实例（App.vue），所以延迟与样式天然统一。
 */
import { nextTick, onMounted, onUnmounted, ref } from 'vue'

/** 统一的显示延迟：比原生（约 1000ms）快，但留出 350ms 避免扫过时乱闪 */
const SHOW_DELAY = 350
/** 气泡与目标元素的间距 */
const OFFSET = 8
/** 键盘聚焦时不再等待：焦点已明确落在该元素上 */
const FOCUS_DELAY = 0

const TIP_KEY = 'tipText'

const visible = ref(false)
const above = ref(false)
const text = ref('')
const left = ref(0)
const top = ref(0)
const bubble = ref<HTMLElement | null>(null)

let timer: number | undefined
let target: HTMLElement | null = null

function clearTimer() {
  if (timer !== undefined) {
    window.clearTimeout(timer)
    timer = undefined
  }
}

function hide() {
  clearTimer()
  visible.value = false
}

/** 把 title 还回去（离场时调用） */
function restore() {
  if (!target) return
  const saved = target.dataset[TIP_KEY]
  if (saved) {
    target.setAttribute('title', saved)
    delete target.dataset[TIP_KEY]
  }
  target = null
}

function place(el: HTMLElement) {
  const rect = el.getBoundingClientRect()
  const height = bubble.value?.offsetHeight ?? 26
  const width = bubble.value?.offsetWidth ?? 0

  // 下方放不下就翻到上方（与系统提示一致的行为）
  above.value = rect.bottom + OFFSET + height > window.innerHeight
  // 贴着窗口左右边缘时往回收，别被裁掉
  left.value = Math.min(
    Math.max(rect.left + rect.width / 2, width / 2 + 8),
    window.innerWidth - width / 2 - 8,
  )
  top.value = above.value ? rect.top - OFFSET : rect.bottom + OFFSET
}

async function reveal(el: HTMLElement, delay: number) {
  clearTimer()
  timer = window.setTimeout(async () => {
    if (target !== el) return
    visible.value = true
    // 先渲染再量气泡尺寸，才能决定放上面还是下面
    await nextTick()
    place(el)
  }, delay)
}

function accept(el: HTMLElement, delay: number) {
  if (el === target) return
  hide()
  restore()

  const saved = el.getAttribute('title')
  if (!saved) return

  el.removeAttribute('title')
  el.dataset[TIP_KEY] = saved
  target = el
  text.value = saved
  void reveal(el, delay)
}

function onPointerOver(event: Event) {
  const node = event.target as HTMLElement | null
  const el = node?.closest?.('[title]') as HTMLElement | null
  if (el) accept(el, SHOW_DELAY)
}

function onPointerOut(event: Event) {
  if (!target) return
  const related = (event as MouseEvent).relatedTarget as Node | null
  if (related && target.contains(related)) return
  hide()
  restore()
}

function onFocusIn(event: Event) {
  const node = event.target as HTMLElement | null
  const el = node?.closest?.('[title]') as HTMLElement | null
  if (el) accept(el, FOCUS_DELAY)
}

function onFocusOut() {
  hide()
  restore()
}

/** 滚动 / 缩放后气泡的位置会失真，直接收起；Esc 同理 */
function onViewportChange() {
  hide()
  restore()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') onViewportChange()
}

onMounted(() => {
  document.addEventListener('mouseover', onPointerOver, true)
  document.addEventListener('mouseout', onPointerOut, true)
  document.addEventListener('focusin', onFocusIn, true)
  document.addEventListener('focusout', onFocusOut, true)
  document.addEventListener('keydown', onKeydown)
  window.addEventListener('scroll', onViewportChange, true)
  window.addEventListener('resize', onViewportChange)
})

onUnmounted(() => {
  document.removeEventListener('mouseover', onPointerOver, true)
  document.removeEventListener('mouseout', onPointerOut, true)
  document.removeEventListener('focusin', onFocusIn, true)
  document.removeEventListener('focusout', onFocusOut, true)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('scroll', onViewportChange, true)
  window.removeEventListener('resize', onViewportChange)
  clearTimer()
  restore()
})
</script>

<template>
  <div
    v-show="visible"
    ref="bubble"
    class="title-tip"
    :class="{ 'title-tip--above': above }"
    :style="{ left: `${left}px`, top: `${top}px` }"
    role="tooltip"
  >
    {{ text }}
  </div>
</template>

<style scoped>
/*
 * 造型沿用系统提示的轻量感：小圆角、12px 字、浅底细边 + 一层柔和阴影，
 * 但不拦截鼠标（pointer-events: none），移过去也不会把气泡「粘住」。
 */
.title-tip {
  position: fixed;
  z-index: 3000;
  max-width: 260px;
  padding: 5px 9px;
  border: 1px solid var(--color-border);
  border-radius: 7px;
  background-color: var(--color-surface);
  color: var(--color-text);
  box-shadow:
    0 6px 18px -8px rgb(0 0 0 / 22%),
    0 2px 6px -2px rgb(0 0 0 / 10%);
  font-size: 12px;
  line-height: 1.45;
  white-space: nowrap;
  /* 超长提示（如完整任务名）不撑破气泡，末尾省略 */
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
  transform: translate(-50%, 0);
}

.title-tip--above {
  transform: translate(-50%, -100%);
}
</style>
