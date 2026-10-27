<script setup lang="ts">
/**
 * 筛选与动作（2026-10-18 按设计稿改为双行工具栏）：
 * ① 上方：灰色长搜索框（占满剩余宽度）+ 页面主操作（新建任务）；
 * ② 下方：左侧状态分段控件，右侧「排序 ▾」与「批量选择」文字按钮（选择模式下换成批量操作条 + 退出选择）。
 * 排序仍是「字段 + 方向」两件独立的事，只是收进同一个极简下拉面板里：
 * 字段决定按什么排，方向决定正序 / 倒序；空字段 = 不传参、沿用后端固定规则。
 * query 由调用方持有（真实页来自 todo store、演示页来自本地内存态），按 8.3 直接改它的字段。
 */
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import { SEARCH_DEBOUNCE_MS } from '@/constants'
import type { TaskQuery } from '@/types'

const props = defineProps<{ query: TaskQuery; selectMode?: boolean }>()
/**
 * change = 「筛选条件变化，请从第 1 页重取」；
 * toggle-select = 「进入 / 退出批量选择」（由调用方按 selectMode 决定方向）。
 */
const emit = defineEmits<{ change: []; 'toggle-select': [] }>()

/**
 * 退出选择时右侧「晚一步」（2026-10-27）：
 * 批量操作条要向右滑 300ms，如果「排序 ▾ / 批量选择」在同一帧就换回来，
 * 两块内容会在同一处交叠 —— 看着就是闪一下。让**关闭**晚 320ms 生效、打开立即生效。
 */
const visualSelectMode = ref(Boolean(props.selectMode))
let modeTimer: number | undefined

watch(
  () => props.selectMode,
  (value) => {
    window.clearTimeout(modeTimer)
    if (value) {
      visualSelectMode.value = true
      return
    }
    modeTimer = window.setTimeout(() => {
      visualSelectMode.value = false
    }, 320)
  },
  { immediate: true },
)

onUnmounted(() => window.clearTimeout(modeTimer))

/** 分段控件的 value 统一用字符串：`unfinished` / `DONE` / `all`，再映射回查询字段 */
const ALL = 'all'

/**
 * 页签顺序：**未完成 → 已完成 → 全部**。
 * 「全部」退到最后 —— 日常最常看的是「还没做完的」，默认也停在这里（见 store / useDemoTasks 的初始 status）。
 */
/**
 * 页签（2026-10-26 修）：「未完成」= **非 DONE**（TODO + IN_PROGRESS），走 `onlyUnfinished`。
 * 原来这一档发的是 `status=TODO`，把 IN_PROGRESS 的任务藏了起来 ——
 * 于是出现「统计写已完成 22 / 共 24，列表却只剩 1 条」，差的正是那 1 条 IN_PROGRESS。
 */
const TAB_UNFINISHED = 'unfinished'
const tabs = [
  { value: TAB_UNFINISHED, label: '未完成' },
  { value: 'DONE', label: '已完成' },
  { value: ALL, label: '全部' },
]

/**
 * 排序字段（2026-10-18 定稿）：优先级 / 创建时间 / 截止时间（默认）/ 完成时间。
 * 方向不放在字段里，由面板底部的「正序 / 倒序」切换。
 */
const SORT_OPTIONS = [
  { value: 'priority', label: '优先级' },
  { value: 'recordedAt', label: '创建时间' },
  { value: 'dueDate', label: '截止时间' },
  { value: 'completedAt', label: '完成时间' },
]

const sortOpen = ref(false)

function pickSort(value: string) {
  props.query.sortBy = value as TaskQuery['sortBy']
  // 换字段时保留用户当前选的方向；没设过就按默认升序
  props.query.sortDirection = props.query.sortDirection ?? 'asc'
  emit('change')
}

/** 正序 = asc。默认升序（截止时间近 → 远） */
const isAsc = computed(() => props.query.sortDirection !== 'desc')

function setDirection(direction: 'asc' | 'desc') {
  props.query.sortDirection = direction
  emit('change')
}

const activeTab = computed({
  get: () => {
    if (props.query.onlyUnfinished) return TAB_UNFINISHED
    return props.query.status === 'DONE' ? 'DONE' : ALL
  },
  set: (value: string) => {
    props.query.onlyUnfinished = value === TAB_UNFINISHED ? true : undefined
    props.query.status = value === 'DONE' ? 'DONE' : undefined
    emit('change')
  },
})

