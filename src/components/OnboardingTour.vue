<script setup lang="ts">
/**
 * 新手漫游（2026-11-01）：聚光灯挖洞 + 一张说明卡，一步一步指出「这屏东西怎么用」。
 *
 * **为什么用 `el-tour` 而不是自绘**：遮罩挖洞、跟随目标定位（floating-ui）、
 * 滚动进视口、Esc 关闭、焦点与 aria 全都是它现成的；自绘那套至少要再写 200 行，
 * 还得自己处理「目标滚出视口 / 窗口缩放 / 目标被遮住」。
 * 我们只做三件它不管的事：**按当前 DOM 过滤步骤**、**下标**、**三个出口**（完成 / 跳过 / Esc）。
 * 皮换成站内那套玻璃卡（样式在 main.css 的 `.el-tour*`，因为浮层 teleport 到 body）。
 *
 * 文案由页面给：本组件不认识「任务」「回收站」，只认「指向哪儿、说几句」。
 */
import { computed, nextTick, ref, watch } from 'vue'
import type { OnboardingStep } from '@/composables/useOnboarding'

const props = defineProps<{
  modelValue: boolean
  steps: OnboardingStep[]
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  /** 走完了最后一步 */
  finish: []
  /** 中途关掉（Esc / 右上角 ×） */
  close: []
}>()

/** 当前第几步；与 `el-tour` 的 `v-model:current` 绑定 */
const current = ref(0)
/**
 * 真正要讲的步骤：打开那一刻按 DOM 过滤过。
 * 比如「这一行点开就编辑」在列表为空时没有目标、「快速录入」在快捷筛选下会被收起 ——
 * 指着一块空地讲解比不讲更糟，所以目标是空的选择器一律跳过（`target` 留空的开场页除外）。
 */
const visibleSteps = ref<OnboardingStep[]>([])

const open = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

/**
 * 最后一次对齐过的目标：收尾时从它往上找滚动容器，把引导期间滚走的距离还回去。
 * 不用「记录我们滚了谁」的写法 —— 最后一步 EP 自己也会先滚一次，那就分不清是谁滚的，
 * 记录法会漏掉；直接「按最后一个目标找回滚动容器」稳得多。
 */
const lastTarget = ref<Element | null>(null)

/** 找「会滚动的那个祖先」（站内就是 `.app-layout__main`，整页不滚、内容区自己滚） */
function nearestScrollable(el: Element | null): Element | null {
  let node = el?.parentElement ?? null
  while (node && node !== document.body) {
    const style = getComputedStyle(node)
    if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) {
      return node
    }
    node = node.parentElement
  }
  return null
}

/**
 * 收尾：把引导期间滚走的列表滚回顶部（2026-11-01 用户口径）。
 * 平滑滚动跟着系统的「减少动效」走 —— 那条偏好只影响 CSS 过渡，JS 的 `behavior` 得自己判断。
 */
function restoreScroll() {
  const container = nearestScrollable(lastTarget.value)
  lastTarget.value = null
  if (!container || container.scrollTop === 0) return
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  container.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
}

/**
 * 打开前先量一遍 DOM：必须在 `nextTick` 之后（弹的时候页面可能刚挂载完，
 * 模板还没落到 DOM 上，`querySelector` 会全部落空）。
 */
// `immediate` 是必须的：调用方若一挂载就是「打开」状态（初始值 true），
// 不立即跑一次的话 `visibleSteps` 永远是空数组 —— 卡片会弹出来但一个字都没有。
watch(
  () => props.modelValue,
  async (visible) => {
    if (!visible) return
    await Promise.resolve()
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    visibleSteps.value = props.steps.filter(
      (step) => !step.target || document.querySelector(step.target),
    )
    current.value = 0
  },
  { immediate: true },
)

