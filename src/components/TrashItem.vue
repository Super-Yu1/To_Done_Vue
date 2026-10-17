<script setup lang="ts">
/**
 * 回收站行（2026-10-18 同步任务主页的新版式）：
 * 白卡 + 26px 方形标记 + 标题 / 描述 + 右侧「剩余 N 天 / 删除时间」与操作列。
 *
 * 与主页 TaskItem 的差异只有两处（形状与内容对齐，视觉节奏保持一致）：
 *   ① 前置位是「已删除」标记（方形浅灰底 + 垃圾桶图标），不是可点的完成框；
 *   ② 右侧元信息第一项是「剩余 N 天」而不是优先级 —— 回收站里要抢注意的是保留期。
 * 整行不可点（回收站没有编辑入口），所以不加 role="button" 与 cursor: pointer。
 * 样式与 TaskItem.vue 的 .task-row 成对维护：改一处要同步另一处。
 */
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import { formatDueLabel } from '@/utils/date'
import type { TrashTask } from '@/types'

const props = defineProps<{
  task: TrashTask
  /** 批量恢复的选择模式：前置位换成方形勾选框、整行可点、行尾操作隐藏 */
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

/** 剩余天数进入一周内就用危险色提示，对齐「到期自动清理」的紧迫感 */
const SOON_DAYS = 7

const soon = computed(() => props.task.remainingDays <= SOON_DAYS)
/** 删除时间用与任务页同一套人类可读格式（今天 / 明天带时刻，其余 MM-DD） */
const deletedText = computed(() => `删除于 ${formatDueLabel(props.task.deletedAt)}`)
</script>

<template>
  <article
    class="trash-row"
    :class="{ 'trash-row--select': selectMode, 'trash-row--selected': selected }"
    @click="handleRowClick"
  >
    <!-- 选择模式：方形勾选框（与「已删除」标记同尺寸，选中态用正文色实底） -->
    <span
      v-if="selectMode"
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

    <span v-else class="trash-row__mark" aria-hidden="true">
      <span class="trash-row__mark-box">
        <AppIcon name="trash" :size="14" />
      </span>
    </span>

    <div class="trash-row__body">
      <h3 class="trash-row__title">{{ task.title }}</h3>
      <!-- 与任务主页一致：描述是可选字段，但这一行始终占位，行高才统一 -->
      <p class="trash-row__description">{{ task.description || '' }}</p>
    </div>

    <!-- 右侧：剩余天数 + 删除时间，操作按钮留固定位置、悬停才显形（不推动布局） -->
    <div class="trash-row__side">
      <div class="trash-row__meta">
        <span class="trash-row__pill" :class="{ 'trash-row__pill--soon': soon }">
          剩余 {{ task.remainingDays }} 天
        </span>
        <p class="trash-row__deleted">
          <AppIcon name="clock" :size="12" />
          {{ deletedText }}
        </p>
      </div>

      <div v-if="!selectMode" class="trash-row__actions">
        <button
          class="trash-row__action"
          type="button"
          :aria-label="`恢复：${task.title}`"
          title="恢复"
          @click="emit('restore', task)"
        >
          <AppIcon name="restore" />
        </button>
        <button
          class="trash-row__action trash-row__action--danger"
          type="button"
          :aria-label="`彻底删除：${task.title}`"
          title="彻底删除"
          @click="emit('purge', task)"
        >
          <AppIcon name="trash" />
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.trash-row {
  display: grid;
  /* 与 TaskItem 同一套骨架：40px 前置位 + 正文 + 右侧元信息 / 操作 */
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-card);
  transition: border-color var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease),
    background-color var(--dur-fast) var(--ease);
}

/* 与任务卡同一套悬停：边框加深 + 轻阴影浮起，底色保持白 */
.trash-row:hover,
.trash-row:focus-within {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-card-hover);
}

/* 前置位：40px 命中位里放 26px 方形标记，与主页复选框同尺寸、同圆角 */
.trash-row__mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  /* 图标是这一行唯一的「已删除」提示，压到次要正文色才看得清 */
  color: var(--color-text-2);
}

.trash-row__mark-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1.5px solid color-mix(in srgb, var(--color-text) 14%, transparent);
  border-radius: 8px;
  background-color: var(--color-bg-soft);
}

/* 批量恢复：选择模式下整行可点，选中行留一个持久高亮 */
.trash-row--select {
  cursor: pointer;
}

.trash-row--selected {
  border-color: var(--color-border-strong);
  background-color: var(--color-hover);
}

.trash-row__box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  margin: 0 7px;
  border: 1.5px solid color-mix(in srgb, var(--color-text) 26%, transparent);
  border-radius: 8px;
  background-color: var(--color-surface);
  color: transparent;
  transition: color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease),
    background-color var(--dur-fast) var(--ease);
}

.trash-row__box--on {
  border-color: var(--color-primary-bg);
  background-color: var(--color-primary-bg);
  color: var(--color-primary-fg);
}

.trash-row__body {
  min-width: 0;
}

/* 与主页成对：标题 16px/600、描述 13px */
.trash-row__title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--color-text);
  word-break: break-word;
}

/* 描述与主页一样只留一行，超出省略号收尾 */
.trash-row__description {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  /* 占位高度 = 一行正文（同任务主页）：没有描述也留这一行，行高一致 */
  min-height: 21px;
  margin-top: 3px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-2);
  word-break: break-word;
}

.trash-row__side {
  display: flex;
  flex: none;
  align-items: center;
  gap: 12px;
}

.trash-row__meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 胶囊：与任务页优先级胶囊同一档尺寸（22px 高 / 12px 字），浅底同色字 */
.trash-row__pill {
  display: inline-flex;
  align-items: center;
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
  background-color: var(--color-danger-bg);
  color: var(--color-danger);
}

.trash-row__deleted {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-2);
  white-space: nowrap;
}

/* 操作平时收起、悬停或焦点进入才显形（与主页同一处理；触屏设备常显） */
.trash-row__actions {
  display: flex;
  flex: none;
  width: 60px;
  justify-content: flex-end;
  gap: 2px;
  transition: opacity var(--dur-fast) var(--ease);
}

@media (hover: hover) {
  .trash-row__actions {
    opacity: 0;
  }

  .trash-row:hover .trash-row__actions,
  .trash-row:focus-within .trash-row__actions {
    opacity: 1;
  }
}

.trash-row__action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 29px;
  height: 29px;
  padding: 0;
  border: none;
  border-radius: var(--radius-md);
  background-color: transparent;
  color: var(--color-text-3);
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease), background-color var(--dur-fast) var(--ease);
}

/* 恢复：悬停给状态色（与「完成」同一支绿），表示把任务放回去 */
.trash-row__action:hover {
  color: var(--color-status-done);
  background-color: var(--color-bg-soft);
}

/* 彻底删除：常驻红底（危险动作要一眼看出来），悬停更深；恢复仍保持中性 */
.trash-row__action--danger {
  background-color: var(--color-danger);
  color: var(--color-danger-fg);
}

.trash-row__action--danger:hover {
  background-color: var(--color-danger-hover);
  color: var(--color-danger-fg);
}

/* 窄容器：右侧元信息换到正文下方，左元信息、右操作 */
@container (max-width: 720px) {
  .trash-row {
    grid-template-columns: 40px minmax(0, 1fr);
    gap: 12px;
  }

  .trash-row__side {
    grid-column: 2;
    width: 100%;
    justify-content: space-between;
  }

  .trash-row__actions {
    opacity: 1;
  }
}
</style>
