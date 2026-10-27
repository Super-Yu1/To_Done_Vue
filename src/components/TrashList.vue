<script setup lang="ts">
/**
 * 回收站列表（UC-06 / 8.8）：真实页与演示页共用；只负责渲染与转发动作，不含数据来源。
 * 2026-10-27 五改：与任务首页对齐成「概览卡 → 工具栏 → 一行一卡」——
 * 同一个 26px 概览面板、同一条 64px 工具栏、同一套 20px 任务卡（卡高 75 / 标题 15 / 描述 12.5）。
 * 每行左侧那枚圆形「彻底删除」按钮保持原样，只是尺寸与任务页的勾选圈对齐到 22px。
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import AppIcon from './AppIcon.vue'
import EmptyState from './EmptyState.vue'
import ListMoreHint from './ListMoreHint.vue'
import TrashItem from './TrashItem.vue'
import type { TrashTask } from '@/types'

const props = defineProps<{
  tasks: TrashTask[]
  /** 回收站总条数（后端分页时 tasks 只是当前页；不传则按当前列表长度算） */
  total?: number
  /** 首屏 / 重新筛选：列表为空时渲染骨架卡（与任务页同一个口径） */
  loading?: boolean
  /** 触底加载中：显示底部提示（与任务页共用 ListMoreHint；默认关闭，页面传 :loading-more 才启用） */
  loadingMore?: boolean
  clearing?: boolean
  clearDisabled?: boolean
  /** 批量恢复的选择模式（2026-10-18） */
  selectMode?: boolean
  selectedIds?: string[]
  /** 批量恢复进行中：按钮转圈、操作禁用 */
  batchBusy?: boolean
}>()

/** 搜索词由页面持有并做过滤，列表只负责展示与转发（v-model:keyword） */
const keyword = defineModel<string>('keyword', { default: '' })

const emit = defineEmits<{
  restore: [TrashTask]
  purge: [TrashTask]
  clear: []
  'enter-select': []
  'exit-select': []
  'toggle-select': [TrashTask]
  'toggle-all': []
  'batch-restore': []
  'batch-purge': []
  /** 触底：请求下一页（由页面 / store 自己判断是否还有） */
  'load-more': []
}>()

const SKELETON_COUNT = 4

/* ---------- 触底加载（与 TaskList 同一套哨兵） ---------- */

const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | undefined

onMounted(() => {
  if (!sentinel.value) return
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) emit('load-more')
    },
    // 提前 200px 触发：滚到底之前下一页就在路上了
    { rootMargin: '200px' },
  )
  observer.observe(sentinel.value)
})

onUnmounted(() => observer?.disconnect())

const allSelected = computed(
  () => props.tasks.length > 0 && (props.selectedIds?.length ?? 0) >= props.tasks.length,
)

/** 「批量选择 / 退出选择」是同一枚按钮，按当前模式决定方向 */
function toggleSelectMode() {
  if (props.selectMode) emit('exit-select')
  else emit('enter-select')
}

/* ---------- 概览卡的数据 ---------- */

/** 总条数优先取后端 total；演示页与未分页时它就是当前列表长度 */
const count = computed(() => props.total ?? props.tasks.length)

/** 7 天内将被自动清理的条数：与行内「剩余 N 天」的橙色阈值同一个数 */
const SOON_DAYS = 7
const soonCount = computed(
  () => props.tasks.filter((task) => task.remainingDays <= SOON_DAYS).length,
)

/** 最近一条还能留几天：概览右侧最值得看的一个数（列表为空时给 null，不用 Infinity 漏到界面上） */
const minRemaining = computed<number | null>(() => {
  if (!props.tasks.length) return null
  return props.tasks.reduce((min, task) => Math.min(min, task.remainingDays), Infinity)
})
</script>

