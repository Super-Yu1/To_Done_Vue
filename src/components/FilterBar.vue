<script setup lang="ts">
/**
 * 筛选与动作（2026-10-18 按设计稿改为双行工具栏）：
 * ① 上方：灰色长搜索框（占满剩余宽度）+ 页面主操作（新建任务）；
 * ② 下方：左侧状态分段控件，右侧「排序 ▾」与「批量选择」文字按钮（选择模式下换成批量操作条 + 退出选择）。
 * 排序仍是「字段 + 方向」两件独立的事，只是收进同一个极简下拉面板里：
 * 字段决定按什么排，方向决定正序 / 倒序；空字段 = 不传参、沿用后端固定规则。
 * query 由调用方持有（真实页来自 todo store、演示页来自本地内存态），按 8.3 直接改它的字段。
 */
import { computed, onUnmounted, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import { SEARCH_DEBOUNCE_MS, TASK_STATUS_OPTIONS } from '@/constants'
import type { TaskQuery, TaskStatus } from '@/types'

const props = defineProps<{ query: TaskQuery; selectMode?: boolean }>()
/**
 * change = 「筛选条件变化，请从第 1 页重取」；
 * toggle-select = 「进入 / 退出批量选择」（由调用方按 selectMode 决定方向）。
 */
const emit = defineEmits<{ change: []; 'toggle-select': [] }>()

/** 分段控件的 value 得是字符串，而 query.status 是 `TaskStatus | undefined` —— 用 all 代表「全部」 */
const ALL = 'all'

/**
 * 页签顺序：**未完成 → 已完成 → 全部**。
 * 「全部」退到最后 —— 日常最常看的是「还没做完的」，默认也停在这里（见 store / useDemoTasks 的初始 status）。
 */
const tabs = [
  ...TASK_STATUS_OPTIONS.map((item) => ({ value: item.value as string, label: item.label })),
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
  get: () => props.query.status ?? ALL,
  set: (value: string) => {
    props.query.status = value === ALL ? undefined : (value as TaskStatus)
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

onUnmounted(() => window.clearTimeout(debounceTimer))
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
      <div class="filter-bar__tabs" role="tablist" aria-label="任务状态">
        <button
          v-for="tab in tabs"
          :key="tab.value"
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
          v-if="!selectMode"
          v-model:visible="sortOpen"
          trigger="click"
          placement="bottom-end"
          :width="216"
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
          {{ selectMode ? '退出选择' : '批量选择' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.filter-bar {
  display: grid;
  gap: 10px;
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

@media (max-width: 1200px) {
  .filter-bar__row--tabs-center {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
  }

  .filter-bar__center {
    flex: 1;
  }
}

/* 搜索框：胶囊形浅灰长条，聚焦转白底 + 品牌色细环 */
.filter-bar__search {
  flex: 1;
  min-width: 240px;
}

.filter-bar__search :deep(.el-input__wrapper) {
  height: 44px;
  padding: 1px 18px;
  border-radius: var(--radius-pill);
  background-color: var(--color-bg-soft);
  box-shadow: inset 0 0 0 1px transparent;
  transition: background-color var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease);
}

.filter-bar__search :deep(.el-input__wrapper:hover) {
  background-color: var(--color-surface);
  box-shadow: inset 0 0 0 1px var(--color-border-strong);
}

.filter-bar__search :deep(.el-input__wrapper.is-focus) {
  background-color: var(--color-surface);
  box-shadow: inset 0 0 0 1.5px var(--color-brand);
}

.filter-bar__search :deep(.el-input__prefix) {
  color: var(--color-text-3);
}

.filter-bar__search :deep(.el-input__inner) {
  font-size: 14px;
}

/* 主操作（新建任务）：品牌色实心、大圆角、带一圈同色柔光 */
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

.filter-bar__actions :deep(.el-button--primary) {
  --el-button-bg-color: var(--color-brand);
  --el-button-border-color: var(--color-brand);
  --el-button-text-color: var(--color-brand-fg);
  --el-button-hover-bg-color: var(--color-brand-hover);
  --el-button-hover-border-color: var(--color-brand-hover);
  --el-button-hover-text-color: var(--color-brand-fg);
  --el-button-active-bg-color: var(--color-brand-active);
  --el-button-active-border-color: var(--color-brand-active);
  box-shadow: 0 8px 18px color-mix(in srgb, var(--color-brand) 26%, transparent);
}

/* 分段控件：浅灰容器 + 选中项白底微阴影 */
.filter-bar__tabs {
  display: flex;
  flex: none;
  align-items: center;
  gap: 2px;
  padding: 4px;
  border-radius: var(--radius-pill);
  background-color: var(--color-bg-soft);
}

.filter-bar__tab {
  height: 32px;
  padding: 0 18px;
  border: none;
  border-radius: var(--radius-pill);
  background-color: transparent;
  color: var(--color-text-2);
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease),
    box-shadow var(--dur-fast) var(--ease);
}

.filter-bar__tab:hover {
  color: var(--color-text);
}

/* 选中项：白底轻阴影 + 品牌色文字，轻盈但一眼可辨 */
.filter-bar__tab--active {
  background-color: var(--color-surface);
  color: var(--color-brand);
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(17, 24, 39, 0.06);
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

.filter-bar__tabs-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 6px;
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
  height: 30px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: transparent;
  color: var(--color-text-2);
  font-size: 12px;
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
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 10px 30px rgba(16, 24, 20, 0.08);
}
</style>
