<script setup lang="ts">
/**
 * 回收站行（2026-10-27 五改：与任务卡同一套玻璃壳）：
 * 最左侧仍是那枚 40px 前置位里的圆形「彻底删除」按钮（22px，与任务页勾选圈同尺寸同位置），
 * 批量模式同位置换成圆形复选框。
 *
 * 右侧是「剩余 N 天 + 删除时间」，靠右对齐；时间右侧保留一个恢复图标按钮。
 * 彻底删除的二次确认在调用方（TrashView / DemoTrashView）里做。
 */
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import AppTooltip from './AppTooltip.vue'
import { formatDueLabel } from '@/utils/date'
import type { TrashTask } from '@/types'

const props = defineProps<{
  task: TrashTask
  /** 批量恢复 / 批量删除的选择模式 */
  selectMode?: boolean
  selected?: boolean
}>()
const emit = defineEmits<{
  restore: [TrashTask]
  purge: [TrashTask]
  'toggle-select': [TrashTask]
}>()

/** 选择模式下整行点击 = 勾选/取消（回收站平时没有行点击行为） */
function handleRowClick() {
  if (props.selectMode) emit('toggle-select', props.task)
}

/** 剩余天数进入一周内就用橙色提示，对齐「到期自动清理」的紧迫感 */
const SOON_DAYS = 7

const soon = computed(() => props.task.remainingDays <= SOON_DAYS)
/** 删除时间用与任务页同一套人类可读格式（今天 / 明天带时刻，其余 MM-DD） */
const deletedText = computed(() => `删除于 ${formatDueLabel(props.task.deletedAt)}`)
</script>

<template>
  <article
    class="trash-row"
    :class="{
      'trash-row--select': selectMode,
      'trash-row--selected': selected,
    }"
    @click="handleRowClick"
  >
    <!-- 前置位：普通模式是「彻底删除」圆形按钮；批量模式换成同尺寸复选框 -->
    <AppTooltip v-if="!selectMode" content="彻底删除" placement="top">
      <button
        class="trash-row__purge"
        type="button"
        :aria-label="`彻底删除：${task.title}`"
        @click.stop="emit('purge', task)"
      >
        <AppIcon name="trash" :size="14" />
      </button>
    </AppTooltip>

    <span
      v-else
      class="trash-row__box"
      :class="{ 'trash-row__box--on': selected }"
      role="checkbox"
      :aria-checked="!!selected"
      :aria-label="`选择：${task.title}`"
      tabindex="0"
      @keydown.enter.prevent="emit('toggle-select', task)"
      @keydown.space.prevent="emit('toggle-select', task)"
    >
      <AppIcon v-if="selected" name="check" :size="14" />
    </span>

    <div class="trash-row__body">
      <h3 class="trash-row__title">{{ task.title }}</h3>
      <!-- 描述始终占位：没有副标题的任务也保持同样的卡片高度 -->
      <p class="trash-row__description">{{ task.description || '' }}</p>
    </div>

    <!-- 右侧：剩余天数 + 删除时间靠右；时间右侧是恢复按钮 -->
    <div class="trash-row__side">
      <div class="trash-row__meta">
        <span class="trash-row__pill" :class="{ 'trash-row__pill--soon': soon }">
          <AppIcon name="clock" :size="12" />
          剩余 {{ task.remainingDays }} 天
        </span>
        <p class="trash-row__deleted">
          <AppIcon name="clock" :size="12" />
          {{ deletedText }}
        </p>
      </div>

      <AppTooltip v-if="!selectMode" content="恢复" placement="top">
        <button
          class="trash-row__restore"
          type="button"
          :aria-label="`恢复：${task.title}`"
          @click.stop="emit('restore', task)"
        >
          <AppIcon name="restore" :size="15" />
        </button>
      </AppTooltip>
    </div>
  </article>
</template>

<style scoped>
/*
 * 与任务卡同一套玻璃壳（2026-10-27 五改）：
 * 20px 圆角 + 0.5 白 + 26px 模糊 + 高光边 + 卡片影；卡高 87px（padding 18/22），
 * 栅格仍是 40px 前置位 + 正文 + 右侧 236px —— 与任务页逐项对齐。
 */
