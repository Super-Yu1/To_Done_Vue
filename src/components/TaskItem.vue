<script setup lang="ts">
/**
 * 任务行（一行一任务）：
 * 只显示标题 + **一行**描述，不展示配图；整行就是编辑入口——点卡片进编辑，
 * 勾选与删除各自 stop，不会连带触发编辑。
 * 右侧元信息列定宽右对齐，让优先级与截止时间在整页形成可竖扫的一条线。
 */
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import { TASK_PRIORITY_COLOR, TASK_PRIORITY_LABEL } from '@/constants'
import { formatDateTime, isOverdue } from '@/utils/date'
import type { Task } from '@/types'

const props = defineProps<{ task: Task }>()
const emit = defineEmits<{ edit: [Task]; remove: [Task]; 'toggle-status': [Task] }>()

const isDone = computed(() => props.task.status === 'DONE')
const overdue = computed(() => isOverdue(props.task.dueDate, props.task.status))
const dueText = computed(() =>
  props.task.dueDate ? formatDateTime(props.task.dueDate) : '未设截止时间',
)

/** 整行点击即编辑；但用户若正在划选文字（例如想复制描述），这一下不该被当成点击 */
function handleEdit() {
  if (window.getSelection()?.toString()) return
  emit('edit', props.task)
}
</script>

<template>
  <article
    class="task-row"
    :class="{ 'task-row--done': isDone }"
    role="button"
    tabindex="0"
    :aria-label="`编辑任务：${task.title}`"
    @click="handleEdit"
    @keydown.enter.prevent="handleEdit"
    @keydown.space.prevent="handleEdit"
  >
    <button
      class="task-row__check"
      type="button"
      :aria-pressed="isDone"
      :aria-label="isDone ? '标记为未完成' : '标记为已完成'"
      @click.stop="emit('toggle-status', task)"
    >
      <AppIcon name="check" :size="14" />
    </button>

    <div class="task-row__body">
      <h3 class="task-row__title">{{ task.title }}</h3>
      <p v-if="task.description" class="task-row__description">{{ task.description }}</p>
    </div>

    <div class="task-row__meta">
      <span class="task-row__pill" :style="{ color: TASK_PRIORITY_COLOR[task.priority] }">
        {{ TASK_PRIORITY_LABEL[task.priority] }}
      </span>
      <p class="task-row__due" :class="{ 'task-row__due--overdue': overdue }">
        <span v-if="overdue" class="task-row__overdue-dot" aria-hidden="true"></span>
        {{ dueText }}
      </p>
    </div>

    <div class="task-row__actions">
      <button
        class="task-row__action"
        type="button"
        :aria-label="`删除：${task.title}`"
        title="删除"
        @click.stop="emit('remove', task)"
      >
        <AppIcon name="trash" />
      </button>
    </div>
  </article>
</template>

<style scoped>
.task-row {
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr) 168px 32px;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  cursor: pointer;
  transition: border-color var(--dur-fast) var(--ease), background-color var(--dur-fast) var(--ease);
}

.task-row:hover,
.task-row:focus-within {
  border-color: var(--color-border-strong);
  background-color: var(--color-hover);
}

/* 勾选：26px 命中区，全圆描边，完成后填状态色 */
.task-row__check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-pill);
  background-color: transparent;
  color: transparent;
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease),
    background-color var(--dur-fast) var(--ease);
}

.task-row__check:hover {
  border-color: var(--color-status-done);
  color: var(--color-status-done);
}

.task-row__body {
  min-width: 0;
}

.task-row__title {
  font-size: 15px;
  font-weight: 500;
  line-height: 1.45;
  word-break: break-word;
  /*
   * 勾选完成时的横线：平时宽度为 0，加上 --done 后自左向右划出来。
   * 用 background 画线而不是 text-decoration，是因为后者只能瞬间出现、不能"由无到有"。
   */
  background-image: linear-gradient(currentColor, currentColor);
  background-repeat: no-repeat;
  background-position: 0 55%;
  background-size: 0 1px;
  transition: color var(--dur-strike) var(--ease), background-size var(--dur-strike) var(--ease);
}

/* 描述只留一行，超出部分省略号收尾 */
.task-row__description {
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

/* 元信息列：右对齐 + 等宽数字，整页竖扫时优先级与时间对齐成一条线 */
.task-row__meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  text-align: right;
}

.task-row__pill {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  font-size: 12px;
  line-height: 1;
}

.task-row__due {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-2);
}

.task-row__due--overdue {
  color: var(--color-danger);
}

.task-row__overdue-dot {
  width: 5px;
  height: 5px;
  border-radius: var(--radius-pill);
  background-color: currentColor;
}

.task-row__actions {
  display: flex;
  justify-content: flex-end;
}

.task-row__action {
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

/* 整行可点之后，只有删除按钮还需要 hover 反馈；hover 才显危险色，平时保持克制 */
.task-row__action:hover {
  color: var(--color-danger);
  background-color: var(--color-bg);
}

/* 已完成：标题转次要色，横线从 0 拉到 100%（宽度过渡在上面那条规则里） */
.task-row--done .task-row__title {
  color: var(--color-text-2);
  background-size: 100% 1px;
}

.task-row--done .task-row__check {
  border-color: var(--color-status-done);
  background-color: var(--color-status-done);
  color: var(--color-surface);
}

.task-row--done .task-row__due {
  color: var(--color-text-3);
}

/* 窄屏：元信息与删除换到第二段，左对齐（桌面优先，这里只保证不挤坏） */
@container (max-width: 640px) {
  .task-row {
    grid-template-columns: 26px minmax(0, 1fr);
    gap: 12px;
  }

  .task-row__meta {
    grid-column: 2;
    align-items: flex-start;
    text-align: left;
  }

  .task-row__actions {
    grid-column: 2;
    justify-content: flex-start;
  }
}
</style>
