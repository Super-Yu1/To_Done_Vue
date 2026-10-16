<script setup lang="ts">
/**
 * 统计概览（UC-08；2026-10-16 改版）：从「一行文字」改成**卡片组** ——
 * 一张完成进度卡（带进度条）+ 三张计数卡（带徽章）。
 * 徽章只在有话说的时候出现（清空 / 今天 / 需处理），不是装饰。
 * 数据仍全部来自 `TaskStats`；`completionRate` 的量纲后端未写明，按「≤1 视为比例」归一。
 */
import { computed } from 'vue'
import type { TaskStats } from '@/types'

const props = defineProps<{ stats: TaskStats | null }>()

const view = computed(() => {
  const stats = props.stats
  if (!stats) return null
  const percent =
    stats.completionRate <= 1 ? Math.round(stats.completionRate * 100) : Math.round(stats.completionRate)
  // 两态下「未完成」用总数减已完成得出：不依赖后端 todo / inProgress 两个计数字段
  const todo = Math.max(0, stats.total - stats.done)
  return { percent, todo, done: stats.done, total: stats.total, overdue: stats.overdue, dueToday: stats.dueToday, trash: stats.trashCount }
})
</script>

<template>
  <div v-if="view" class="stat-cards">
    <section class="stat-card stat-card--progress">
      <header class="stat-card__head">
        <span class="stat-card__label">完成进度</span>
        <span class="stat-card__percent">{{ view.percent }}%</span>
      </header>
      <div
        class="stat-card__bar"
        role="progressbar"
        :aria-valuenow="view.percent"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="`完成进度 ${view.percent}%`"
      >
        <span class="stat-card__bar-fill" :style="{ width: `${view.percent}%` }" />
      </div>
      <p class="stat-card__foot">
        已完成 {{ view.done }} / 共 {{ view.total }}
        <span aria-hidden="true">·</span>
        回收站 {{ view.trash }}
      </p>
    </section>

    <section class="stat-card">
      <span class="stat-card__label">未完成</span>
      <div class="stat-card__row">
        <span class="stat-card__value">{{ view.todo }}</span>
        <span
          class="stat-card__badge"
          :class="view.todo === 0 ? 'stat-card__badge--done' : 'stat-card__badge--plain'"
        >
          {{ view.todo === 0 ? '已清空' : '待办' }}
        </span>
      </div>
    </section>

    <section class="stat-card">
      <span class="stat-card__label">今日到期</span>
      <div class="stat-card__row">
        <span class="stat-card__value">{{ view.dueToday }}</span>
        <span
          v-if="view.dueToday > 0"
          class="stat-card__badge stat-card__badge--warn"
        >
          今天
        </span>
      </div>
    </section>

    <section class="stat-card">
      <span class="stat-card__label">逾期</span>
      <div class="stat-card__row">
        <span class="stat-card__value" :class="{ 'stat-card__value--danger': view.overdue > 0 }">
          {{ view.overdue }}
        </span>
        <span v-if="view.overdue > 0" class="stat-card__badge stat-card__badge--danger">需处理</span>
      </div>
    </section>
  </div>
</template>

<style scoped>
.stat-cards {
  display: grid;
  grid-template-columns: minmax(220px, 1.5fr) repeat(3, minmax(120px, 1fr));
  gap: 12px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
}

.stat-card__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.stat-card__label {
  font-size: 12px;
  color: var(--color-text-2);
}

.stat-card__percent {
  font-size: 22px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

/* 进度条：细、圆头，颜色取完成态绿 */
.stat-card__bar {
  height: 6px;
  border-radius: var(--radius-pill);
  background-color: var(--color-hover);
  overflow: hidden;
}

.stat-card__bar-fill {
  display: block;
  height: 100%;
  border-radius: var(--radius-pill);
  background-color: var(--color-status-done);
  transition: width var(--dur-base) var(--ease);
}

.stat-card__foot {
  font-size: 12px;
  color: var(--color-text-3);
  font-variant-numeric: tabular-nums;
}

.stat-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.stat-card__value {
  font-size: 22px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

.stat-card__value--danger {
  color: var(--color-danger);
}

/* 徽章：胶囊这一档的最小号（与 .prio 同一套形状，尺寸更小） */
.stat-card__badge {
  flex: none;
  padding: 1px 8px;
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  font-size: 11px;
  line-height: 1.6;
  white-space: nowrap;
}

.stat-card__badge--plain {
  border-color: var(--color-border-strong);
  color: var(--color-text-2);
}

.stat-card__badge--done {
  border-color: color-mix(in srgb, var(--color-status-done) 32%, transparent);
  background-color: color-mix(in srgb, var(--color-status-done) 12%, transparent);
  color: var(--color-status-done);
}

.stat-card__badge--warn {
  border-color: var(--color-priority-high-border);
  background-color: var(--color-priority-high-bg);
  color: var(--color-priority-high-fg);
}

.stat-card__badge--danger {
  border-color: color-mix(in srgb, var(--color-danger) 32%, transparent);
  background-color: color-mix(in srgb, var(--color-danger) 10%, transparent);
  color: var(--color-danger);
}

/* 中窄屏：进度卡通栏，三张计数卡并排 */
@media (max-width: 900px) {
  .stat-cards {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .stat-card--progress {
    grid-column: 1 / -1;
  }
}

@media (max-width: 560px) {
  .stat-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
