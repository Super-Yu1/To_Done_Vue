<script setup lang="ts">
/**
 * 任务列表（2026-10-27 四改：回到「一行一卡」）：
 * 每行是一块独立玻璃卡，卡与卡之间留 10px —— 一列卡各自浮在渐变上；
 * 悬停上浮、勾选完成原地缩小淡出，仍是 TransitionGroup 负责（420ms）。
 * 行骨架与真实卡同栅格（40px 前置位 / 正文 / 236px 元信息），加载完成不跳版。
 * 尾部 #footer 插槽（快速录入）落在最后一张卡之后，自己也是一张卡。
 */
import { onMounted, onUnmounted, ref } from 'vue'
import TaskItem from './TaskItem.vue'
import EmptyState from './EmptyState.vue'
import ListMoreHint from './ListMoreHint.vue'
import type { Task } from '@/types'

withDefaults(
  defineProps<{
    tasks: Task[]
    /** 首屏加载中：渲染骨架屏 */
    loading?: boolean
    /** 触底加载中：显示底部提示（与回收站共用 ListMoreHint；默认关闭，页面传 :loading-more 才启用） */
    loadingMore?: boolean
    /** 批量选择模式：前置位换方形多选框、行内快捷入口禁用 */
    selectMode?: boolean
    /** 当前只看「未完成」：勾选完成后该行会离开列表，由 TaskItem 先播退场动画 */
    leavingOnToggle?: boolean
    /** 已选中的任务 id（选择模式下使用） */
    selectedIds?: string[]
    emptyTitle?: string
    emptyDescription?: string
    emptyActionText?: string
  }>(),
  {
    loading: false,
    loadingMore: false,
    selectMode: false,
    leavingOnToggle: false,
    selectedIds: () => [],
    emptyTitle: '还没有任务',
    emptyDescription: '记录第一件事，之后按优先级与截止时间跟踪它。',
    emptyActionText: '新建任务',
  },
)

const emit = defineEmits<{
  /** 点击任务行：直接打开编辑弹窗（2026-10-27 起没有只读详情） */
  open: [Task]
  remove: [Task]
  'toggle-status': [Task]
  'toggle-select': [Task]
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
    <div v-if="loading" class="task-list__skeletons" aria-busy="true">
      <div
        v-for="index in SKELETON_COUNT"
        :key="index"
        class="task-list__skeleton"
        aria-hidden="true"
      >
        <div class="task-list__skeleton-check"></div>
        <div class="task-list__skeleton-body">
          <div class="task-list__skeleton-line task-list__skeleton-line--title"></div>
          <div class="task-list__skeleton-line task-list__skeleton-line--meta"></div>
        </div>
      </div>
    </div>

    <div v-else-if="tasks.length === 0" class="task-list__empty">
      <EmptyState
        :title="emptyTitle"
        :description="emptyDescription"
        :action-text="emptyActionText"
        @action="emit('empty-action')"
      />
    </div>

    <TransitionGroup v-else name="row" tag="div" class="task-list__rows">
      <TaskItem
        v-for="task in tasks"
        :key="task.id"
        :task="task"
        :select-mode="selectMode"
        :leave-on-toggle="leavingOnToggle"
        :selected="selectedIds.includes(task.id)"
        @open="emit('open', $event)"
        @remove="emit('remove', $event)"
        @toggle-status="emit('toggle-status', $event)"
        @toggle-select="emit('toggle-select', $event)"
      />
    </TransitionGroup>

    <slot v-if="!loading" name="footer" />

    <ListMoreHint :loading="loadingMore" />
    <div ref="sentinel" class="task-list__sentinel" aria-hidden="true"></div>
  </div>
</template>

<style scoped>
.task-list {
  container-type: inline-size;
  display: flex;
  flex-direction: column;
}

/* 卡与卡之间 10px：一列卡各自成块，间距靠空气而不是分隔线 */
.task-list__rows,
.task-list__skeletons {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 空状态也住在一张卡里，与有任务时是同一张脸 */
.task-list__empty {
  border: 1px solid var(--glass-card-border);
  border-radius: var(--radius-lg);
  background-color: var(--glass-card-bg);
  backdrop-filter: var(--glass-card-blur);
  box-shadow: var(--shadow-card);
}

/* 骨架卡的列宽与内边距跟真实卡一致，避免加载完成后跳变（跟 .task-row 同步改） */
.task-list__skeleton {
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

.task-list__skeleton-check {
  width: 22px;
  height: 22px;
  margin: 0 9px;
  border-radius: 50%;
  background-color: color-mix(in srgb, var(--color-text) 8%, transparent);
}

.task-list__skeleton-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-list__skeleton-line {
  height: 12px;
  border-radius: var(--radius-sm);
  background-color: color-mix(in srgb, var(--color-text) 7%, transparent);
}

.task-list__skeleton-line--title {
  width: 60%;
  height: 15px;
}

/* 与真实卡的元信息行同高同位置（标题下方、左对齐、约占三分之一） */
.task-list__skeleton-line--meta {
  width: 32%;
  height: 16px;
}

.task-list__sentinel {
  height: 1px;
}

/*
 * 行进退场与让位：只动 transform 与 opacity（8.7 动效）。
 * 选择器带上 .task-list__rows：卡片自己也写了 transition（悬停四件套），
 * 这几条得压过 .task-row，420ms 的补位节奏才不会被换成 300ms 的悬停曲线。
 */
.task-list__rows .row-enter-active {
  transition: opacity var(--dur-base) var(--ease), transform var(--dur-base) var(--ease);
}

.task-list__rows .row-leave-active {
  /*
   * 离开的卡脱离文档流（位置仍取它原来的 static position）：
   * 勾选完成的退场动画播完后卡已透明，这里不让它继续占位，下方卡马上平滑补上。
   */
  position: absolute;
  width: 100%;
  transition: opacity var(--dur-fast) var(--ease), transform var(--dur-fast) var(--ease);
}

.row-enter-from,
.row-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

/*
 * 勾选完成：元素离开前已带 task-row--leaving（完成态），
 * leave 过渡放慢到与补位同一个 420ms，并缩小到 0.84 —— 下方同一时刻开始上滑。
 */
.row-leave-active.task-row--leaving {
  transition-duration: var(--dur-reorder), var(--dur-reorder);
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1), cubic-bezier(0.4, 0, 0.2, 1);
}

.row-leave-to.task-row--leaving {
  transform: scale(0.84);
}

/*
 * 行让位：慢一点、从下往上滑到新位置，不再「跳一下」就到位。
 * 曲线选 ease-in-out 而不是强 ease-out：起步不抢帧，整段位移都看得见。
 */
.task-list__rows .row-move {
  transition: transform var(--dur-reorder) cubic-bezier(0.45, 0.03, 0.2, 1);
  will-change: transform;
}
</style>