let debounceTimer: number | undefined

watch(
  () => props.query.keyword,
  () => {
    window.clearTimeout(debounceTimer)
    debounceTimer = window.setTimeout(() => emit('change'), SEARCH_DEBOUNCE_MS)
  },
)

/* ---------- 分段控件的白色滑块（2026-10-27） ---------- */

/**
 * 选中态的「白底 + 阴影」不再挂在按钮上，而是交给一块独立滑块：
 * 切页签时它在三个按钮之间**滑过去**（transform 过渡），比原地闪现更像一个控件。
 * 位置 / 宽高靠量当前按钮的 `offset*` 得出 —— 与侧栏导航的浮块是同一套做法。
 */
const tabsRef = ref<HTMLElement | null>(null)
/** 按钮元素按渲染顺序收集；普通数组即可，不参与响应式 */
const tabEls: HTMLElement[] = []
const indicator = reactive({ left: 0, top: 0, width: 0, height: 0, visible: false })
/** 首帧先摆好位置再打开过渡，避免从 (0,0) 滑进来 */
const indicatorReady = ref(false)

function setTabRef(el: unknown, index: number) {
  if (el instanceof HTMLElement) tabEls[index] = el
}

async function updateIndicator() {
  // 等 active 类落到 DOM 上再量（字重 400 → 600 会改变按钮宽度）
  await nextTick()
  const index = tabs.findIndex((tab) => tab.value === activeTab.value)
  const el = tabEls[index]
  if (!el) {
    indicator.visible = false
    return
  }
  indicator.left = el.offsetLeft
  indicator.top = el.offsetTop
  indicator.width = el.offsetWidth
  indicator.height = el.offsetHeight
  indicator.visible = true
  if (!indicatorReady.value) {
    requestAnimationFrame(() => {
      indicatorReady.value = true
    })
  }
}

const indicatorStyle = computed(() => ({
  transform: `translate(${indicator.left}px, ${indicator.top}px)`,
  width: `${indicator.width}px`,
  height: `${indicator.height}px`,
  opacity: indicator.visible ? 1 : 0,
}))

watch(activeTab, () => void updateIndicator())

let tabsObserver: ResizeObserver | undefined

onMounted(() => {
  // 容器尺寸变了（换行、字体加载、窗口缩放）也要重新量
  if (tabsRef.value) {
    tabsObserver = new ResizeObserver(() => void updateIndicator())
    tabsObserver.observe(tabsRef.value)
  }
  void updateIndicator()
})

onUnmounted(() => {
  window.clearTimeout(debounceTimer)
  tabsObserver?.disconnect()
})
</script>

