<script setup lang="ts">
/**
 * 分段控件（2026-11-02 从 `FilterBar` 抽出，两处共用）：
 * 选中态是一块**独立的白色滑块**，换选项时在按钮之间滑过去（transform 过渡），
 * 比原地闪现更像一个控件。位置 / 宽高靠量当前按钮的 `offset*` 得出 ——
 * 与侧栏导航的浮块、任务弹窗里的优先级滑块是同一套做法。
 *
 * 现在两处在用：
 *   · 前台筛选栏的「未完成 / 已完成 / 全部」（默认档）；
 *   · 后台「登录审计」的「管理员 / 用户」（`size="small"`）。
 * 以前这段是写死在 `FilterBar` 里的，后台要同一种手感就只能复制一遍 —— 那才是真正会走样的地方。
 */
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    items: { value: string; label: string }[]
    modelValue: string
    /** 无障碍名称（读屏用），如「任务状态」「登录方」 */
    ariaLabel?: string
    /** `small` 是后台工具栏那一档（30 高 / 13 号字），默认是前台的 34 / 14 */
    size?: 'normal' | 'small'
  }>(),
  { ariaLabel: '切换', size: 'normal' },
)

const emit = defineEmits<{ 'update:modelValue': [string] }>()

const trackRef = ref<HTMLElement | null>(null)
/** 按钮元素按渲染顺序收集；普通数组即可，不参与响应式 */
const btnEls: HTMLElement[] = []
const indicator = reactive({ left: 0, top: 0, width: 0, height: 0, visible: false })
/** 首帧先摆好位置再打开过渡，避免从 (0,0) 滑进来 */
const ready = ref(false)

function setBtnRef(el: unknown, index: number) {
  if (el instanceof HTMLElement) btnEls[index] = el
}

async function updateIndicator() {
  // 等 active 类落到 DOM 上再量（字重 400 → 600 会改变按钮宽度）
  await nextTick()
  const index = props.items.findIndex((item) => item.value === props.modelValue)
  const el = btnEls[index]
  if (!el) {
    indicator.visible = false
    return
  }
  indicator.left = el.offsetLeft
  indicator.top = el.offsetTop
  indicator.width = el.offsetWidth
  indicator.height = el.offsetHeight
  indicator.visible = true
  if (!ready.value) {
    requestAnimationFrame(() => {
      ready.value = true
    })
  }
}

const indicatorStyle = computed(() => ({
  transform: `translate(${indicator.left}px, ${indicator.top}px)`,
  width: `${indicator.width}px`,
  height: `${indicator.height}px`,
  opacity: indicator.visible ? 1 : 0,
}))

watch(
  () => props.modelValue,
  () => void updateIndicator(),
)

// 选项本身变了（比如权限不同、后台换了筛选维度）也要重新量
watch(
  () => props.items,
  () => void updateIndicator(),
  { deep: true },
)

let observer: ResizeObserver | undefined

onMounted(() => {
  // 容器尺寸变了（换行、字体加载、窗口缩放）也要重新量
  if (trackRef.value) {
    observer = new ResizeObserver(() => void updateIndicator())
    observer.observe(trackRef.value)
  }
  void updateIndicator()
})

onUnmounted(() => observer?.disconnect())
</script>

<template>
  <div
    ref="trackRef"
    class="seg"
    :class="{ 'seg--small': size === 'small' }"
    role="tablist"
    :aria-label="ariaLabel"
  >
    <!-- 白色滑块：位置 / 宽高 / 底色由 JS 给出，换选项时滑过去 -->
    <span
      class="seg__indicator"
      :class="{ 'seg__indicator--ready': ready }"
      :style="indicatorStyle"
      aria-hidden="true"
    />

    <button
      v-for="(item, index) in items"
      :key="item.value"
      :ref="(el) => setBtnRef(el, index)"
      class="seg__btn"
      :class="{ 'seg__btn--active': modelValue === item.value }"
      type="button"
      role="tab"
      :aria-selected="modelValue === item.value"
      @click="emit('update:modelValue', item.value)"
    >
      {{ item.label }}
    </button>
  </div>
</template>

<style scoped>
.seg {
  position: relative;
  display: flex;
  flex: none;
  align-items: center;
  gap: 2px;
  padding: 4px;
  border-radius: var(--radius-pill);
  background-color: var(--seg-track-bg);
}

.seg__btn {
  position: relative;
  z-index: 1;
  height: 34px;
  padding: 0 17px;
  border: none;
  border-radius: var(--radius-pill);
  background-color: transparent;
  color: var(--color-text-2);
  font-size: 14px;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  /* 白底与阴影交给滑块，按钮自己只管文字颜色 */
  transition: color var(--dur-fast) var(--ease);
}

.seg__btn--active {
  color: var(--color-brand-ink);
  font-weight: 600;
}

/* 滑块：位置由 `transform` 过渡，宽高同步跟着目标按钮走（字重变化会改宽度） */
.seg__indicator {
  position: absolute;
  top: 0;
  left: 0;
  border-radius: var(--radius-pill);
  background-color: var(--seg-thumb-bg);
  box-shadow: var(--seg-thumb-shadow);
  opacity: 0;
}

.seg__indicator--ready {
  transition:
    transform 280ms cubic-bezier(0.22, 1, 0.36, 1),
    width 280ms cubic-bezier(0.22, 1, 0.36, 1),
    height 280ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 160ms var(--ease);
}

/* 紧凑档：后台工具栏里和 40 高的搜索井并排，34 会显得高一头 */
.seg--small .seg__btn {
  height: 30px;
  padding: 0 14px;
  font-size: 13px;
}
</style>