.trash-row {
  position: relative;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 18px 22px;
  border: 1px solid var(--glass-card-border);
  border-radius: var(--radius-lg);
  background-color: var(--glass-card-bg);
  backdrop-filter: var(--glass-card-blur);
  box-shadow: var(--shadow-card);
  transition: background-color var(--dur-base) var(--ease), border-color var(--dur-base) var(--ease),
    box-shadow var(--dur-base) var(--ease), transform var(--dur-base) var(--ease);
}

/* 悬停 / 键盘焦点：上浮 2px + 影更深 + 高光边更亮，与任务卡同一姿态 */
.trash-row:hover,
.trash-row:focus-visible,
.trash-row:has(:focus-visible) {
  border-color: var(--glass-card-border-hover);
  background-color: var(--glass-card-bg-hover);
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-2px);
}

/* 批量模式：整行可点；选中行的品牌浅蓝底优先于 hover */
.trash-row--select {
  cursor: pointer;
}

.trash-row--selected,
.trash-row--selected:hover {
  background-color: var(--color-brand-soft);
}

/*
 * 左侧彻底删除按钮：与任务页勾选圈同尺寸（22px）、同位置（40px 前置位居中）。
 * 默认浅灰描边；悬停转淡红底 + 深红图标，提示「这是删除」。
 */
.trash-row__purge {
  display: flex;
  align-items: center;
  justify-content: center;
  justify-self: center;
  width: 24px;
  height: 24px;
  padding: 0;
  /* 与任务页复选框完全同款：1.5px、文字色 20% 的浅灰描边 */
  border: 1.5px solid color-mix(in srgb, var(--color-text) 20%, transparent);
  border-radius: 50%;
  background-color: transparent;
  color: var(--color-text-3);
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease),
    background-color var(--dur-fast) var(--ease), transform 120ms var(--ease);
}

.trash-row__purge:hover {
  border-color: var(--color-danger);
  background-color: var(--color-danger-soft);
  color: var(--color-danger-text);
  transform: scale(1.06);
}

.trash-row__purge:active {
  transform: scale(0.94);
}

.trash-row__purge:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* 批量选择：同尺寸圆形复选框，选中态品牌蓝 */
.trash-row__box {
  display: flex;
  align-items: center;
  justify-content: center;
  justify-self: center;
  width: 24px;
  height: 24px;
  border: 1.5px solid color-mix(in srgb, var(--color-text) 20%, transparent);
  border-radius: 50%;
  background-color: transparent;
  color: transparent;
  transition: color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease),
    background-color var(--dur-fast) var(--ease);
}

.trash-row__box--on {
  border-color: transparent;
  background-color: var(--color-brand);
  background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0) 62%);
  color: var(--color-brand-fg);
  box-shadow: 0 3px 9px -4px color-mix(in srgb, var(--color-brand) 75%, transparent);
}

.trash-row__box:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.trash-row__body {
  min-width: 0;
}

/* 与任务卡成对：15px / 600 / 微收字距 */
.trash-row__title {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: -0.01em;
  color: var(--color-text);
  word-break: break-word;
}

.trash-row__description {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  /* 固定占位：没填描述也留这一行，所有卡片高度一致 */
  min-height: 22px;
  margin-top: 3px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-text-2);
  word-break: break-word;
}

/* 右侧宽度与任务卡元信息列一致，所有行的右边缘在同一条线上 */
.trash-row__side {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  min-width: 236px;
}

.trash-row__meta {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

/* 剩余天数：与任务卡优先级标记同档（20px 高 / 11.5px），≤7 天转橙 */
.trash-row__pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 22px;
  padding: 0 9px;
  border-radius: var(--radius-pill);
  background-color: color-mix(in srgb, var(--color-text) 7%, transparent);
  color: var(--color-text-2);
  font-size: 12.5px;
  line-height: 1;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.trash-row__pill--soon {
  background-color: var(--color-priority-medium-bg);
  color: var(--color-priority-medium-fg);
  font-weight: 600;
}

/* 删除时间比描述更轻，与任务卡的截止日期同档 */
.trash-row__deleted {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-3);
  white-space: nowrap;
}

/* 右侧恢复：常驻浅灰图标，悬停转成功色 + 一层白玻璃 */
.trash-row__restore {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: var(--radius-control);
  background-color: transparent;
  color: var(--color-text-3);
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease), background-color var(--dur-fast) var(--ease);
}

.trash-row__restore:hover {
  color: var(--color-status-done);
  background-color: var(--control-hover);
}

.trash-row__restore:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
