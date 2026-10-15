<script setup lang="ts">
/**
 * 回收站行（一行一任务），与主页的 TaskItem.vue 同一套行版式（2026-10-15 同步改版）：
 * 34px 前置位 + 正文（标题 / 一行描述 / 元信息行）+ 图标操作，卡片壳同为
 * 圆角 / 1px 描边 / 16×20 内边距 / 悬停提亮 —— 目的就是让两个页面读起来是同一列表。
 *
 * 两处刻意的差异：
 *   ① 前置位是「已删除」标记（描边圆圈 + 垃圾桶图标），不是可点的勾选框；
 *   ② 元信息行第一项是「剩余 N 天」而不是优先级——回收站里要抢注意的是保留期。
 * 整行不可点（回收站没有编辑入口），所以不加 role="button" 与 cursor: pointer。
 * 样式与 TaskItem.vue 的 .task-row 成对维护：改一处要同步另一处。
 */
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import { formatDateTime } from '@/utils/date'
import type { TrashTask } from '@/types'

const props = defineProps<{ task: TrashTask }>()
const emit = defineEmits<{ restore: [TrashTask]; purge: [TrashTask] }>()

/** 剩余天数进入一周内就用危险色提示，对齐「到期自动清理」的紧迫感 */
const SOON_DAYS = 7

const soon = computed(() => props.task.remainingDays <= SOON_DAYS)
const deletedText = computed(() => `删除于 ${formatDateTime(props.task.deletedAt)}`)
</script>

<template>
  <article class="trash-row">
    <span class="trash-row__mark" aria-hidden="true">
      <span class="trash-row__mark-ring">
        <AppIcon name="trash" :size="14" />
      </span>
    </span>

    <div class="trash-row__body">
      <h3 class="trash-row__title">{{ task.title }}</h3>
      <p v-if="task.description" class="trash-row__description">{{ task.description }}</p>

      <div class="trash-row__meta">
        <span class="trash-row__pill" :class="{ 'trash-row__pill--soon': soon }">
          剩余 {{ task.remainingDays }} 天
        </span>
        <p class="trash-row__deleted">{{ deletedText }}</p>
      </div>
    </div>

    <div class="trash-row__actions">
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
  </article>
</template>

<style scoped>
.trash-row {
  display: grid;
  /* 前置位与主页同为 34px（那边是命中区、这边是标记位），操作列 72px 放两个 32px 图标 */
  grid-template-columns: 34px minmax(0, 1fr) 72px;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  transition: border-color var(--dur-fast) var(--ease), background-color var(--dur-fast) var(--ease);
}

/* 悬停提亮与主页一致：行内有按钮，所以键盘焦点进入时也给同样反馈 */
.trash-row:hover,
.trash-row:focus-within {
  border-color: var(--color-border-strong);
  background-color: var(--color-hover);
}

/* 前置位：34px 框里放一个 26px 描边圆圈，与主页勾选框同尺寸 */
.trash-row__mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  color: var(--color-text-3);
}

.trash-row__mark-ring {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-pill);
}

.trash-row__body {
  min-width: 0;
}

.trash-row__title {
  font-size: 15px;
  font-weight: 500;
  line-height: 1.45;
  word-break: break-word;
}

/* 描述与主页一样只留一行，超出省略号收尾 */
.trash-row__description {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-top: 2px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-text-2);
  word-break: break-word;
}

/* 元信息行：与主页同一位置（正文下方左对齐），保证两页竖扫时行高节奏一致 */
.trash-row__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
}

/* 胶囊尺寸与主页优先级胶囊一致（20px 高 / 8px 内边距） */
.trash-row__pill {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  font-size: 12px;
  line-height: 1;
  color: var(--color-text-2);
}

.trash-row__pill--soon {
  border-color: var(--color-danger-border);
  color: var(--color-danger);
}

.trash-row__deleted {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-2);
}

.trash-row__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.trash-row__action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
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
  background-color: var(--color-bg);
}

/* 彻底删除：悬停才显危险色，平时保持克制（与主页删除按钮同一处理） */
.trash-row__action--danger:hover {
  color: var(--color-danger);
  background-color: var(--color-bg);
}

/* 窄屏：操作换到第二段、左对齐（与主页行同一套断点与行为） */
@container (max-width: 640px) {
  .trash-row {
    grid-template-columns: 34px minmax(0, 1fr);
    gap: 12px;
  }

  .trash-row__actions {
    grid-column: 2;
    justify-content: flex-start;
  }
}
</style>
