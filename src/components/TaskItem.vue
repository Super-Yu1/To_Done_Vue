<script setup lang="ts">
/**
 * 任务卡片（8.5；2026-10-18 按设计稿改版）：
 * 左侧方形复选框，中间标题 / 描述，右侧优先级标签与人类可读的截止时间（`今天 14:57` / `10-18`）。
 *
 * 整行点击 = **直接打开编辑弹窗**（2026-10-27 起不再有只读详情）。
 *
 * 行内只读（2026-10-27）：优先级与截止时间不再能就地修改，统一走编辑弹窗；
 * 行尾只保留删除。本组件只发事件，落接口由调用方负责。
 * 批量选择（F）：前置位换成方形多选框，行尾操作隐藏、点击整行 = 勾选。
 */
import { computed, onUnmounted, ref } from 'vue'
import AppIcon from './AppIcon.vue'
import AppTooltip from './AppTooltip.vue'
import { TASK_PRIORITY_LABEL } from '@/constants'
import { formatDateTime, formatDueDay, isOverdue } from '@/utils/date'
import type { Task } from '@/types'

const props = defineProps<{
  task: Task
  /** 批量选择模式：前置位换方形框、行内快捷入口禁用、点击整行 = 勾选 */
  selectMode?: boolean
  selected?: boolean
  /** 当前只看「未完成」：勾选后这一行会离开列表，先播缩小退场再落数据 */
  leaveOnToggle?: boolean
}>()

/**
 * 勾选完成后先本地展示完成态（绿勾 + 划线）160ms，
 * 再交给列表的 leave 过渡做 420ms 缩小淡出 —— 缩小交给 transition，
 * 不能用 CSS animation：animation 会让 TransitionGroup 的补位（FLIP）失效。
 */
const SETTLE_MS = 160

const emit = defineEmits<{
  /** 点击整行：直接打开编辑弹窗 */
  open: [Task]
  remove: [Task]
  'toggle-status': [Task]
  'toggle-select': [Task]
}>()

const isDone = computed(() => props.task.status === 'DONE')
const overdue = computed(() => isOverdue(props.task.dueDate, props.task.status))
const dueText = computed(() =>
  props.task.dueDate ? formatDueDay(props.task.dueDate) : '未设截止时间',
)
/** 卡片上只显示「今天 / 10-18」，完整时刻放到 title 里 */
const dueTitle = computed(() =>
  props.task.dueDate ? formatDateTime(props.task.dueDate) : '',
)

/**
 * 勾选完成后的退场（2026-10-18）：在「未完成」筛选下先本地切成完成态，
 * 160ms 后把状态交给数据层；行离开时的缩小淡出由 TaskList 的 leave 过渡完成。
 * 其余筛选（如「全部」）任务不会离开列表，保持即时更新 + 划线。
 */
const leaving = ref(false)
let leaveTimer: number | undefined

function handleToggleStatus() {
  if (leaving.value) return
  if (!props.leaveOnToggle || isDone.value) {
    emit('toggle-status', props.task)
    return
  }
  leaving.value = true
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  leaveTimer = window.setTimeout(() => emit('toggle-status', props.task), reduceMotion ? 0 : SETTLE_MS)
}

onUnmounted(() => window.clearTimeout(leaveTimer))

/**
 * 整行点击（2026-10-27）：选择模式下改为勾选；否则直接打开编辑弹窗。
 * 用户正在划选文字（想复制）时不触发。
 */
function handleRowClick() {
  if (props.selectMode) {
    emit('toggle-select', props.task)
    return
  }
  if (window.getSelection()?.toString()) return
  emit('open', props.task)
}
</script>