<template>
  <div class="filter-bar">
    <!-- 第一行：搜索占满剩余宽度，右侧只留页面主操作（新建任务） -->
    <div class="filter-bar__row">
      <el-input v-model="query.keyword" class="filter-bar__search" placeholder="搜索标题或描述" clearable>
        <template #prefix>
          <AppIcon name="search" />
        </template>
      </el-input>

      <div v-if="$slots.actions" class="filter-bar__actions">
        <slot name="actions" />
      </div>
    </div>

    <!-- 第二行：左状态切换；右侧排序、批量选择与批量操作条 -->
    <div
      class="filter-bar__row filter-bar__row--tabs"
      :class="{ 'filter-bar__row--tabs-center': $slots['tabs-center'] }"
    >
      <div ref="tabsRef" class="filter-bar__tabs" role="tablist" aria-label="任务状态">
        <!-- 白色滑块：位置 / 宽高由 JS 量当前页签得出，切页签时滑过去 -->
        <span
          class="filter-bar__tab-indicator"
          :class="{ 'filter-bar__tab-indicator--ready': indicatorReady }"
          :style="indicatorStyle"
          aria-hidden="true"
        />

        <button
          v-for="(tab, index) in tabs"
          :key="tab.value"
          :ref="(el) => setTabRef(el, index)"
          class="filter-bar__tab"
          :class="{ 'filter-bar__tab--active': activeTab === tab.value }"
          type="button"
          role="tab"
          :aria-selected="activeTab === tab.value"
          @click="activeTab = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- 中间插槽：演示页把「演示环境」提示放在状态切换与右侧工具之间 -->
      <div v-if="$slots['tabs-center']" class="filter-bar__center">
        <slot name="tabs-center" />
      </div>

      <div class="filter-bar__tools">
        <div v-if="$slots['tabs-actions']" class="filter-bar__tabs-actions">
          <slot name="tabs-actions" />
        </div>

        <el-popover
          v-if="!visualSelectMode"
          v-model:visible="sortOpen"
          trigger="click"
          placement="bottom"
          :width="176"
          popper-class="todone-sort-pop"
        >
          <template #reference>
            <button class="filter-bar__ghost" type="button" :aria-expanded="sortOpen">
              排序
              <span class="filter-bar__caret" aria-hidden="true">▾</span>
            </button>
          </template>

          <div class="sort-panel" role="menu" aria-label="排序方式">
            <p class="sort-panel__title">排序方式</p>
            <button
              v-for="option in SORT_OPTIONS"
              :key="option.value"
              class="sort-panel__item"
              :class="{ 'sort-panel__item--active': query.sortBy === option.value }"
              type="button"
              role="menuitemradio"
              :aria-checked="query.sortBy === option.value"
              @click="pickSort(option.value)"
            >
              {{ option.label }}
              <AppIcon v-if="query.sortBy === option.value" name="check" :size="14" />
            </button>

            <div class="sort-panel__divider" aria-hidden="true" />

            <div class="sort-panel__dir" role="group" aria-label="排序方向">
              <button
                class="sort-panel__dir-btn"
                :class="{ 'sort-panel__dir-btn--active': isAsc }"
                type="button"
                @click="setDirection('asc')"
              >
                正序 <span aria-hidden="true">↑</span>
              </button>
              <button
                class="sort-panel__dir-btn"
                :class="{ 'sort-panel__dir-btn--active': !isAsc }"
                type="button"
                @click="setDirection('desc')"
              >
                倒序 <span aria-hidden="true">↓</span>
              </button>
            </div>
          </div>
        </el-popover>

        <button class="filter-bar__ghost" type="button" @click="emit('toggle-select')">
          {{ visualSelectMode ? '退出选择' : '批量选择' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * 筛选区整块收进一张玻璃卡（2026-10-26）：搜索框与状态切换落在这块微透明面板上，
 * 与统计栏、任务卡同一套填色 / 描边 / 模糊，页面上不再有「直接漂在渐变上」的控件。
 */
.filter-bar {
  display: grid;
  /* 单列显式写成 minmax(0, 1fr)：内容再宽也只在这条轨道里省略，不会把卡片撑出屏幕 */
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
  padding: 14px 16px 16px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-card);
  background-color: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--shadow-card);
}

.filter-bar__row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

/* 默认（无中间插槽，如真实任务页）：tabs 靠左、工具靠右 */
.filter-bar__row--tabs {
  justify-content: space-between;
  gap: 12px;
}

/*
 * 带中间插槽（演示页）才切成三列：左 tabs、中提示、右工具。
 * 左右各 1fr，提示列按内容宽度，整行中心与提示中心重合（2026-10-18）。
 */
.filter-bar__row--tabs-center {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
}

.filter-bar__tabs {
  justify-self: start;
}

.filter-bar__tools {
  justify-self: end;
}

/* 中间提示：在整行正中，窄屏回退到「剩余空间居中 + 省略」 */
.filter-bar__center {
  display: flex;
  justify-content: center;
  min-width: 0;
  overflow: hidden;
}

/*
 * 三列版要求整行放得下「状态切换 + 提示 + 工具」：再窄下去中间列会按内容顶宽，
 * 把状态切换挤成两行（提示右侧加了登录入口后更容易碰到）。
 * 所以提前回退到「剩余空间居中 + 省略」的两段式布局。
 */
@media (max-width: 1400px) {
  .filter-bar__row--tabs-center {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
  }

  /*
   * 剩余空间只给中间：工具列按内容宽度站住（基础样式里的 flex:1 会和提示平分，
   * 提示就白缩了一大截；允许收缩又会让「排序 / 批量选择」自己折行）。
   * 多带一层选择器压过基础样式，真的放不下时整行再换行。
   */
  .filter-bar__row--tabs-center .filter-bar__center {
    flex: 1;
  }

  .filter-bar__row--tabs-center .filter-bar__tools {
    flex: none;
  }
}

/*
 * 再窄一档（≤760）：中间那条演示提示已经压到只剩「当…」，硬挤不如让它独占一行；
 * 状态切换与右侧工具留在第一行，提示整条落到第二行左对齐。
 */
