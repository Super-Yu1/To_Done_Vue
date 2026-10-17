<script setup lang="ts">
/**
 * 回收站列表（UC-06 / 8.8）：真实页与演示页共用；只负责渲染与转发动作，不含数据来源。
 * 2026-10-18 同步任务主页的视觉：浅灰搜索框 + 文字按钮、白卡行、12px 行距、20px 页面节奏。
 * 具体行长什么样见 TrashItem.vue（两处成对维护）。
 */
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import EmptyState from './EmptyState.vue'
import TrashItem from './TrashItem.vue'
import type { TrashTask } from '@/types'

const props = defineProps<{
  tasks: TrashTask[]
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
}>()

const allSelected = computed(
  () => props.tasks.length > 0 && (props.selectedIds?.length ?? 0) >= props.tasks.length,
)
</script>

<template>
  <div class="trash">
    <header class="trash__header">
      <h1 class="trash__title">回收站</h1>
      <p class="trash__hint">
        这里的任务可恢复；超过保留期后会被系统自动清理，彻底删除则立即不可恢复。
      </p>
    </header>

    <!-- 工具栏：与任务页同一套「搜索占满 + 动作靠右」的单行结构 -->
    <div class="trash__toolbar">
      <el-input v-model="keyword" class="trash__search" placeholder="搜索标题或描述" clearable>
        <template #prefix>
          <AppIcon name="search" />
        </template>
      </el-input>

      <div class="trash__tools">
        <template v-if="!selectMode">
          <button class="trash__ghost" type="button" @click="emit('enter-select')">批量选择</button>

          <!-- 清空是破坏性动作：白底描边、悬停才转红，不做主按钮 -->
          <el-button
            class="trash__clear"
            :disabled="clearDisabled"
            :loading="clearing"
            @click="emit('clear')"
          >
            <AppIcon name="trash" />
            <span class="btn-text">清空回收站</span>
          </el-button>
        </template>

        <template v-else>
          <span class="trash__count">
            已选 <strong>{{ selectedIds?.length ?? 0 }}</strong> 条
          </span>
          <button class="trash__ghost" type="button" @click="emit('toggle-all')">
            {{ allSelected ? '取消全选' : '全选' }}（{{ tasks.length }}）
          </button>
          <el-button
            class="trash__batch"
            type="primary"
            :loading="batchBusy"
            :disabled="!selectedIds?.length"
            @click="emit('batch-restore')"
          >
            批量恢复
          </el-button>
          <button class="trash__ghost" type="button" @click="emit('exit-select')">退出选择</button>
        </template>
      </div>
    </div>

    <EmptyState
      v-if="tasks.length === 0"
      :title="keyword ? '没有匹配的任务' : '回收站是空的'"
      :description="keyword ? '换个关键词试试。' : '删掉的任务会先放到这里，不会立刻消失。'"
    />

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
  </div>
</template>

<style scoped>
/* 页面纵向节奏与任务页一致：页头 → 工具栏 → 列表统一 20px */
.trash {
  display: flex;
  flex-direction: column;
  gap: 20px;
  /* 让 TrashItem 里的 @container 断点以列表宽度为准（与 TaskList 同一做法） */
  container-type: inline-size;
}

.trash__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.trash__title {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.4;
}

.trash__hint {
  font-size: 12px;
  line-height: 1.7;
  color: var(--color-text-2);
}

.trash__toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.trash__search {
  flex: 1;
  min-width: 240px;
}

/* 与任务页搜索框同一套：浅灰长条、无描边，悬停 / 聚焦才显边界 */
.trash__search :deep(.el-input__wrapper) {
  height: 42px;
  padding: 1px 14px;
  border-radius: var(--radius-md);
  background-color: var(--color-bg-soft);
  box-shadow: inset 0 0 0 1px transparent;
  transition: background-color var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease);
}

.trash__search :deep(.el-input__wrapper:hover) {
  background-color: var(--color-surface);
  box-shadow: inset 0 0 0 1px var(--color-border-strong);
}

.trash__search :deep(.el-input__wrapper.is-focus) {
  background-color: var(--color-surface);
  box-shadow: inset 0 0 0 1px var(--color-text);
}

.trash__search :deep(.el-input__prefix) {
  color: var(--color-text-3);
}

.trash__search :deep(.el-input__inner) {
  font-size: 14px;
}

.trash__tools {
  display: flex;
  flex: none;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

/* 文字按钮：无框无底，悬停才浮一层浅灰（与任务页的「排序 / 批量选择」同款） */
.trash__ghost {
  display: inline-flex;
  flex: none;
  align-items: center;
  height: 32px;
  padding: 0 10px;
  border: none;
  border-radius: var(--radius-md);
  background-color: transparent;
  color: var(--color-text-2);
  font-size: 13px;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease), background-color var(--dur-fast) var(--ease);
}

.trash__ghost:hover {
  color: var(--color-text);
  background-color: var(--color-bg-soft);
}

.trash__ghost:focus-visible {
  outline: 2px solid var(--color-text);
  outline-offset: 2px;
}

/* 清空：与搜索框同高，破坏性动作靠颜色提示而不是体量 */
.trash__clear {
  height: 42px;
  margin-left: 0;
  padding: 0 16px;
  border-color: var(--color-border-strong);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-text-2);
  font-size: 14px;
  transition: color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease),
    background-color var(--dur-fast) var(--ease);
}

.trash__clear:hover:not(.is-disabled) {
  border-color: var(--color-danger);
  background-color: var(--color-danger-bg);
  color: var(--color-danger);
}

.trash__batch {
  height: 36px;
  margin-left: 0;
  padding: 0 16px;
  border-radius: var(--radius-md);
  font-size: 13px;
}

.trash__count {
  margin-right: 2px;
  font-size: 13px;
  color: var(--color-text-2);
}

.trash__count strong {
  color: var(--color-text);
}

.trash__rows {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
