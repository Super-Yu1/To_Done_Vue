<script setup lang="ts">
/**
 * 筛选条（8.8）：搜索输入防抖 300ms 后自动查询，无需点按钮。
 * 状态只有「未完成 / 已完成」两档（2026-10-09 需求变更）。
 * 列表顺序改为固定规则（未完成在前按创建时间、已完成在后按完成时间，见 utils/task），
 * 所以这里不再提供排序选择和「只看未完成」开关——前者会与固定规则冲突，后者与状态筛选重复。
 * query 由调用方持有（真实页来自 todo store、演示页来自本地内存态），按 8.3 直接改它的字段。
 */
import { onUnmounted, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import { SEARCH_DEBOUNCE_MS, TASK_STATUS_OPTIONS } from '@/constants'
import type { TaskQuery } from '@/types'

const props = defineProps<{ query: TaskQuery }>()
/** change = 「筛选条件变化，请从第 1 页重取」；刷新按钮语义相同，复用同一事件 */
const emit = defineEmits<{ change: [] }>()

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

    <el-select
      v-model="query.status"
      class="filter-bar__select"
      placeholder="全部"
      clearable
      @change="emit('change')"
    >
      <el-option
        v-for="item in TASK_STATUS_OPTIONS"
        :key="item.value"
        :label="item.label"
        :value="item.value"
      />
    </el-select>

    <el-button @click="emit('change')">
      <AppIcon name="refresh" />
      <span class="filter-bar__refresh-text">刷新</span>
    </el-button>
  </div>
</template>

<style scoped>
.filter-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 16px 0;
}

.filter-bar__search {
  flex: 1;
  min-width: 200px;
}

.filter-bar__select {
  width: 132px;
}

.filter-bar__refresh-text {
  margin-left: 6px;
}
</style>
