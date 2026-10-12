<script setup lang="ts">
/**
 * 回收站列表（UC-06 / 8.8）：真实页与演示页共用；只负责渲染与转发动作，不含数据来源。
 * 行版式与主页的 TaskList 对齐：同为「一行一任务 + 行距 8px + TransitionGroup 让位」，
 * 具体行长什么样见 TrashItem.vue。
 */
import AppIcon from './AppIcon.vue'
import EmptyState from './EmptyState.vue'
import TrashItem from './TrashItem.vue'
import type { TrashTask } from '@/types'

defineProps<{
  tasks: TrashTask[]
  clearing?: boolean
  clearDisabled?: boolean
}>()

const emit = defineEmits<{ restore: [TrashTask]; purge: [TrashTask]; clear: [] }>()
</script>

<template>
  <div class="trash">
    <header class="trash__header">
      <div>
        <h1 class="page-title">回收站</h1>
        <p class="trash__hint">
          这里的任务可恢复；超过保留期后会被系统自动清理，彻底删除则立即不可恢复。
        </p>
      </div>
      <el-button :disabled="clearDisabled" :loading="clearing" @click="emit('clear')">
        <AppIcon name="trash" />
        <span class="btn-text">清空回收站</span>
      </el-button>
    </header>

    <EmptyState
      v-if="tasks.length === 0"
      title="回收站是空的"
      description="删掉的任务会先放到这里，不会立刻消失。"
    />

    <TransitionGroup v-else name="row" tag="div" class="trash__rows">
      <TrashItem
        v-for="task in tasks"
        :key="task.id"
        :task="task"
        @restore="emit('restore', $event)"
        @purge="emit('purge', $event)"
      />
    </TransitionGroup>
  </div>
</template>

<style scoped>
/* 让 TrashItem 里的 @container 断点以列表宽度为准（与 TaskList 同一做法） */
.trash {
  container-type: inline-size;
}

.trash__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.trash__hint {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--color-text-2);
}

.trash__rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 20px;
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