/**
 * 每换一步都「把目标滚到位 + 让 EP 重新量一次位置」（2026-11-01 修最后一步不显示）。
 *
 * 为什么需要：EP 的 `useTarget` 只在 `[open, target]` 变化与 **window resize** 时重算位置，
 * 而重算的实现是「必要时 `scrollIntoView` → 紧接着 `getBoundingClientRect()`」。
 * 目标一旦需要滚动才看得见（最后一步的「快速录入」在列表最底部），它量到的是**滚动前/滚动途中**
 * 的位置 —— 高亮挖洞与卡片都停在半路，用户看到的就是「卡片不见了、高亮落在别的行上，
 * 只有缩放窗口才归位」（缩放正好触发它那条 resize 重算）。
 * 这里自己先把目标滚进视口，再派发一次 resize 让它按最终位置重算 —— 与手动缩放同一个入口。
 */
async function syncPositionWithTarget() {
  const index = current.value
  const step = visibleSteps.value[index]
  const el = step?.target ? document.querySelector(step.target) : null
  if (!el) return

  const align = () => {
    // 连点「下一步」时，上一轮排的补量要作废：否则会把**上一步**的目标又滚回来、并重算一次位置
    if (!open.value || current.value !== index) return
    lastTarget.value = el
    el.scrollIntoView({ block: 'center' })
    window.dispatchEvent(new Event('resize'))
  }

  align()
  await nextTick()
  align()
  /*
   * 再补一帧 + 一次延时：切步那一帧里列表还没滚到最终位置（`scrollIntoView` 被钳制在当时的
   * 可滚动高度内，下一帧高度才涨到位），只量一次会「差一点」—— 表现为高亮洞和卡片整体偏上一截。
   * 这两次是幂等的：位置已经对了就什么都不动。
   */
  requestAnimationFrame(align)
  window.setTimeout(align, 120)
}

function handleClose() {
  open.value = false
  restoreScroll()
  emit('close')
}

function handleFinish() {
  open.value = false
  restoreScroll()
  emit('finish')
}
</script>

<template>
  <!--
    ⚠ `scroll-into-view-options` **不能用 `behavior: 'smooth'`**（2026-11-01 修）：
    EP 的实现是 `target.scrollIntoView(...)` 之后**同一帧立刻** `getBoundingClientRect()`
    （见 element-plus 的 tour/helper.mjs）。平滑滚动还没走完，量到的是滚动前的位置 ——
    于是「最后一步（快速录入）」这种必须滚动才能看到的步骤，卡片被摆到视口外、遮罩洞也留在原处，
    只有缩放窗口触发它内部的 resize 重算才归位。改成瞬时滚动，量到的就是最终位置。
  -->
  <el-tour
    v-model="open"
    v-model:current="current"
    :mask="true"
    :gap="{ offset: 8, radius: 16 }"
    :z-index="2600"
    :scroll-into-view-options="{ block: 'center' }"
    :close-on-press-escape="true"
    @change="syncPositionWithTarget"
    @close="handleClose"
    @finish="handleFinish"
  >
    <el-tour-step
      v-for="(step, index) in visibleSteps"
      :key="`${index}-${step.target}`"
      :target="step.target || null"
      :title="step.title"
      :placement="step.placement ?? 'bottom'"
    >
      <p class="onboarding-step__desc">{{ step.description }}</p>
      <p class="onboarding-step__count">第 {{ index + 1 }} / {{ visibleSteps.length }} 步</p>
    </el-tour-step>
  </el-tour>
</template>

<style scoped>
/*
 * 卡片里的正文与步数。这两块是我们自己写的元素，scoped 属性会跟着它走进浮层，所以能直接写在这里；
 * 卡片本身（底色 / 圆角 / 宽度 / 按钮）是 `el-tour` 的内部结构，样式统一放在 main.css。
 */
.onboarding-step__desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.75;
  color: var(--color-text-2);
}

.onboarding-step__count {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--color-text-3);
  font-variant-numeric: tabular-nums;
}
</style>
