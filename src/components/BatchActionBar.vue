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

/*
 * 批量按钮与工具栏同一条语言（2026-10-27 三改）：
 * 30px 高、9px 圆角、半透明白底 —— 不再是 Element Plus 默认的小号灰框按钮。
 */
.batch-bar :deep(.el-button) {
  height: 30px;
  padding: 0 12px;
  border-radius: var(--radius-control-sm);
  font-size: 12.5px;
  font-weight: 500;
  --el-button-bg-color: rgba(255, 255, 255, 0.5);
  --el-button-border-color: rgba(255, 255, 255, 0.7);
  --el-button-text-color: var(--color-text);
  --el-button-hover-bg-color: rgba(255, 255, 255, 0.82);
  --el-button-hover-border-color: rgba(255, 255, 255, 0.95);
  --el-button-hover-text-color: var(--color-text);
  transition: background-color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease),
    transform 120ms var(--ease);
}

.batch-bar :deep(.el-button:active) {
  transform: scale(0.97);
}

/* 「全选」是纯文字动作，不要白底 */
.batch-bar :deep(.el-button.is-text) {
  --el-button-bg-color: transparent;
  --el-button-border-color: transparent;
  --el-button-hover-bg-color: rgba(255, 255, 255, 0.55);
}

/* 删除：保留红色，但换成浅红玻璃，不抢其他按钮 */
.batch-bar :deep(.el-button--danger.is-plain) {
  --el-button-bg-color: color-mix(in srgb, var(--color-danger) 8%, transparent);
  --el-button-border-color: color-mix(in srgb, var(--color-danger) 26%, transparent);
  --el-button-text-color: var(--color-danger);
  --el-button-hover-bg-color: color-mix(in srgb, var(--color-danger) 14%, transparent);
  --el-button-hover-border-color: color-mix(in srgb, var(--color-danger) 40%, transparent);
  --el-button-hover-text-color: var(--color-danger);
}

.batch-bar :deep(.el-button.is-disabled),
.batch-bar :deep(.el-button.is-disabled:hover) {
  opacity: 0.45;
}

/* 深色：白玻璃换成 8% 白，文字回到白色，半透明白底在暗背景上会炸开 */
html.dark .batch-bar :deep(.el-button) {
  --el-button-bg-color: rgba(255, 255, 255, 0.08);
  --el-button-border-color: rgba(255, 255, 255, 0.12);
  --el-button-text-color: var(--color-text);
  --el-button-hover-bg-color: rgba(255, 255, 255, 0.14);
  --el-button-hover-border-color: rgba(255, 255, 255, 0.2);
  --el-button-hover-text-color: var(--color-text);
}

html.dark .batch-bar :deep(.el-button.is-text) {
  --el-button-bg-color: transparent;
  --el-button-border-color: transparent;
  --el-button-hover-bg-color: rgba(255, 255, 255, 0.1);
}

</style>
