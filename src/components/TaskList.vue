<script setup lang="ts">
/**
 * 任务列表：一行一任务（2026-10-09 列表页设计更新，原多列瀑布流已按新要求改为单列）。
 * 行距 8px 紧贴、行内留白 18/20px，整列读起来是一条连续的圆角带，而不是一叠孤立的卡片。
 * 首屏骨架屏与真实行同半径，避免加载完成后跳变；触底加载下一页；增删用 TransitionGroup 平滑让位。
 */
import { onMounted, onUnmounted, ref } from 'vue'
import TaskItem from './TaskItem.vue'
import EmptyState from './EmptyState.vue'
import type { Task } from '@/types'

withDefaults(
  defineProps<{
    tasks: Task[]
    /** 首屏加载中：渲染骨架屏 */
    loading?: boolean
    /** 触底加载中：渲染行内 loading，避免重复触发 */
    loadingMore?: boolean
    emptyTitle?: string
    emptyDescription?: string
    emptyActionText?: string
  }>(),
  {
    loading: false,
    loadingMore: false,
    emptyTitle: '还没有任务',
    emptyDescription: '记录第一件事，之后按优先级与截止时间跟踪它。',
    emptyActionText: '新建任务',
  },
)

const emit = defineEmits<{
  edit: [Task]
  remove: [Task]
  'toggle-status': [Task]
  'load-more': []
  'empty-action': []
}>()

const SKELETON_COUNT = 6

const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | undefined

onMounted(() => {
  if (!sentinel.value) return
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) emit('load-more')
    },
    { rootMargin: '200px' },
  )
  observer.observe(sentinel.value)
})

onUnmounted(() => observer?.disconnect())
</script>

<template>
  <div class="task-list">
    <div v-if="loading" class="task-list__rows">
      <div
        v-for="index in SKELETON_COUNT"
        :key="index"
        class="task-list__skeleton"
        aria-hidden="true"
      >
        <div class="task-list__skeleton-check"></div>
        <div class="task-list__skeleton-body">
          <div class="task-list__skeleton-line task-list__skeleton-line--title"></div>
          <div class="task-list__skeleton-line"></div>
        </div>
        <div class="task-list__skeleton-line task-list__skeleton-line--meta"></div>
      </div>
    </div>

    <EmptyState
      v-else-if="tasks.length === 0"
      :title="emptyTitle"
      :description="emptyDescription"
      :action-text="emptyActionText"
      @action="emit('empty-action')"
    />

    <TransitionGroup v-else name="row" tag="div" class="task-list__rows">
      <TaskItem
        v-for="task in tasks"
        :key="task.id"
        :task="task"
        @edit="emit('edit', $event)"
        @remove="emit('remove', $event)"
        @toggle-status="emit('toggle-status', $event)"
      />
    </TransitionGroup>

    <p v-if="loadingMore" class="task-list__more-loading">正在加载…</p>
    <div ref="sentinel" class="task-list__sentinel" aria-hidden="true"></div>
  </div>
</template>

<style scoped>
.task-list {
  container-type: inline-size;
}

.task-list__rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 骨架行的列宽与内边距跟真实行保持一致，避免加载完成后跳变 */
.task-list__skeleton {
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr) 168px 32px;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.task-list__skeleton-check {
  width: 26px;
  height: 26px;
  border-radius: var(--radius-pill);
  background-color: var(--color-hover);
}

.task-list__skeleton-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-list__skeleton-line {
  height: 12px;
  border-radius: var(--radius-sm);
  background-color: var(--color-hover);
}

.task-list__skeleton-line--title {
  width: 60%;
  height: 15px;
}

.task-list__skeleton-line--meta {
  width: 100%;
}

.task-list__more-loading {
  padding: 12px 0 4px;
  font-size: 12px;
  color: var(--color-text-2);
  text-align: center;
}

.task-list__sentinel {
  height: 1px;
}

/* 行进退场与让位：只动 transform 与 opacity（8.7 动效） */
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
