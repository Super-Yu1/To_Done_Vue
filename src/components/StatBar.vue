<script setup lang="ts">
/**
 * 今日概览（2026-10-27 三改为液态玻璃主卡）：
 * 左侧一句「还剩几件没划掉」撑起整页的基调，右侧一枚环形进度把分数落在眼前，
 * 三个快捷筛选收成玻璃胶囊排在环形左边 —— 概览与筛选用同一块面板，不再各占一张卡。
 *
 * 数据口径不变：「未完成」= 总数 − 已完成；三枚胶囊仍只算未完成（后端 /stats 口径）。
 * 「高优先级」的数字由调用方单独提供（后端 /stats 没有这个字段）。
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

/** 环形进度：r = 26（viewBox 64），周长一次算好，dashoffset 直接按百分比给 */
const RADIUS = 26
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const view = computed(() => {
  const stats = props.stats
  if (!stats) return null
  const raw =
    stats.completionRate <= 1
      ? Math.round(stats.completionRate * 100)
      : Math.round(stats.completionRate)
  const percent = Math.min(100, Math.max(0, raw))
  return {
    percent,
    done: stats.done,
    total: stats.total,
    left: Math.max(stats.total - stats.done, 0),
    overdue: stats.overdue,
    dueToday: stats.dueToday,
  }
})

const ringOffset = computed(() =>
  view.value ? CIRCUMFERENCE * (1 - view.value.percent / 100) : CIRCUMFERENCE,
)