<template>
  <div class="trash">
    <!-- 概览：与首页 StatBar 同一块料、同一套字号（日期位换成「回收站」） -->
    <section class="trash-hero" aria-label="回收站概览">
      <div class="trash-hero__intro">
        <p class="trash-hero__eyebrow">回收站</p>

        <h1 class="trash-hero__title">
          <template v-if="count > 0">还有 <strong>{{ count }}</strong> 件任务在回收站里</template>
          <template v-else>回收站已经清空了</template>
        </h1>

        <p class="trash-hero__meta">
          <template v-if="count > 0">
            保留期内可随时恢复，逾期由系统自动清理；彻底删除立即不可恢复。
          </template>
          <template v-else>删掉的任务会先放到这里，不会立刻消失。</template>
        </p>
      </div>

      <!-- 搜索时把两枚信息胶囊收起来：它们在讲「全量」，和筛选后的列表不是一回事 -->
      <div v-if="count > 0 && !keyword && minRemaining !== null" class="trash-hero__stats">
        <span class="trash-chip">
          <AppIcon class="trash-chip__icon" name="clock" :size="14" />
          <span>最近</span>
          <strong>{{ minRemaining }}</strong>
          <span>天后清理</span>
        </span>

        <span v-if="soonCount > 0" class="trash-chip trash-chip--soon">
          <AppIcon class="trash-chip__icon" name="alert" :size="14" />
          <span>7 天内</span>
          <strong>{{ soonCount }}</strong>
          <span>件</span>
        </span>
      </div>
    </section>

    <!-- 工具栏：与首页 FilterBar 同一条玻璃条、同一个搜索井、同一枚主按钮高度 -->
    <div class="trash__toolbar">
      <div class="trash__row">
        <el-input v-model="keyword" class="trash__search" placeholder="搜索标题或描述" clearable>
          <template #prefix>
            <AppIcon name="search" />
          </template>
        </el-input>

        <div class="trash__tools">
          <button class="trash__ghost" type="button" @click="toggleSelectMode">
            {{ selectMode ? '退出选择' : '批量选择' }}
          </button>

          <!-- 非批量模式：清空（红描边 + 红字，悬停红底白字） -->
          <el-button
            v-if="!selectMode"
            class="trash__clear"
            :disabled="clearDisabled"
            :loading="clearing"
            @click="emit('clear')"
          >
            <AppIcon name="trash" />
            <span class="btn-text">清空回收站</span>
          </el-button>
        </div>
      </div>

      <!-- 批量模式：动作独占第二行（与首页批量条同一套 30px 小按钮） -->
      <Transition name="batch-fade">
        <div v-if="selectMode" class="trash__batch-row">
          <span class="trash__count">
            已选 <strong>{{ selectedIds?.length ?? 0 }}</strong> 条
          </span>
          <button class="trash__ghost" type="button" @click="emit('toggle-all')">
            {{ allSelected ? '取消全选' : '全选' }}（{{ tasks.length }}）
          </button>
          <button
            class="trash__batch trash__batch--restore"
            type="button"
            :disabled="!selectedIds?.length || batchBusy"
            @click="emit('batch-restore')"
          >
            批量恢复
          </button>
          <button
            class="trash__batch trash__batch--danger"
            type="button"
            :disabled="!selectedIds?.length || batchBusy"
            @click="emit('batch-purge')"
          >
            批量彻底删除
          </button>
        </div>
      </Transition>
    </div>

    <!-- 首屏 / 重新筛选：骨架卡与真实卡同栅格（40 / 正文 / 236），加载完不跳版 -->
    <div v-if="loading" class="trash__rows" aria-busy="true">
      <div
        v-for="index in SKELETON_COUNT"
        :key="index"
        class="trash-skeleton"
        aria-hidden="true"
      >
        <div class="trash-skeleton__check"></div>
        <div class="trash-skeleton__body">
          <div class="trash-skeleton__line trash-skeleton__line--title"></div>
          <div class="trash-skeleton__line trash-skeleton__line--meta"></div>
        </div>
        <div class="trash-skeleton__side"></div>
      </div>
    </div>

    <!-- 空状态住一张卡，与有任务时是同一张脸 -->
    <div v-else-if="tasks.length === 0" class="trash__empty">
      <EmptyState
        :title="keyword ? '没有匹配的任务' : '回收站是空的'"
        :description="keyword ? '换个关键词试试。' : '删掉的任务会先放到这里，不会立刻消失。'"
      />
    </div>

    <TransitionGroup v-else name="row" tag="div" class="trash__rows">
      <TrashItem
        v-for="task in tasks"
        :key="task.id"
        :task="task"
        :select-mode="selectMode"
        :selected="selectMode && (selectedIds ?? []).includes(task.id)"
        @restore="emit('restore', $event)"
        @purge="emit('purge', $event)"
        @toggle-select="emit('toggle-select', $event)"
      />
    </TransitionGroup>

    <!-- 底部提示：默认关闭，两个列表共用同一个组件，样式不会走样 -->
    <ListMoreHint :loading="loadingMore" />

    <!-- 触底哨兵：提前 200px 触发，下一页到了就静默追加 -->
    <div ref="sentinel" class="trash__sentinel" aria-hidden="true"></div>
  </div>
