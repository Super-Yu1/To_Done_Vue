<script setup lang="ts">
/**
 * 统计筛选栏（2026-10-18 重构）：
 * 原来的四张大方块压成一条 64px 的横向栏 —— 左侧细进度条，右侧三个可点的快捷筛选胶囊。
 * 「未完成」卡已删除（默认列表就是未完成）；「高优先级」的数字由调用方单独提供
 * （后端 /stats 没有这个字段，真实页用一次 size=1 的查询取 total）。
 */
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import type { TaskQuickFilter, TaskStats } from '@/types'

const props = defineProps<{
  stats: TaskStats | null
  /** 未完成的高优先级任务数（后端 /stats 不返回，由调用方补） */
  highPriority?: number
  activeFilter?: TaskQuickFilter | null
}>()

const emit = defineEmits<{ filter: [TaskQuickFilter | null] }>()

const view = computed(() => {
  const stats = props.stats
  if (!stats) return null
  const percent =
    stats.completionRate <= 1 ? Math.round(stats.completionRate * 100) : Math.round(stats.completionRate)
  return {
    percent,
    done: stats.done,
    total: stats.total,
    overdue: stats.overdue,
    dueToday: stats.dueToday,
  }
})

/** 单选：点已选中的那一枚 = 取消筛选 */
function toggle(next: TaskQuickFilter) {
  emit('filter', props.activeFilter === next ? null : next)
}
</script>

<template>
  <section v-if="view" class="summary" aria-label="任务概览与快捷筛选">
    <!-- 左：细进度条 + 百分比 / 已完成数 -->
    <div class="summary__progress">
      <div class="summary__progress-head">
        <span class="summary__percent">{{ view.percent }}%</span>
        <span class="summary__meta">已完成 {{ view.done }} / 共 {{ view.total }}</span>
      </div>
      <div
        class="summary__track"
        role="progressbar"
        :aria-valuenow="view.percent"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="`完成进度 ${view.percent}%`"
      >
        <span class="summary__fill" :style="{ width: `${view.percent}%` }" />
      </div>
    </div>

    <!-- 右：三个快捷筛选胶囊 -->
    <div class="summary__filters">
      <button
        class="quick-pill quick-pill--overdue"
        :class="{ 'quick-pill--active': activeFilter === 'overdue' }"
        type="button"
        :aria-pressed="activeFilter === 'overdue'"
        @click="toggle('overdue')"
      >
        <AppIcon name="alert" :size="14" />
        逾期 <strong>{{ view.overdue }}</strong>
      </button>

      <button
        class="quick-pill quick-pill--today"
        :class="{ 'quick-pill--active': activeFilter === 'dueToday' }"
        type="button"
        :aria-pressed="activeFilter === 'dueToday'"
        @click="toggle('dueToday')"
      >
        <AppIcon name="calendar" :size="14" />
        今日到期 <strong>{{ view.dueToday }}</strong>
      </button>

      <button
        class="quick-pill quick-pill--high"
        :class="{ 'quick-pill--active': activeFilter === 'high' }"
        type="button"
        :aria-pressed="activeFilter === 'high'"
        @click="toggle('high')"
      >
        <AppIcon name="flag" :size="14" />
        高优先级 <strong>{{ highPriority ?? 0 }}</strong>
      </button>
    </div>
  </section>
</template>

<style scoped>
/* 一条 64px 的横向筛选栏：左进度、右快捷筛选，两端对齐 */
.summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  min-height: 64px;
  padding: 12px 20px;
  /* 玻璃卡（2026-10-26）：与任务卡同一套填色 / 描边 / 模糊，只有高度不同 */
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-card);
  background-color: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--shadow-card);
}

.summary__progress {
  display: flex;
  flex: 0 1 340px;
  flex-direction: column;
  gap: 7px;
  min-width: 170px;
}

.summary__progress-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.summary__percent {
  font-size: 14px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  color: var(--color-text);
}

.summary__meta {
  font-size: 12px;
  color: var(--color-text-3);
  font-variant-numeric: tabular-nums;
}

/* 极细进度条：4px、圆头、品牌色 */
.summary__track {
  height: 4px;
  border-radius: var(--radius-pill);
  background-color: var(--color-brand-soft);
  overflow: hidden;
}

.summary__fill {
  display: block;
  height: 100%;
  border-radius: var(--radius-pill);
  background-color: var(--color-brand);
  transition: width var(--dur-base) var(--ease);
}

.summary__filters {
  display: flex;
  flex: none;
  align-items: center;
  gap: 10px;
}

/* 快捷筛选胶囊：浅底同色字，点击切换选中态 */
.quick-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border: none;
  border-radius: var(--radius-pill);
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease),
    opacity var(--dur-fast) var(--ease);
}

.quick-pill strong {
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.quick-pill--overdue {
  background-color: var(--color-priority-high-bg);
  color: var(--color-priority-high-fg);
}

.quick-pill--today {
  background-color: var(--color-priority-medium-bg);
  color: var(--color-priority-medium-fg);
}

.quick-pill--high {
  background-color: var(--color-high-bg);
  color: var(--color-high-fg);
}

/* Hover：同色加深一档 */
.quick-pill:hover {
  background-color: color-mix(in srgb, currentColor 11%, var(--color-surface));
}

/* 选中：内描边 + 更实的底色，不改变布局尺寸 */
.quick-pill--active {
  background-color: color-mix(in srgb, currentColor 16%, var(--color-surface));
  box-shadow: inset 0 0 0 1.5px currentColor;
}

.quick-pill:focus-visible {
  outline: 2px solid var(--color-brand);
  outline-offset: 2px;
}

/* 窄窗口：允许换行，进度条独占一行 */
@media (max-width: 900px) {
  .summary {
    flex-wrap: wrap;
    gap: 12px;
  }

  .summary__progress {
    flex-basis: 100%;
  }
}
</style>