@media (max-width: 760px) {
  .filter-bar__row--tabs-center .filter-bar__center {
    order: 3;
    flex: 1 1 100%;
    justify-content: flex-start;
  }

  .filter-bar__row--tabs-center .filter-bar__tools {
    order: 2;
    margin-left: auto;
  }
}

/*
 * 搜索框（2026-10-26）：胶囊形、半透明白 + 10px 模糊，去掉原来的灰底方框；
 * 聚焦时描边转苹果蓝，外面再罩一圈很淡的蓝光。
 */
.filter-bar__search {
  flex: 1;
  min-width: 240px;
}

.filter-bar__search :deep(.el-input__wrapper) {
  height: 44px;
  padding: 1px 18px;
  border: none;
  border-radius: 999px;
  background-color: var(--color-field-bg);
  backdrop-filter: blur(10px);
  box-shadow: inset 0 0 0 1px var(--color-field-border);
  transition: background-color var(--dur-fast) var(--ease), box-shadow var(--dur-base) var(--ease);
}

.filter-bar__search :deep(.el-input__wrapper:hover) {
  background-color: var(--color-field-bg-hover);
}

.filter-bar__search :deep(.el-input__wrapper.is-focus) {
  background-color: var(--color-field-bg-focus);
  box-shadow:
    inset 0 0 0 1.5px var(--color-accent),
    0 0 0 4px color-mix(in srgb, var(--color-accent) 14%, transparent),
    0 0 16px color-mix(in srgb, var(--color-accent) 24%, transparent);
}

.filter-bar__search :deep(.el-input__prefix) {
  color: var(--color-text-3);
  transition: color var(--dur-fast) var(--ease);
}

/* 聚焦时放大镜跟着描边一起转苹果蓝 */
.filter-bar__search :deep(.el-input__wrapper.is-focus) .el-input__prefix {
  color: var(--color-accent);
}

.filter-bar__search :deep(.el-input__inner) {
  font-size: 14px;
}

/* 主操作区：按钮统一 44px 高 / 14px 圆角；「新建任务」的苹果蓝与按压反馈单独写在下面 */
.filter-bar__actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 8px;
}

.filter-bar__actions :deep(.el-button) {
  height: 44px;
  margin-left: 0;
  padding: 0 22px;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 500;
}

/*
 * 「新建任务」（2026-10-26）：苹果蓝实底、12px 圆角、带一层蓝色柔光投影；
 * 悬停提亮一档，按下缩到 0.96 —— 触感来自位移，不靠变色。
 */
.filter-bar__actions :deep(.el-button--primary) {
  --el-button-bg-color: var(--color-accent);
  --el-button-border-color: var(--color-accent);
  --el-button-text-color: #fff;
  --el-button-hover-bg-color: var(--color-accent-hover);
  --el-button-hover-border-color: var(--color-accent-hover);
  --el-button-hover-text-color: #fff;
  --el-button-active-bg-color: var(--color-accent-active);
  --el-button-active-border-color: var(--color-accent-active);
  border-radius: 12px;
  box-shadow: 0 4px 14px rgba(0, 122, 255, 0.4);
  transition:
    background-color var(--dur-fast) var(--ease),
    box-shadow var(--dur-fast) var(--ease),
    transform 120ms var(--ease);
}

.filter-bar__actions :deep(.el-button--primary:hover) {
  box-shadow: 0 6px 18px rgba(0, 122, 255, 0.46);
}

.filter-bar__actions :deep(.el-button--primary:active) {
  transform: scale(0.96);
  box-shadow: 0 3px 10px rgba(0, 122, 255, 0.35);
}

/* 分段控件：浅灰容器 + 会在页签之间滑动的白色滑块（2026-10-27） */
.filter-bar__tabs {
  position: relative;
  display: flex;
  flex: none;
  align-items: center;
  gap: 2px;
  padding: 4px;
  border-radius: var(--radius-pill);
  background-color: var(--color-bg-soft);
}

/*
 * 白色滑块：位置 / 宽高由 JS 给出（量当前页签的 offset*），切页签时滑过去。
 * 首帧不加过渡（`--ready` 才打开），否则会从 (0,0) 滑进来；
 * 「减少动效」下 `--dur-base` 归零，等于直接落位。
 */
.filter-bar__tab-indicator {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 0;
  border-radius: var(--radius-pill);
  background-color: var(--color-surface);
  box-shadow: 0 2px 8px rgba(17, 24, 39, 0.06);
  pointer-events: none;
}

