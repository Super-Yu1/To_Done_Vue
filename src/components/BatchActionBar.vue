<script setup lang="ts">
/**
 * 批量操作条（F）：进入选择模式后出现在筛选条下方。
 * 后端没有批量接口，所以每个动作都是 N 个请求（由调用方跑，本组件只发事件）；
 * 执行期间 busy 为真，所有按钮禁用，避免叠着点。
 */
import PriorityPicker from './PriorityPicker.vue'
import type { TaskPriority, TaskStatus } from '@/types'

defineProps<{
  selectedCount: number
  /** 当前已加载、可选中的条数（分页 + 无限滚动，不做跨页全选） */
  totalCount: number
  allSelected: boolean
  busy?: boolean
  /**
   * 当前页签的状态筛选（2026-10-18）：
   * 未完成里只给「标记完成」、已完成里只给「取消完成」，全部（undefined）两个都给。
   */
  status?: TaskStatus
  /**
   * 「未完成」页签（2026-10-27）：这一档的 status 是空的（用 onlyUnfinished 表达「非 DONE」），
   * 只看 status 会把它当成「全部」，于是漏出「取消完成」—— 必须再带一个标记。
   */
  onlyUnfinished?: boolean
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

    <el-button
      v-if="status !== 'DONE'"
      size="small"
      :disabled="!selectedCount || busy"
      @click="emit('complete')"
    >
      标记完成
    </el-button>
    <el-button
      v-if="!onlyUnfinished && status !== 'TODO'"
      size="small"
      :disabled="!selectedCount || busy"
      @click="emit('uncomplete')"
    >
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