</template>

<style scoped>
/* 页面纵向节奏与首页一致：概览 → 工具栏 → 列表统一 18px */
.trash {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* ---------- 概览卡（同一块面板材质） ---------- */

.trash-hero {
  display: flex;
  align-items: center;
  gap: 22px;
  min-height: 116px;
  padding: 20px 22px 20px 26px;
  border: 1px solid var(--glass-panel-border);
  border-radius: var(--radius-panel);
  background-color: var(--glass-panel-bg);
  backdrop-filter: var(--glass-panel-blur);
  box-shadow: var(--shadow-panel);
}

.trash-hero__intro {
  flex: 1 1 auto;
  min-width: 0;
}

.trash-hero__eyebrow {
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: var(--color-text-3);
}

/* 与首页那句「还有 N 件事没划掉」同档：22px / 650 / -0.02em */
.trash-hero__title {
  margin-top: 6px;
  font-size: 22px;
  font-weight: 650;
  line-height: 1.25;
  letter-spacing: -0.02em;
  color: var(--color-text);
}

.trash-hero__title strong {
  color: var(--color-brand);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.trash-hero__meta {
  margin-top: 5px;
  font-size: 12px;
  color: var(--color-text-3);
}

/* ---------- 概览右侧的信息胶囊（沿用首页快捷胶囊的形状与配色） ---------- */

.trash-hero__stats {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.trash-chip {
  --tone: var(--color-text-2);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 13px;
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: var(--radius-pill);
  background-color: rgba(255, 255, 255, 0.36);
  color: var(--color-text-2);
  font-size: 12.5px;
  line-height: 1;
  white-space: nowrap;
}

.trash-chip__icon {
  flex: none;
  color: var(--tone);
}

.trash-chip strong {
  font-size: 13px;
  font-weight: 650;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}

/* 7 天内：橙点提醒，和行内「剩余 N 天」的橙色是同一个语义 */
.trash-chip--soon {
  --tone: var(--color-priority-medium-fg);
  border-color: color-mix(in srgb, var(--tone) 26%, transparent);
  background-color: color-mix(in srgb, var(--tone) 10%, rgba(255, 255, 255, 0.4));
}

html.dark .trash-chip {
  border-color: rgba(255, 255, 255, 0.12);
  background-color: rgba(255, 255, 255, 0.06);
}

html.dark .trash-chip--soon {
  background-color: color-mix(in srgb, var(--tone) 16%, transparent);
  border-color: color-mix(in srgb, var(--tone) 34%, transparent);
}

/* ---------- 工具栏 ---------- */

.trash__toolbar {
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

.trash__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 12px;
}

/* 搜索井：与首页同一口「凹井」——墨色 5.5% 底 + 内阴影，聚焦转白并套苹果蓝环 */
.trash__search {
  flex: 1 1 240px;
  min-width: 160px;
}

.trash__search :deep(.el-input__wrapper) {
  height: 42px;
  padding: 1px 16px;
  border: none;
  border-radius: var(--radius-pill);
  background-color: var(--color-field-bg);
  backdrop-filter: blur(10px);
  box-shadow: inset 0 0 0 1px var(--color-field-border), inset 0 1px 3px rgba(17, 24, 39, 0.06);
  transition: background-color var(--dur-fast) var(--ease), box-shadow var(--dur-base) var(--ease);
}

.trash__search :deep(.el-input__wrapper:hover) {
  background-color: var(--color-field-bg-hover);
}

.trash__search :deep(.el-input__wrapper.is-focus) {
  background-color: var(--color-field-bg-focus);
  box-shadow:
    inset 0 0 0 1.5px var(--color-accent),
    0 0 0 4px color-mix(in srgb, var(--color-accent) 14%, transparent),
    0 0 18px color-mix(in srgb, var(--color-accent) 22%, transparent);
}

.trash__search :deep(.el-input__prefix) {
  color: var(--color-text-3);
  transition: color var(--dur-fast) var(--ease);
}

.trash__search :deep(.el-input__wrapper.is-focus) .el-input__prefix {
  color: var(--color-accent);
}

.trash__search :deep(.el-input__inner) {
  font-size: 14px;
}

.trash__tools {
  display: flex;
  flex: none;
  align-items: center;
  gap: 2px;
  margin-left: auto;
}

/* 文字按钮：与首页「排序 / 批量选择」同一个尺寸与悬停态 */
.trash__ghost {
  display: inline-flex;
  flex: none;
  align-items: center;
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

.trash__ghost:hover {
  color: var(--color-text);
  background-color: var(--control-hover);
}

.trash__ghost:active {
  transform: scale(0.97);
}

.trash__ghost:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/*
 * 清空：危险语义但保持轻 —— 红描边 + 红字 + 红色垃圾桶，
 * 悬停才整块转红底白字；高度 / 圆角与首页「新建任务」同一档（42 / 12）。
 */
.trash__clear {
  --el-button-bg-color: transparent;
  --el-button-border-color: color-mix(in srgb, var(--color-danger) 55%, transparent);
  --el-button-text-color: var(--color-danger);
  --el-button-hover-bg-color: var(--color-danger);
  --el-button-hover-border-color: var(--color-danger);
  --el-button-hover-text-color: var(--color-danger-fg);
  --el-button-active-bg-color: var(--color-danger-hover);
  --el-button-active-border-color: var(--color-danger-hover);
  --el-button-active-text-color: var(--color-danger-fg);
  height: 42px;
  margin-left: 0;
  padding: 0 18px;
  border-radius: var(--radius-control);
  font-size: 14px;
}

/* ---------- 批量行 ---------- */

/* 进场：淡入 + 下沉 2px（与全站的动效口径一致，只动 opacity / transform） */
.batch-fade-enter-active,
.batch-fade-leave-active {
  transition: opacity 180ms var(--ease), transform 180ms var(--ease);
}

.batch-fade-enter-from,
.batch-fade-leave-to {
  opacity: 0;
  transform: translateY(-2px);
}

.trash__batch-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.trash__count {
  margin-right: 2px;
  font-size: 12.5px;
  color: var(--color-text-2);
}

.trash__count strong {
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}

/* 与首页批量条同一套小按钮：30px 高 / 紧凑档圆角 / 半透明白底 */
.trash__batch {
  display: inline-flex;
  align-items: center;
  height: 30px;
  padding: 0 12px;
  border-radius: var(--radius-control-sm);
  font-size: 12.5px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease), transform 120ms var(--ease);
}

.trash__batch:active:not(:disabled) {
  transform: scale(0.97);
}

.trash__batch:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* 批量恢复：品牌色的浅底 + 细边，是这一行里的「正向」动作 */
.trash__batch--restore {
  border: 1px solid color-mix(in srgb, var(--color-brand) 26%, transparent);
  background-color: color-mix(in srgb, var(--color-brand) 10%, transparent);
  color: var(--color-brand);
}

.trash__batch--restore:hover:not(:disabled) {
  background-color: color-mix(in srgb, var(--color-brand) 16%, transparent);
  border-color: color-mix(in srgb, var(--color-brand) 38%, transparent);
}

/* 批量彻底删除：与单条「彻底删除」同一支红 */
.trash__batch--danger {
  border: 1px solid color-mix(in srgb, var(--color-danger) 26%, transparent);
  background-color: color-mix(in srgb, var(--color-danger) 8%, transparent);
  color: var(--color-danger);
}

.trash__batch--danger:hover:not(:disabled) {
  background-color: color-mix(in srgb, var(--color-danger) 14%, transparent);
  border-color: color-mix(in srgb, var(--color-danger) 40%, transparent);
}

/* 深色：浅色填充换成 8% 白，红 / 蓝的浅底也压一档 */
html.dark .trash__batch--restore {
  background-color: color-mix(in srgb, var(--color-brand) 16%, transparent);
}

html.dark .trash__batch--restore:hover:not(:disabled) {
  background-color: color-mix(in srgb, var(--color-brand) 22%, transparent);
}

html.dark .trash__batch--danger {
  background-color: color-mix(in srgb, var(--color-danger) 14%, transparent);
}

html.dark .trash__batch--danger:hover:not(:disabled) {
  background-color: color-mix(in srgb, var(--color-danger) 20%, transparent);
}

/* 工具栏窄一档：清空按钮收成一枚图标方钮，避免折行（与首页主按钮同一套降级） */
@container (max-width: 760px) {
  .trash__search {
    flex-basis: 150px;
  }

  .trash__clear :deep(.btn-text) {
    display: none;
  }

  .trash__clear {
    width: 42px;
    padding: 0;
  }
}

/* ---------- 列表 ---------- */

.trash__empty {
  border: 1px solid var(--glass-card-border);
  border-radius: var(--radius-lg);
  background-color: var(--glass-card-bg);
  backdrop-filter: var(--glass-card-blur);
  box-shadow: var(--shadow-card);
}

.trash__rows {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 骨架卡：与真实卡同栅格、同材质、同高度（40 / 正文 / 236，padding 15/20） */
.trash-skeleton {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 236px;
  align-items: center;
  gap: 14px;
  padding: 15px 20px;
  border: 1px solid var(--glass-card-border);
  border-radius: var(--radius-lg);
  background-color: var(--glass-card-bg);
  backdrop-filter: var(--glass-card-blur);
  box-shadow: var(--shadow-card);
}

.trash-skeleton__check {
  justify-self: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background-color: color-mix(in srgb, var(--color-text) 8%, transparent);
}

.trash-skeleton__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.trash-skeleton__line {
  height: 12px;
  border-radius: var(--radius-sm);
  background-color: color-mix(in srgb, var(--color-text) 7%, transparent);
}

.trash-skeleton__line--title {
  width: 55%;
  height: 15px;
}

.trash-skeleton__line--meta {
  width: 32%;
  height: 16px;
}

/* 右侧元信息占位：一条 150px 的浅条，和真实卡的「剩余 + 删除于 + 恢复」同宽 */
.trash-skeleton__side {
  justify-self: end;
  width: 150px;
  height: 16px;
  border-radius: 8px;
  background-color: color-mix(in srgb, var(--color-text) 6%, transparent);
}

.trash__sentinel {
  height: 1px;
}

/* 行进退场与让位：与 TaskList.vue 的同名规则一致（两处都用 TransitionGroup name="row"） */
.row-enter-active {
  transition: opacity var(--dur-base) var(--ease), transform var(--dur-base) var(--ease);
}

.row-leave-active {
  transition: opacity var(--dur-fast) var(--ease), transform var(--dur-fast) var(--ease);
}

.row-enter-from,
.row-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

.row-move {
  transition: transform var(--dur-base) var(--ease);
}
</style>