<template>
  <article
    class="task-row"
    :class="{
      'task-row--done': isDone,
      'task-row--select': selectMode,
      'task-row--selected': selected,
      'task-row--leaving': leaving,
    }"
    role="button"
    tabindex="0"
    :aria-label="selectMode ? `选择任务：${task.title}` : `查看任务详情：${task.title}`"
    @click="handleRowClick"
    @keydown.enter.prevent="handleRowClick"
    @keydown.space.prevent="handleRowClick"
  >
    <!-- 批量选择模式：方形多选框（完成态是绿底，这里是黑底，两种语义不混） -->
    <span
      v-if="selectMode"
      class="task-row__box"
      :class="{ 'task-row__box--on': selected }"
      aria-hidden="true"
    >
      <AppIcon v-if="selected" name="check" :size="14" />
    </span>

    <AppTooltip
      v-else
      :content="isDone || leaving ? '标记为未完成' : '标记为已完成'"
      placement="top"
    >
      <button
        class="task-row__check"
        type="button"
        :aria-pressed="isDone || leaving"
        :aria-label="isDone || leaving ? '标记为未完成' : '标记为已完成'"
        @click.stop="handleToggleStatus"
      >
        <span class="task-row__check-box">
          <AppIcon name="check" :size="14" />
        </span>
      </button>
    </AppTooltip>

    <div class="task-row__body">
      <!-- 标题不再挂气泡（2026-10-28）：悬停整行会弹一条与正文重复的标题，噪声大于收益 -->
      <h3 class="task-row__title">{{ task.title }}</h3>
      <!--
        描述是可选字段，但这一行**始终渲染**并占一行高度：
        否则没填描述的任务会矮一截，长列表里行的节奏忽高忽低。
      -->
      <p class="task-row__description">{{ task.description || '' }}</p>
    </div>

    <!-- 右侧：优先级 + 截止时间（**只读展示**）+ 删除；操作按钮悬停才显形（不推动布局） -->
    <div class="task-row__side">
      <div class="task-row__meta">
        <!-- 2026-10-27：优先级只展示，修改统一走编辑弹窗 -->
        <span class="task-row__prio" :class="`task-row__prio--${task.priority.toLowerCase()}`">
          {{ TASK_PRIORITY_LABEL[task.priority] }}
        </span>

        <!--
          截止时间同样只展示：默认短日期（今天 / 10-18），整行悬停换成完整「日期 + 时分」——
          这条 CSS 已经承担了「看完整时间」，所以不再挂原生 title（2026-10-27 去掉）。
        -->
        <span
          class="task-row__due"
          :class="{ 'task-row__due--overdue': overdue, 'task-row__due--empty': !task.dueDate }"
        >
          <AppIcon name="clock" :size="12" />
          <span class="task-row__due-text">
            <span class="task-row__due-short">{{ dueText }}</span>
            <span class="task-row__due-full">{{ dueTitle || dueText }}</span>
          </span>
        </span>
      </div>

      <div v-if="!selectMode" class="task-row__actions">
        <!-- 2026-10-27：铅笔去掉，点整行即编辑；这里只留删除 -->
        <AppTooltip content="删除" placement="top">
          <button
            class="task-row__action task-row__action--danger"
            type="button"
            :aria-label="`删除：${task.title}`"
            @click.stop="emit('remove', task)"
          >
            <AppIcon name="trash" />
          </button>
        </AppTooltip>
      </div>
    </div>
  </article>
</template>

<style scoped>
/*
 * 任务卡（2026-10-27 四改：回到「一行一卡」）：
 * 每行是一块独立的玻璃（20px 圆角 + 26px 模糊 + 0.5 白 + 高光边），
 * 悬停整体上浮 2px、影更深 —— 一列卡在渐变上各自浮着，层级靠「一张张卡」读，而不是分组里的发丝线。
 * 行高 87px（padding 18 / 22、前置位 40px 放 24px 勾选圈、标题 17 / 描述 14），换皮不换骨架。
 */
.task-row {
  position: relative;
  display: grid;
  /* 前置位 40px（命中区）放 24px 圆形框；正文一列；右侧元信息 + 固定宽度的操作列 */
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 18px 22px;
  border: 1px solid var(--glass-card-border);
  border-radius: var(--radius-lg);
  background-color: var(--glass-card-bg);
  backdrop-filter: var(--glass-card-blur);
  box-shadow: var(--shadow-card);
  cursor: pointer;
  transition: background-color var(--dur-base) var(--ease), border-color var(--dur-base) var(--ease),
    box-shadow var(--dur-base) var(--ease), transform var(--dur-base) var(--ease);
}

/* 悬停 = 上浮 2px + 影更深 + 高光边更亮：三件事一起动，卡才像被拿起来 */
.task-row:hover {
  border-color: var(--glass-card-border-hover);
  background-color: var(--glass-card-bg-hover);
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-2px);
}

/* 键盘焦点与悬停同一姿态，再套一圈苹果蓝，键盘用户才看得出当前在哪 */
.task-row:focus-visible,
.task-row:has(:focus-visible) {
  outline: none;
  border-color: var(--glass-card-border-hover);
  box-shadow: var(--shadow-card-hover), 0 0 0 2px color-mix(in srgb, var(--color-accent) 45%, transparent);
  transform: translateY(-2px);
}

/* 批量选择：选中行留一层品牌浅蓝，和悬停的浮起区分开 */
.task-row--selected {
  background-color: var(--color-brand-soft);
}

/* ---------- 勾选 / 多选 ---------- */

