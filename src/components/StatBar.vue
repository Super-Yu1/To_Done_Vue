<script setup lang="ts">
/**
 * 统计概览（UC-08；2026-10-18 按设计稿收紧）：
 * 四张等高卡片横排 —— 一张完成进度（大数字 + 绿色进度条）+ 三张计数卡。
 * 徽章是「轻量状态提示」：浅底同色字、无描边，只在有话说的时候出现（清空 / 今天 / 需处理）。
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
  return { percent, todo, done: stats.done, total: stats.total, overdue: stats.overdue, dueToday: stats.dueToday }
})
</script>

<template>
  <div v-if="view" class="stat-cards">
    <section class="stat-card">
      <header class="stat-card__head">
        <span class="stat-card__label">完成进度</span>
        <span class="stat-card__badge stat-card__badge--mint">
          {{ view.total === 0 ? '暂无任务' : view.percent === 100 ? '已全部完成' : '进行中' }}
        </span>
      </header>
      <div class="stat-card__value-row">
        <span class="stat-card__value">
          {{ view.percent }}<span class="stat-card__unit">%</span>
        </span>
      </div>
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
      <p class="stat-card__foot">已完成 {{ view.done }} / 共 {{ view.total }}</p>
    </section>

    <section class="stat-card">
      <header class="stat-card__head">
        <span class="stat-card__label">未完成</span>
        <span
          class="stat-card__badge"
          :class="view.todo === 0 ? 'stat-card__badge--mint' : 'stat-card__badge--sky'"
        >
          {{ view.todo === 0 ? '已清空' : '待办' }}
        </span>
      </header>
      <div class="stat-card__value-row">
        <span class="stat-card__value">{{ view.todo }}</span>
      </div>
    </section>

    <section class="stat-card">
      <header class="stat-card__head">
        <span class="stat-card__label">今日到期</span>
        <span v-if="view.dueToday > 0" class="stat-card__badge stat-card__badge--amber">今天</span>
      </header>
      <div class="stat-card__value-row">
        <span class="stat-card__value">{{ view.dueToday }}</span>
      </div>
    </section>

    <section class="stat-card">
      <header class="stat-card__head">
        <span class="stat-card__label">逾期</span>
        <span v-if="view.overdue > 0" class="stat-card__badge stat-card__badge--red">需处理</span>
      </header>
      <div class="stat-card__value-row">
        <span class="stat-card__value" :class="{ 'stat-card__value--danger': view.overdue > 0 }">
          {{ view.overdue }}
        </span>
      </div>
    </section>
  </div>
</template>

<style scoped>
.stat-cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: 9px;
  min-height: 118px;
  padding: 16px 18px 18px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-card);
}

.stat-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.stat-card__label {
  font-size: 12px;
  color: var(--color-text-2);
}

.stat-card__value-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.stat-card__value {
  font-size: 30px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  line-height: 1;
  color: var(--color-text);
}

.stat-card__value--danger {
  color: var(--color-danger);
}

.stat-card__unit {
  margin-left: 1px;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0;
  color: var(--color-text-3);
}

/* 进度条：细、圆头，薄荷绿 */
.stat-card__bar {
  height: 6px;
  border-radius: var(--radius-pill);
  background-color: var(--color-bg-soft);
  overflow: hidden;
}

.stat-card__bar-fill {
  display: block;
  height: 100%;
  border-radius: var(--radius-pill);
  background-color: var(--color-mint);
  transition: width var(--dur-base) var(--ease);
}

.stat-card__foot {
  font-size: 12px;
  color: var(--color-text-3);
  font-variant-numeric: tabular-nums;
}

/* 徽章：浅底同色字、胶囊形 —— 卡片里最轻的一层，不抢数字 */
.stat-card__badge {
  flex: none;
  padding: 2px 9px;
  border-radius: var(--radius-pill);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.5;
  white-space: nowrap;
}

.stat-card__badge--mint {
  background-color: var(--color-mint-bg);
  color: var(--color-mint-fg);
}

.stat-card__badge--sky {
  background-color: var(--color-sky-bg);
  color: var(--color-sky-fg);
}

.stat-card__badge--amber {
  background-color: var(--color-priority-medium-bg);
  color: var(--color-priority-medium-fg);
}

.stat-card__badge--red {
  background-color: var(--color-priority-high-bg);
  color: var(--color-priority-high-fg);
}

/* 横屏平板：两列两行，数字与徽章的相对位置不变 */
@media (max-width: 1024px) {
  .stat-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
