<script setup lang="ts">
/**
 * 回收站行（2026-10-18 与任务页骨架对齐）：
 * 最左侧是 40px 前置位 —— 普通模式放 24px 圆形垃圾桶按钮（点击 = 彻底删除），
 * 批量模式同位置换成圆形复选框；与任务页的 Checkbox 大小、位置完全一致。
 *
 * 右侧是「剩余 N 天 + 删除时间」，靠右对齐；时间右侧保留一个恢复图标按钮。
 * 彻底删除的二次确认在调用方（TrashView / DemoTrashView）里做。
 */
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
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
    <button
      v-if="!selectMode"
      class="trash-row__purge"
      type="button"
      :aria-label="`彻底删除：${task.title}`"
      title="彻底删除"
      @click.stop="emit('purge', task)"
    >
      <AppIcon name="trash" :size="13" />
    </button>

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
      <AppIcon v-if="selected" name="check" :size="13" />
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

      <button
        v-if="!selectMode"
        class="trash-row__restore"
        type="button"
        :aria-label="`恢复：${task.title}`"
        title="恢复"
        @click.stop="emit('restore', task)"
      >
        <AppIcon name="restore" :size="15" />
      </button>
    </div>
  </article>
</template>

<style scoped>
/* 与任务页同一套骨架：40px 前置位 + 正文 + 右侧元信息；无描边、16px 圆角 */
.trash-row {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  border: none;
  border-radius: var(--radius-card);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-card);
  transition: box-shadow var(--dur-base) var(--ease), transform var(--dur-base) var(--ease),
    background-color var(--dur-fast) var(--ease);
}

/* 整行悬停：极浅灰底 + 轻浮起 */
.trash-row:hover,
.trash-row:focus-within {
  background-color: var(--color-row-hover);
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-1px);
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
 * 左侧彻底删除按钮：与任务页复选框同尺寸、同位置（24px 圆形 + 8px 外边距）。
 * 默认浅灰；悬停转淡红底 + 深红图标，提示「这是删除」。
 */
.trash-row__purge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin: 0 8px;
  padding: 0;
  /* 与任务页复选框完全同款：1.5px、文字色 18% 的浅灰描边 */
  border: 1.5px solid color-mix(in srgb, var(--color-text) 18%, transparent);
  border-radius: 50%;
  background-color: transparent;
  color: var(--color-text-3);
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease),
    background-color var(--dur-fast) var(--ease);
}

.trash-row__purge:hover {
  border-color: var(--color-danger);
  background-color: var(--color-danger-soft);
  color: var(--color-danger-text);
}

/* 批量选择：同尺寸圆形复选框，选中态品牌蓝 */
.trash-row__box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin: 0 8px;
  border: 1.5px solid color-mix(in srgb, var(--color-text) 18%, transparent);
  border-radius: 50%;
  background-color: var(--color-surface);
  color: transparent;
  transition: color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease),
    background-color var(--dur-fast) var(--ease);
}

.trash-row__box--on {
  border-color: var(--color-brand);
  background-color: var(--color-brand);
  color: var(--color-brand-fg);
}

.trash-row__body {
  min-width: 0;
}

/* 与任务页成对：标题 16px/600、描述 13px 单行占位 */
.trash-row__title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
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
  min-height: 21px;
  margin-top: 3px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-2);
  word-break: break-word;
}

/* 右侧宽度与任务页元信息列一致，所有行的右边缘在同一条线上 */
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

/* 剩余天数胶囊：浅灰底，图标跟随文字色；≤7 天转橙色 */
.trash-row__pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 22px;
  padding: 0 8px;
  border-radius: var(--radius-pill);
  background-color: var(--color-bg-soft);
  color: var(--color-text-2);
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
}

.trash-row__pill--soon {
  background-color: var(--color-priority-medium-bg);
  color: var(--color-priority-medium-fg);
  font-weight: 600;
}

.trash-row__deleted {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-3);
  white-space: nowrap;
}

/* 右侧恢复：常驻浅灰图标，悬停转成功色 */
.trash-row__restore {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: none;
  border-radius: var(--radius-md);
  background-color: transparent;
  color: var(--color-text-3);
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease), background-color var(--dur-fast) var(--ease);
}

.trash-row__restore:hover {
  color: var(--color-status-done);
  background-color: var(--color-bg-soft);
}

/* 窄容器：右侧元信息换到正文下方，左元信息、右恢复 */
@container (max-width: 720px) {
  .trash-row {
    grid-template-columns: 40px minmax(0, 1fr);
    gap: 12px;
  }

  .trash-row__side {
    grid-column: 2;
    width: 100%;
    min-width: 0;
    justify-content: space-between;
  }

  .trash-row__meta {
    justify-content: flex-start;
  }
}
</style>