.task-row__check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  border-radius: var(--radius-md);
  background-color: transparent;
  cursor: pointer;
}

.task-row__check-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  /* 圆形复选框：细一圈浅灰描边，悬停才染上品牌色 */
  border: 1.5px solid color-mix(in srgb, var(--color-text) 20%, transparent);
  border-radius: 50%;
  background-color: transparent;
  color: transparent;
  transition: color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease),
    background-color var(--dur-fast) var(--ease), box-shadow var(--dur-base) var(--ease),
    transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* 卡片悬停：勾选圈先透一层很淡的光，提示这一列是「点一下就完成」的入口 */
.task-row:hover .task-row__check-box,
.task-row:focus-visible .task-row__check-box, .task-row:has(:focus-visible) .task-row__check-box {
  box-shadow: 0 0 10px color-mix(in srgb, var(--color-brand) 16%, transparent);
}

/* 直接悬停勾选圈：品牌色描边 + 淡蓝底 + 一圈微光，并轻轻放大（弹性曲线，像被指尖顶了一下） */
.task-row__check:hover .task-row__check-box {
  border-color: var(--color-brand);
  background-color: var(--color-brand-soft);
  color: var(--color-brand);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-brand) 10%, transparent),
    0 0 16px color-mix(in srgb, var(--color-brand) 34%, transparent);
  transform: scale(1.08);
}

.task-row__check:active .task-row__check-box {
  background-color: color-mix(in srgb, var(--color-brand) 24%, transparent);
}

/* 批量选择：同尺寸圆形框，选中态用品牌色实底 */
.task-row__box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin: 0 8px;
  border: 1.5px solid color-mix(in srgb, var(--color-text) 18%, transparent);
  border-radius: 50%;
  background-color: transparent;
  color: transparent;
  transition: color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease),
    background-color var(--dur-fast) var(--ease);
}

.task-row__box--on {
  border-color: var(--color-brand);
  background-color: var(--color-brand);
  color: var(--color-brand-fg);
}

/* ---------- 正文 ---------- */

.task-row__body {
  min-width: 0;
}

/* 标题是这一行唯一的「重音」：15px / 600 / 微收字距 */
.task-row__title {
  /* 2026-10-26：标题也锁单行 —— 极窄窗口下换行会让行高从 84 变成 107，行高必须恒定才彻底平滑 */
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: -0.01em;
  color: var(--color-text);
  word-break: break-word;
  /*
   * 勾选完成时的横线：平时宽度为 0，加上 --done 后自左向右划出来。
   * 用 background 画线而不是 text-decoration，是因为后者只能瞬间出现、不能"由无到有"。
   */
  background-image: linear-gradient(currentColor, currentColor);
  background-repeat: no-repeat;
  background-position: 0 55%;
  background-size: 0 1px;
  transition: color var(--dur-strike) var(--ease), background-size var(--dur-strike) var(--ease);
}

/* 描述只留一行，超出部分省略号收尾；比标题小一档（13px）做弱化 */
.task-row__description {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  /* 占位高度 = 一行正文：没填描述的任务也占着这一行，行高才一致 */
  min-height: 22px;
  margin-top: 3px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-text-2);
  word-break: break-word;
}

/* ---------- 右侧元信息 ---------- */

.task-row__side {
  position: relative;
  display: flex;
  flex: none;
  align-items: center;
  justify-content: flex-end;
  /* 固定宽度 = 优先级 + 时间 + 操作位：每一行的右边缘才能落在同一条线上 */
  width: 236px;
}

.task-row__meta {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  transition: transform var(--dur-base) var(--ease);
}

/*
 * 优先级（2026-10-27 三改）：从「描边胶囊」收成**圆点 + 文字**的一小块浅底 ——
 * 分组列表里每行都挂一枚描边胶囊，边太多、太吵；去掉描边后它退回「标记」这一层，
 * 靠色相（红 / 橙 / 蓝灰）和一枚 4px 圆点区分三档。
 */
.task-row__prio {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 22px;
  padding: 0 9px;
  border: none;
  border-radius: 99px;
  background-color: color-mix(in srgb, currentColor 11%, transparent);
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}

.task-row__prio::before {
  content: '';
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: currentColor;
}

/* 2026-10-27：胶囊只用于展示，不再有可点手感（修改统一走编辑弹窗） */

.task-row__prio--high {
  color: color-mix(in srgb, var(--color-priority-high-fg) 82%, var(--color-text));
}

.task-row__prio--medium {
  color: color-mix(in srgb, var(--color-priority-medium-fg) 82%, var(--color-text));
}

