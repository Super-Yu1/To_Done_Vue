<script setup lang="ts">
/**
 * 批量操作条（F）：进入选择模式后出现在筛选条下方。
 * 后端没有批量接口，所以每个动作都是 N 个请求（由调用方跑，本组件只发事件）；
 * 执行期间 busy 为真，所有按钮禁用，避免叠着点。
 */
import PriorityPicker from './PriorityPicker.vue'
import type { TaskPriority } from '@/types'

defineProps<{
  selectedCount: number
  /** 当前已加载、可选中的条数（分页 + 无限滚动，不做跨页全选） */
  totalCount: number
  allSelected: boolean
  busy?: boolean
}>()

const emit = defineEmits<{
  complete: []
  uncomplete: []
  remove: []
  'change-priority': [TaskPriority]
  'toggle-all': []
}>()
</script>

<template>
  <div class="batch-bar">
    <span class="batch-bar__count">
      已选 <strong>{{ selectedCount }}</strong> 条
    </span>

    <el-button size="small" :disabled="!selectedCount || busy" @click="emit('complete')">
      标记完成
    </el-button>
    <el-button size="small" :disabled="!selectedCount || busy" @click="emit('uncomplete')">
      取消完成
    </el-button>

    <el-popover trigger="click" placement="bottom-start" :width="128" :disabled="!selectedCount || busy">
      <template #reference>
        <el-button size="small" :disabled="!selectedCount || busy">改优先级</el-button>
      </template>
      <PriorityPicker @pick="emit('change-priority', $event)" />
    </el-popover>

    <el-button size="small" type="danger" plain :disabled="!selectedCount || busy" @click="emit('remove')">
      删除
    </el-button>

    <el-button size="small" text @click="emit('toggle-all')">
      {{ allSelected ? '取消全选' : '全选' }}（{{ totalCount }}）
    </el-button>
    </div>
</template>

<style scoped>
/*
 * 2026-10-17：从「独占一行的操作条」改成 Tabs 行内的紧凑组 ——
 * 不再自带边框与底色，位置由筛选条的右侧插槽决定。
 */
.batch-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.batch-bar__count {
  margin-right: 4px;
  font-size: 13px;
  color: var(--color-text-2);
}

.batch-bar__count strong {
  color: var(--color-text);
}

</style>
