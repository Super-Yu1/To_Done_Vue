<script setup lang="ts">
/**
 * 搜索 + 状态筛选（2026-10-16 合并成一块，状态改成 Tabs）：
 * 上一行是搜索框（防抖 300ms 自动查询）与刷新按钮，下一行是「全部 / 未完成 / 已完成」Tabs。
 * 排序仍是固定规则（未完成在前按创建时间、已完成按完成时间，见 utils/task），
 * 所以不给排序控件，只把规则写在 Tabs 右侧的明面上。
 * query 由调用方持有（真实页来自 todo store、演示页来自本地内存态），按 8.3 直接改它的字段。
 */
import { computed, onUnmounted, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import { SEARCH_DEBOUNCE_MS, TASK_STATUS_OPTIONS } from '@/constants'
import type { TaskQuery, TaskStatus } from '@/types'

const props = defineProps<{ query: TaskQuery }>()
/** change = 「筛选条件变化，请从第 1 页重取」；刷新按钮语义相同，复用同一事件 */
const emit = defineEmits<{ change: [] }>()

/** Tabs 的 value 得是字符串，而 query.status 是 `TaskStatus | undefined` —— 用 all 代表「全部」 */
const ALL = 'all'

const tabs = [
  { value: ALL, label: '全部' },
  ...TASK_STATUS_OPTIONS.map((item) => ({ value: item.value as string, label: item.label })),
]

const activeTab = computed({
  get: () => props.query.status ?? ALL,
  set: (value: string) => {
    props.query.status = value === ALL ? undefined : (value as TaskStatus)
    emit('change')
  },
})

let debounceTimer: number | undefined

watch(
  () => props.query.keyword,
  () => {
    window.clearTimeout(debounceTimer)
    debounceTimer = window.setTimeout(() => emit('change'), SEARCH_DEBOUNCE_MS)
  },
)

onUnmounted(() => window.clearTimeout(debounceTimer))
</script>

<template>
  <div class="filter-bar">
    <div class="filter-bar__row">
      <el-input
        v-model="query.keyword"
        class="filter-bar__search"
        placeholder="搜索标题或描述"
        clearable
      >
        <template #prefix>
          <AppIcon name="search" />
        </template>
      </el-input>

      <el-button class="filter-bar__refresh" @click="emit('change')">
        <AppIcon name="refresh" />
        <span class="filter-bar__refresh-text">刷新</span>
      </el-button>
    </div>

    <div class="filter-bar__row filter-bar__row--tabs">
      <el-tabs v-model="activeTab" class="filter-bar__tabs">
        <el-tab-pane v-for="tab in tabs" :key="tab.value" :label="tab.label" :name="tab.value" />
      </el-tabs>
      <span class="filter-bar__order">未完成在前 · 按创建时间；已完成按完成时间</span>
    </div>
  </div>
</template>

<style scoped>
.filter-bar {
  display: grid;
  gap: 8px;
  padding: 16px 0 0;
}

.filter-bar__row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-bar__search {
  flex: 1;
  min-width: 200px;
}

.filter-bar__refresh-text {
  margin-left: 6px;
}

/* Tabs 贴住筛选条：去掉 EP 的头部外边距，行高收到 36px（与搜索框同高） */
.filter-bar__tabs {
  flex: 1;
  min-width: 240px;
}

.filter-bar__tabs :deep(.el-tabs__header) {
  margin: 0;
}

.filter-bar__tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background-color: var(--color-border);
}

.filter-bar__tabs :deep(.el-tabs__item) {
  height: 36px;
  padding: 0 2px;
  margin-right: 22px;
  font-size: 14px;
}

.filter-bar__order {
  flex: none;
  font-size: 12px;
  color: var(--color-text-3);
}
</style>