.task-row__prio--low {
  color: color-mix(in srgb, var(--color-priority-low-fg) 82%, var(--color-text));
}

.task-row__due {
  display: inline-flex;
  /* 固定一列：今天 / 10-17 / 未设截止时间 都右对齐，优先级胶囊的位置才不会左右浮动 */
  justify-content: flex-end;
  align-items: center;
  gap: 5px;
  /* 预留完整日期（2026-10-26 18:00）的宽度：悬停切换文本时列宽不变，胶囊不会左右抖 */
  min-width: 126px;
  padding: 0;
  border: none;
  background-color: transparent;
  /* 日期比描述更轻：纯文本、浅灰，只靠时钟图标和字号压住重量 */
  color: var(--color-text-3);
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
  line-height: 1.6;
  white-space: nowrap;
}

/* 悬停才显完整日期（2026-10-26）：两段文本互换，列宽已由 min-width 预留，不产生抖动 */
.task-row__due-full {
  display: none;
}

@media (hover: hover) {
  .task-row:hover .task-row__due-short {
    display: none;
  }

  .task-row:hover .task-row__due-full {
    display: inline;
  }
}

.task-row__due--empty {
  color: var(--color-text-3);
}

/* 逾期：只用红字 + 红图标 */
.task-row__due--overdue {
  color: var(--color-danger);
  font-weight: 500;
}

/*
 * 操作：桌面端绝对定位在右端 —— 默认让元信息贴住卡片右边缘，
 * 悬停时元信息整体左移让位、按钮淡入（两者不重叠，也不推挤卡片宽度）。
 * 触屏（无 hover）退回静态排列，操作始终可见。
 */
.task-row__actions {
  display: flex;
  flex: none;
  /* 只剩删除一个按钮（32px），让位宽度同步 */
  width: 32px;
  justify-content: flex-end;
  gap: 2px;
  transition: opacity var(--dur-fast) var(--ease);
}

@media (hover: hover) {
  .task-row__actions {
    position: absolute;
    top: 50%;
    right: 0;
    transform: translateY(-50%);
    opacity: 0;
  }

  .task-row:hover .task-row__actions,
  .task-row:focus-visible .task-row__actions, .task-row:has(:focus-visible) .task-row__actions {
    opacity: 1;
  }

  /* 左移 40px：正好让出一个 32px 按钮 + 间距 */
  .task-row:hover .task-row__meta,
  .task-row:focus-visible .task-row__meta, .task-row:has(:focus-visible) .task-row__meta {
    transform: translateX(-40px);
  }
}

.task-row__action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: var(--radius-control);
  background-color: transparent;
  color: var(--color-text-3);
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease), background-color var(--dur-fast) var(--ease);
}

.task-row__action:hover {
  color: var(--color-text);
  background-color: var(--control-hover);
}

.task-row__action--danger:hover {
  color: var(--color-danger);
}

/* ---------- 已完成 ---------- */

.task-row--done .task-row__title {
  color: var(--color-text-2);
  background-size: 100% 1px;
}

.task-row--done .task-row__check-box,
.task-row--leaving .task-row__check-box {
  border-color: transparent;
  background-color: var(--color-brand);
  background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0) 62%);
  color: var(--color-brand-fg);
  box-shadow: 0 3px 9px -4px color-mix(in srgb, var(--color-brand) 75%, transparent);
}

.task-row--done .task-row__description,
.task-row--done .task-row__due {
  color: var(--color-text-3);
}

/* ---------- 勾选完成的退场 ---------- */

/*
 * 本地先切成完成态（绿勾 + 划线），随后整卡原地缩小淡出；
 * 260ms 后由 JS 派发 toggle-status，数据层把行移除，下方由 TransitionGroup 补位。
 */
.task-row--leaving {
  pointer-events: none;
}

.task-row--leaving .task-row__title {
  color: var(--color-text-2);
  background-size: 100% 1px;
}

.task-row--leaving .task-row__description,
.task-row--leaving .task-row__due {
  color: var(--color-text-3);
}

/* 窄容器：右侧元信息换到正文下方，左元信息、右操作 */
  /*
   * 2026-10-26 移除 720px 容器断点（原「窄容器把元信息挤到第三行」那套）：
   * 断点切换是瞬时的，无法补间 —— 宽度一变，行高就从 84 跳到 125，怎么调过渡都会有一下「顿」。
   * 现在行在任何宽度都保持同一套栅格，只压缩列宽、不改行高，滚动条缩放全程平滑。
   * 代价：窄窗口（< 720）正文列会偏窄，这是桌面优先的取舍。
   */

</style>
