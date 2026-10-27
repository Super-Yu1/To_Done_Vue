<script setup lang="ts">
/**
 * 筛选与动作（2026-10-27 三改为一条工具栏）：
 * 搜索井 → 状态分段控件 → 排序 / 批量选择 → 页面主操作，全在同一条玻璃条上。
 * 原来「搜索 + 新建」和「页签 + 工具」分两行，是因为演示页中间要塞一条提示；
 * 提示已经上移到页首，这里就收成一行 —— 首屏的纵向空间留给任务本身。
 *
 * 排序仍是「字段 + 方向」两件独立的事，只是收进同一个下拉面板里：
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
    <div class="filter-bar__row">
      <!-- 搜索：贴在最左，占满剩余宽度；它是一口「凹进去的井」，不是又一层白玻璃 -->
      <el-input
        v-model="query.keyword"
        class="filter-bar__search"
        placeholder="搜索标题或描述"
        clearable
      >
        <template #prefix>
          <AppIcon name="search" />
        </template>
      </el-input>

      <!-- 状态分段控件 -->
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

      <div class="filter-bar__tools">
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

      <div v-if="$slots.actions" class="filter-bar__actions">
        <slot name="actions" />
      </div>
    </div>

    <!--
      批量操作条（2026-10-27 三改）：从工具栏里独立出来占一行 ——
      选择模式下它有一整条宽度可用，不会把搜索和主按钮挤到折行。
    -->
    <div v-if="$slots['tabs-actions']" class="filter-bar__tabs-actions">
      <slot name="tabs-actions" />
    </div>
  </div>
</template>

<style scoped>
/*
 * 工具栏（2026-10-27 三改）：一条玻璃横条，所有控件都站在同一基线上。
 * 比顶部概览更薄、更轻（同一档填色，影只给到卡片级），
 * 于是页面上出现「概览 → 工具 → 内容」三层高度，不再是一摞同重的白卡。
 */
.filter-bar {
  /* 按容器宽度降级（与任务行的 @container 同一套思路）：窄侧栏 + 窄窗口时不看视口看这一条自己 */
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--glass-panel-border);
  border-radius: 20px;
  background-color: var(--glass-panel-bg);
  backdrop-filter: var(--glass-panel-blur);
  box-shadow: var(--shadow-card);
}

/* 常驻的一行控件：搜索 / 分段 / 工具 / 主操作 */
.filter-bar__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 12px;
}

/*
 * 搜索井（2026-10-27）：胶囊形、凹进玻璃里 ——
 * 底色比面板更深一档（墨色兑水）+ 一道内阴影，聚焦时整口井提亮成白色并套上苹果蓝环。
 */
.filter-bar__search {
  flex: 1 1 240px;
  min-width: 160px;
}

.filter-bar__search :deep(.el-input__wrapper) {
  height: 42px;
  padding: 1px 16px;
  border: none;
  border-radius: var(--radius-pill);
  background-color: var(--color-field-bg);
  backdrop-filter: blur(10px);
  box-shadow: inset 0 0 0 1px var(--color-field-border), inset 0 1px 3px rgba(17, 24, 39, 0.06);
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
    0 0 18px color-mix(in srgb, var(--color-accent) 22%, transparent);
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

/* 主操作区：按钮 42px 高 / 13px 圆角，与搜索井同一条基线 */
.filter-bar__actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 8px;
  margin-left: 2px;
}

.filter-bar__actions :deep(.el-button) {
  height: 42px;
  margin-left: 0;
  padding: 0 20px;
  border-radius: var(--radius-control);
  font-size: 14px;
  font-weight: 550;
}

/*
 * 「新建任务」（2026-10-28 C 方案）：纯色填充 + 一层内高光，**不再带外发光** ——
 * 页面深度交给面板，按钮只靠填充和描边表达层级；悬停提亮，按下缩到 0.96。
 */
.filter-bar__actions :deep(.el-button--primary) {
  --el-button-bg-color: var(--color-accent);
  --el-button-border-color: transparent;
  --el-button-text-color: #fff;
  --el-button-hover-bg-color: var(--color-accent-hover);
  --el-button-hover-border-color: transparent;
  --el-button-hover-text-color: #fff;
  --el-button-active-bg-color: var(--color-accent-active);
  --el-button-active-border-color: transparent;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
  transition: background-color var(--dur-fast) var(--ease), transform 120ms var(--ease);
}

.filter-bar__actions :deep(.el-button--primary:hover) {
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.42);
}

.filter-bar__actions :deep(.el-button--primary:active) {
  transform: scale(0.96);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

/*
 * 分段控件（2026-10-27 按苹果口径）：轨道只是一层极淡的中性底，
 * 真正的「选中」由滑块的白色 + 微影表达；深色主题换成浅灰半透（见 main.css 的 --seg-*）。
 */
.filter-bar__tabs {
  position: relative;
  display: flex;
  flex: none;
  align-items: center;
  gap: 2px;
  padding: 4px;
  border-radius: var(--radius-pill);
  background-color: var(--seg-track-bg);
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
  background-color: var(--seg-thumb-bg);
  box-shadow: var(--seg-thumb-shadow);
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
  padding: 0 16px;
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
  flex: none;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 2px;
  margin-left: auto;
}

/*
 * 批量操作条从这里滑进滑出（2026-10-27）。
 * 用 grid 的单行做「占位」过渡：退出时把 `1fr` 收到 `0fr`，高度是**连续收**的 ——
 * 否则操作条滑走后整块空间瞬塌，工具栏会突然变矮（看着就是闪一下）。
 * overflow: hidden 顺便裁掉横向滑动探出的那一截。
 */
.filter-bar__tabs-actions {
  display: grid;
  grid-template-rows: 1fr;
  justify-items: end;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  /* 先让操作条滑出去（0~110ms），这块空间再收（110~310ms），两者不互相「吃掉」 */
  transition: grid-template-rows 200ms cubic-bezier(0.4, 0, 0.2, 1) 110ms;
}

/* 不在选择模式时插槽里没有节点：整行收掉，连 gap 都不占 */
.filter-bar__tabs-actions:empty {
  display: none;
}

/* 文字按钮（排序 / 批量选择）：无框无底，悬停才浮一层微光 */
.filter-bar__ghost {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 10px;
  border: none;
  border-radius: var(--radius-control);
  background-color: transparent;
  color: var(--color-text-2);
  font-size: 13px;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease), background-color var(--dur-fast) var(--ease),
    transform 120ms var(--ease);
}

.filter-bar__ghost:hover {
  color: var(--color-text);
  background-color: var(--control-hover);
}

.filter-bar__ghost:active {
  transform: scale(0.97);
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

/*
 * 工具栏自己变窄（窄侧栏 + 约 1024 的窗口）：主操作收成一枚加号方钮。
 * 文字让位而不是整行折行 —— 折行后按钮会孤零零落到第二行，比少一行字难看得多。
 */
@container (max-width: 760px) {
  /* 搜索的 flex-basis 也要跟着收：换行是按 basis 算的，只缩按钮仍会挤到第二行 */
  .filter-bar__search {
    flex-basis: 150px;
  }

  .filter-bar__actions :deep(.btn-text) {
    display: none;
  }

  .filter-bar__actions :deep(.el-button) {
    width: 42px;
    padding: 0;
  }
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
  /* 玻璃浮层：与全站浮层同一档填色与描边 */
  border: 1px solid var(--glass-border);
  background-color: var(--glass-bg-strong);
  backdrop-filter: var(--glass-blur);
  border-radius: var(--radius-md);
  box-shadow: 0 10px 30px rgba(16, 24, 20, 0.08);
}
</style>
