<script setup lang="ts">
/** 统计概览：用文字而非大色块数字卡片（见 8.7 落地要求、UC-08） */
import { computed } from 'vue'
import type { TaskStats } from '@/types'

const props = defineProps<{ stats: TaskStats | null }>()

interface StatItem {
  label: string
  value: number | string
  danger?: boolean
}

const items = computed<StatItem[]>(() => {
  const stats = props.stats
  if (!stats) return []
  /**
   * completionRate 的量纲后端未在文档中写明（0~1 还是 0~100），
   * 这里按「≤1 视为比例」归一，联调时以后端 Swagger 为准。
   */
  const percent = stats.completionRate <= 1 ? Math.round(stats.completionRate * 100) : Math.round(stats.completionRate)
  return [
    { label: '总数', value: stats.total },
    // 两态下「未完成」用总数减已完成得出：不依赖后端 todo / inProgress 两个计数字段，
    // 后端无论按两态还是三态统计，这里的结果都正确
    { label: '未完成', value: Math.max(0, stats.total - stats.done) },
    { label: '已完成', value: stats.done },
    { label: '逾期', value: stats.overdue, danger: stats.overdue > 0 },
    { label: '今日到期', value: stats.dueToday },
    { label: '完成率', value: `${percent}%` },
    { label: '回收站', value: stats.trashCount },
  ]
})
</script>

<template>
  <div v-if="items.length" class="stat-bar">
    <span v-for="item in items" :key="item.label" class="stat-bar__item">
      <span class="stat-bar__label">{{ item.label }}</span>
      <span class="stat-bar__value" :class="{ 'stat-bar__value--danger': item.danger }">
        {{ item.value }}
      </span>
    </span>
  </div>
</template>

<style scoped>
.stat-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border);
}

.stat-bar__item {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.stat-bar__label {
  font-size: 12px;
  color: var(--color-text-2);
}

.stat-bar__value {
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}

.stat-bar__value--danger {
  color: var(--color-danger);
}
</style>