/** 日期不做成「欢迎语」：一行日期负责交代今天，语气交给标题那句 */
const todayLabel = computed(() => {
  const now = new Date()
  const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日 · ${week[now.getDay()]}`
})

/** 单选：点已选中的那一枚 = 取消筛选 */
function toggle(next: TaskQuickFilter) {
  emit('filter', props.activeFilter === next ? null : next)
}
</script>

<template>
  <section v-if="view" class="summary" aria-label="任务概览与快捷筛选">
    <div class="summary__intro">
      <p class="summary__date">{{ todayLabel }}</p>

      <h1 class="summary__title">
        <template v-if="view.total === 0">从第一件事开始</template>
        <template v-else-if="view.left === 0">都划掉了，今天可以收工</template>
        <template v-else>
          还有 <strong>{{ view.left }}</strong> 件事没划掉
        </template>
      </h1>

      <p class="summary__meta">
        <template v-if="view.total === 0">还没有任务，记下第一件要做的事。</template>
        <template v-else>
          共 {{ view.total }} 件 · 已完成 {{ view.done }} 件
        </template>
      </p>
    </div>

    <!-- 快捷筛选：玻璃胶囊 + 一枚语义色圆点，数字才是主角 -->
    <div class="summary__filters">
      <button
        class="quick-pill quick-pill--overdue"
        :class="{ 'quick-pill--active': activeFilter === 'overdue' }"
        type="button"
        :aria-pressed="activeFilter === 'overdue'"
        @click="toggle('overdue')"
      >
        <AppIcon class="quick-pill__icon" name="alert" :size="15" />
        <span class="quick-pill__label">逾期</span>
        <span class="quick-pill__count">{{ view.overdue }}</span>
      </button>

      <button
        class="quick-pill quick-pill--today"
        :class="{ 'quick-pill--active': activeFilter === 'dueToday' }"
        type="button"
        :aria-pressed="activeFilter === 'dueToday'"
        @click="toggle('dueToday')"
      >
        <AppIcon class="quick-pill__icon" name="calendar" :size="15" />
        <span class="quick-pill__label">今日到期</span>
        <span class="quick-pill__count">{{ view.dueToday }}</span>
      </button>

      <button
        class="quick-pill quick-pill--high"
        :class="{ 'quick-pill--active': activeFilter === 'high' }"
        type="button"
        :aria-pressed="activeFilter === 'high'"
        @click="toggle('high')"
      >
        <AppIcon class="quick-pill__icon" name="flag" :size="15" />
        <span class="quick-pill__label">高优先级</span>
        <span class="quick-pill__count">{{ highPriority ?? 0 }}</span>
      </button>
    </div>

    <!-- 环形进度：分数是这块面板唯一的「成绩」，用一张环把它压住 -->
    <div
      class="summary__ring"
      role="progressbar"
      :aria-valuenow="view.percent"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="`完成进度 ${view.percent}%`"
    >
      <svg class="summary__ring-svg" viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id="stat-ring-gradient" x1="0" y1="0" x2="1" y2="1">
            <!-- 起端用苹果蓝、末端收到品牌蓝：同一族蓝的深浅过渡，不引入新色相 -->
            <stop class="summary__ring-stop summary__ring-stop--start" offset="0%" />
            <stop class="summary__ring-stop summary__ring-stop--end" offset="100%" />
          </linearGradient>
        </defs>
        <circle class="summary__ring-track" cx="32" cy="32" :r="RADIUS" />
        <circle
          class="summary__ring-fill"
          cx="32"
          cy="32"
          :r="RADIUS"
          :stroke-dasharray="CIRCUMFERENCE"
          :stroke-dashoffset="ringOffset"
        />
      </svg>
      <span class="summary__ring-value">{{ view.percent }}<small>%</small></span>
    </div>
  </section>
</template>

<style scoped>
/*
 * 一块横向的玻璃主卡（2026-10-27 三改）：左边一句话、右边分数与快捷筛选。
 * 材质与侧栏同一档（0.42 白 + 34px 模糊 + 一圈高光边），
 * 比工具栏更「厚」—— 它是这一页的标题区，不是控件。
 */
.summary {
  position: relative;
  display: flex;
  align-items: center;
  gap: 24px;
  /* 窄一档时 gap 收 8px（24 → 16）：也走过渡，右侧胶囊组不会整块横移一下 */
  transition: gap 280ms cubic-bezier(0.22, 1, 0.36, 1);
  min-height: 128px;
  padding: 22px 24px 22px 28px;
  border: 1px solid var(--glass-panel-border);
  border-radius: var(--radius-panel);
  background-color: var(--glass-panel-bg);
  backdrop-filter: var(--glass-panel-blur);
  box-shadow: var(--glass-panel-shadow);
}

.summary__intro {
  flex: 1 1 auto;
  min-width: 0;
}

/* 日期是最轻的一层：11px、拉开字距，只负责交代「今天」 */
.summary__date {
  font-size: 12.5px;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: var(--color-text-3);
}

/*
 * 标题（2026-10-28 放大）：24px / 650 / -0.02em —— 大字号收字距，才不会读成一排散字；
 * 行高收到 1.25，与上面那行日期贴成一组。
 */
.summary__title {
  margin-top: 8px;
  font-size: 24px;
  font-weight: 650;
  line-height: 1.25;
  letter-spacing: -0.02em;
  color: var(--color-text);
  font-optical-sizing: auto;
}

.summary__title strong {
  /* 数字用品牌蓝，和右边的环呼应；tabular 让 1 / 10 切换时标题不跳 */
  color: var(--color-brand);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.summary__meta {
  margin-top: 6px;
  font-size: 13px;
  color: var(--color-text-3);
  font-variant-numeric: tabular-nums;
}

/* ---------- 快捷筛选 ---------- */

.summary__filters {
  display: flex;
  flex: none;
  align-items: center;
  gap: 8px;
}

.quick-pill {
  /* --tone 由三个变体给值，圆点、选中底色、选中字色都从它派生 */
  --tone: var(--color-text-2);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 14px;
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: var(--radius-pill);
  background-color: rgba(255, 255, 255, 0.36);
  color: var(--color-text-2);
  font-size: 13.5px;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  /*
   * 2026-10-29：收成「圆点 + 数字」时，内边距与两段 gap 也要跟着收（14 → 11、8 → 6），
   * 否则断点一到胶囊当场窄 17px，再慢慢等文字收完 —— 看着就是缩得不顺。
   */
  transition:
    background-color var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease),
    transform 120ms var(--ease),
    padding 280ms cubic-bezier(0.22, 1, 0.36, 1),
    gap 280ms cubic-bezier(0.22, 1, 0.36, 1);
}

.quick-pill:hover {
  background-color: rgba(255, 255, 255, 0.62);
  border-color: rgba(255, 255, 255, 0.85);
  color: var(--color-text);
}

/* 按下立刻缩一下：反馈在 pointer-down，不等松手 */
.quick-pill:active {
  transform: scale(0.96);
}

/* 图标承担「哪一类」的识别，窄屏收字后只剩它 + 数字，仍然读得懂 */
.quick-pill__icon {
  flex: none;
  color: var(--tone);
}

/*
 * 文字宽度参与折叠动画：窄屏收到 0，圆点与数字不会因为 gap 残留而偏。
 * 2026-10-29：收宽改用 grid 轨道 `minmax(0, 1fr) → minmax(0, 0fr)`，不再用 max-width ——
 * max-width 展开态写的是 160px，只要它一大于文字实际宽（27 / 54）文字就立刻满宽，
 * 于是**展开方向几乎没有动画**；反向收起时又会先「不动」一半时长再猛地收完。
 * 轨道宽能一路插值，两个方向都连续。margin 也跟着过渡（收完靠 -3px 把两段 gap 合成一段）。
 */
.quick-pill__label {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  overflow: hidden;
  white-space: nowrap;
  transition:
    grid-template-columns 280ms cubic-bezier(0.22, 1, 0.36, 1),
    margin 280ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 160ms var(--ease);
}

.quick-pill__count {
  font-size: 14px;
  font-weight: 650;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}

.quick-pill--overdue {
  --tone: var(--color-priority-high-fg);
}

.quick-pill--today {
  --tone: var(--color-priority-medium-fg);
}

.quick-pill--high {
  --tone: var(--color-high-fg);
}

/* 选中：同色 12% 底 + 34% 描边，文字与数字一起转语义色（不改变尺寸） */
.quick-pill--active {
  border-color: color-mix(in srgb, var(--tone) 34%, transparent);
  background-color: color-mix(in srgb, var(--tone) 12%, rgba(255, 255, 255, 0.4));
  color: var(--tone);
}

.quick-pill--active .quick-pill__count {
  color: var(--tone);
}

.quick-pill:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

html.dark .quick-pill {
  border-color: rgba(255, 255, 255, 0.12);
  background-color: rgba(255, 255, 255, 0.06);
}

html.dark .quick-pill:hover {
  border-color: rgba(255, 255, 255, 0.2);
  background-color: rgba(255, 255, 255, 0.1);
}

html.dark .quick-pill--active {
  background-color: color-mix(in srgb, var(--tone) 18%, transparent);
  border-color: color-mix(in srgb, var(--tone) 36%, transparent);
}

/* ---------- 环形进度 ---------- */

.summary__ring {
  position: relative;
  display: grid;
  flex: none;
  place-items: center;
  width: 80px;
  height: 80px;
  margin-left: 2px;
}

.summary__ring-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  /* 从 12 点方向起画，顺时针走 */
  transform: rotate(-90deg);
}

.summary__ring-track {
  fill: none;
  stroke: color-mix(in srgb, var(--color-text) 9%, transparent);
  stroke-width: 6;
}

.summary__ring-stop--start {
  stop-color: var(--color-accent);
}

.summary__ring-stop--end {
  stop-color: var(--color-brand);
}

/* 深色主题里两端都换亮一档，弧线才不会陷进暗背景 */
html.dark .summary__ring-stop--start {
  stop-color: var(--color-accent-hover);
}

.summary__ring-fill {
  fill: none;
  stroke: url(#stat-ring-gradient);
  stroke-width: 6;
  stroke-linecap: round;
  /* 进度变化跟着任务走：600ms 缓出，比列表重排慢一点，不抢视线 */
  transition: stroke-dashoffset 600ms cubic-bezier(0.22, 1, 0.36, 1);
}

.summary__ring-value {
  position: relative;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}

.summary__ring-value small {
  margin-left: 1px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-3);
}

/*
 * 窄一档（≤1149，与侧栏自动折叠同一条线）：胶囊只留圆点 + 数字，
 * 文字渐隐收宽而不是 display: none，收的过程才连贯。
 */
@media (max-width: 1149px) {
  .summary {
    gap: 16px;
  }

  .quick-pill {
    gap: 6px;
    padding: 0 11px;
  }

  .quick-pill__label {
    grid-template-columns: minmax(0, 0fr);
    opacity: 0;
    /* 文字收到 0 宽后仍占两段 gap（图标—文字—数字），两侧各补 -3px 把它们合成一段 */
    margin: 0 -3px;
  }
}

/* 极窄窗口兜底：标题与胶囊允许折行，环留在右上 */
@media (max-width: 900px) {
  .summary {
    flex-wrap: wrap;
    row-gap: 14px;
  }

  .summary__intro {
    flex-basis: 60%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .summary__ring-fill {
    transition: none;
  }

  .quick-pill:active {
    transform: none;
  }
}
</style>