.filter-bar__tab-indicator--ready {
  transition:
    transform var(--dur-base) var(--ease),
    width var(--dur-base) var(--ease),
    height var(--dur-base) var(--ease),
    opacity var(--dur-fast) var(--ease);
}

.filter-bar__tab {
  position: relative;
  z-index: 1;
  height: 32px;
  padding: 0 18px;
  border: none;
  border-radius: var(--radius-pill);
  background-color: transparent;
  color: var(--color-text-2);
  font-size: 13px;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  /* 白底与阴影交给滑块，按钮自己只管文字颜色 */
  transition: color var(--dur-fast) var(--ease);
}

.filter-bar__tab:hover {
  color: var(--color-text);
}

/* 选中项：文字转品牌色 + 加粗（白底由滑块提供，这里不要再写 background / box-shadow） */
.filter-bar__tab--active {
  color: var(--color-brand);
  font-weight: 600;
}

.filter-bar__tab:focus-visible {
  outline: 2px solid var(--color-text);
  outline-offset: 2px;
}

.filter-bar__tools {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 4px;
}

/*
 * 批量操作条从这里滑进滑出（2026-10-27）。
 * 用 grid 的单行做「占位」过渡：退出时把 `1fr` 收到 `0fr`，高度是**连续收**的 ——
 * 否则操作条滑走后整块空间瞬塌，下面的列表会突然上跳（看着就是闪一下）。
 * overflow: hidden 顺便裁掉横向滑动探出的那一截。
 */
.filter-bar__tabs-actions {
  display: grid;
  grid-template-rows: 1fr;
  align-items: center;
  gap: 8px;
  margin-right: 6px;
  overflow: hidden;
  /* 先让操作条滑出去（0~110ms），这块空间再收（110~310ms），两者不互相「吃掉」 */
  transition: grid-template-rows 200ms cubic-bezier(0.4, 0, 0.2, 1) 110ms;
}

/* 文字按钮（排序 / 批量选择）：无框无底，悬停才浮一层浅灰 */
.filter-bar__ghost {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 10px;
  border: none;
  border-radius: var(--radius-md);
  background-color: transparent;
  color: var(--color-text-2);
  font-size: 13px;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease), background-color var(--dur-fast) var(--ease);
}

.filter-bar__ghost:hover {
  color: var(--color-text);
  background-color: var(--color-bg-soft);
}

.filter-bar__ghost:focus-visible {
  outline: 2px solid var(--color-text);
  outline-offset: 2px;
}

.filter-bar__caret {
  font-size: 10px;
  line-height: 1;
  color: var(--color-text-3);
}

/* ---------- 排序面板 ---------- */

.sort-panel {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sort-panel__title {
  padding: 2px 8px 6px;
  font-size: 11px;
  color: var(--color-text-3);
}

.sort-panel__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: 34px;
  padding: 0 8px;
  border: none;
  border-radius: var(--radius-sm);
  background-color: transparent;
  color: var(--color-text-2);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease);
}

.sort-panel__item:hover {
  background-color: var(--color-hover);
  color: var(--color-text);
}

.sort-panel__item--active {
  color: var(--color-brand);
  font-weight: 500;
}

.sort-panel__divider {
  height: 1px;
  margin: 6px 0;
  background-color: var(--color-border);
}

.sort-panel__dir {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.sort-panel__dir-btn {
  height: 26px;
  padding: 0 4px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: transparent;
  color: var(--color-text-2);
  font-size: 11px;
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease);
}

.sort-panel__dir-btn:hover {
  border-color: var(--color-border-strong);
  color: var(--color-text);
}

.sort-panel__dir-btn--active {
  border-color: color-mix(in srgb, var(--color-brand) 28%, transparent);
  background-color: var(--color-brand-soft);
  color: var(--color-brand);
  font-weight: 500;
}
</style>

<style>
/* 排序面板是 teleport 出去的气泡，外层壳的留白与描边只能写成全局样式 */
.todone-sort-pop.el-popover {
  padding: 8px;
  /* 玻璃面板（2026-10-26）：与全站浮层同一档填色与描边 */
  border: 1px solid var(--glass-border);
  background-color: var(--glass-bg-strong);
  backdrop-filter: var(--glass-blur);
  border-radius: var(--radius-md);
  box-shadow: 0 10px 30px rgba(16, 24, 20, 0.08);
}
</style>
