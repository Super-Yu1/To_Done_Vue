<script setup lang="ts">
/**
 * 优先级选择（三档）：任务行的优先级胶囊 popover 与批量操作条共用。
 * 选项直接读 TASK_PRIORITY_OPTIONS —— 与编辑弹窗里的下拉同源，顺序不会各写一套。
 */
import AppIcon from './AppIcon.vue'
import { TASK_PRIORITY_CLASS, TASK_PRIORITY_LABEL, TASK_PRIORITY_OPTIONS } from '@/constants'
import type { TaskPriority } from '@/types'

defineProps<{ value?: TaskPriority }>()
const emit = defineEmits<{ pick: [TaskPriority] }>()
</script>

<template>
  <div class="priority-picker">
    <button
      v-for="item in TASK_PRIORITY_OPTIONS"
      :key="item.value"
      class="priority-picker__item"
      :class="{ 'priority-picker__item--current': item.value === value }"
      type="button"
      @click="emit('pick', item.value)"
    >
      <span class="prio" :class="TASK_PRIORITY_CLASS[item.value]">
        <span class="prio__dot" :class="{ 'prio__dot--hollow': item.value !== 'HIGH' }" aria-hidden="true" />
        {{ TASK_PRIORITY_LABEL[item.value] }}
      </span>
      <AppIcon v-if="item.value === value" name="check" :size="14" />
    </button>
  </div>
</template>

<style scoped>
.priority-picker {
  display: flex;
  flex-direction: column;
  margin: -4px -8px;
}

.priority-picker__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 8px;
  border: none;
  border-radius: var(--radius-sm);
  background-color: transparent;
  color: var(--color-text);
  font-size: 13px;
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease);
}

.priority-picker__item:hover {
  background-color: var(--color-hover);
}

.priority-picker__item--current {
  color: var(--color-text);
}
</style>
