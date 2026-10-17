<script setup lang="ts">
/**
 * 任务卡片（8.5；2026-10-18 按设计稿改版）：
 * 左侧方形复选框，中间标题 / 描述，右侧优先级标签与人类可读的截止时间（`今天 14:57` / `10-18`）。
 *
 * 整行点击 = 打开**只读详情**（不是直接进编辑）：编辑入口挪到详情弹窗右上角那个按钮上。
 *
 * 行内快捷入口（E）：优先级胶囊点开就是三档选择、截止时间点开就地弹日期面板；
 * 本组件只发事件，落接口由调用方负责（真实页走 store、演示页走内存态）。
 * 批量选择（F）：前置位换成方形多选框，行内快捷入口与删除整体禁用/隐藏。
 */
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import PriorityPicker from './PriorityPicker.vue'
import { TASK_PRIORITY_CLASS, TASK_PRIORITY_LABEL } from '@/constants'
import { formatDueLabel, isOverdue } from '@/utils/date'
import type { Task, TaskPriority } from '@/types'

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
  /** 点击整行：打开只读详情 */
  open: [Task]
  /** 点行尾铅笔：直接打开可编辑的弹窗 */
  edit: [Task]
  remove: [Task]
  'toggle-status': [Task]
  'change-priority': [Task, TaskPriority]
  'change-due-date': [Task, string | null]
  'toggle-select': [Task]
}>()

/** 日期选择器只用到「展开面板」这一个能力，这里只声明用到的那部分，不引组件内部类型 */
interface PickerHandle {
  handleOpen: () => void
}

const isDone = computed(() => props.task.status === 'DONE')
const overdue = computed(() => isOverdue(props.task.dueDate, props.task.status))
const dueText = computed(() =>
  props.task.dueDate ? formatDueLabel(props.task.dueDate) : '未设截止时间',
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

const priorityOpen = ref(false)

function pickPriority(priority: TaskPriority) {
  priorityOpen.value = false
  if (priority === props.task.priority) return
  emit('change-priority', props.task, priority)
}

/**
 * 截止时间：平时是文字按钮，点开才实例化日期选择器并展开面板 ——
 * 一行只实例化一个，长列表滚动时不会为每行都建一个 picker。
 * 收起时机取「面板关闭」（visible-change = false）：用 blur 会在点面板时误收。
 */
const dueEditing = ref(false)
const duePicker = ref<PickerHandle | null>(null)
/** 面板里的草稿值：改动先落在这里，面板收起时再决定要不要提交 */
const dueDraft = ref<string | null>(null)

async function openDue() {
  dueDraft.value = props.task.dueDate ?? null
  dueEditing.value = true
  await nextTick()
  duePicker.value?.handleOpen()
}

/**
 * 提交草稿：值一被写回就提交，与 EP 的事件顺序无关。
 * 不要在这里判 `dueEditing`：EP 先派发 `visible-change(false)`、之后才写回 modelValue，
 * 拿它当守卫会把真正该提交的那一次挡掉。草稿只有这个面板会写，安全。
 */
watch(dueDraft, (value) => {
  const next = value || null
  if (next === (props.task.dueDate ?? null)) return
  emit('change-due-date', props.task, next)
  dueEditing.value = false
})

function handleDueVisible(visible: boolean) {
  if (!visible) dueEditing.value = false
}

/** 整行点击：选择模式下改为勾选；用户正在划选文字（想复制）时不触发 */
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

    <button
      v-else
      class="task-row__check"
      type="button"
      :aria-pressed="isDone || leaving"
      :aria-label="isDone || leaving ? '标记为未完成' : '标记为已完成'"
      :title="isDone || leaving ? '标记为未完成' : '标记为已完成'"
      @click.stop="handleToggleStatus"
    >
      <span class="task-row__check-box">
        <AppIcon name="check" :size="14" />
      </span>
    </button>

    <div class="task-row__body">
      <h3 class="task-row__title">{{ task.title }}</h3>
      <!--
        描述是可选字段，但这一行**始终渲染**并占一行高度：
        否则没填描述的任务会矮一截，长列表里行的节奏忽高忽低。
      -->
      <p class="task-row__description">{{ task.description || '' }}</p>
    </div>

    <!-- 右侧：优先级 + 截止时间，操作按钮留固定位置、悬停才显形（不推动布局） -->
    <div class="task-row__side">
      <div class="task-row__meta">
        <el-popover
          v-model:visible="priorityOpen"
          trigger="click"
          placement="bottom-end"
          :width="128"
          :disabled="selectMode"
        >
          <template #reference>
            <button
              class="task-row__prio prio"
              :class="TASK_PRIORITY_CLASS[task.priority]"
              type="button"
              :disabled="selectMode"
              :aria-label="`优先级 ${TASK_PRIORITY_LABEL[task.priority]}，点击修改`"
              :title="selectMode ? '' : '修改优先级'"
              @click.stop
            >
              <span
                class="prio__dot"
                :class="{ 'prio__dot--hollow': task.priority !== 'HIGH' }"
                aria-hidden="true"
              />
              {{ TASK_PRIORITY_LABEL[task.priority] }}
            </button>
          </template>
          <PriorityPicker :value="task.priority" @pick="pickPriority" />
        </el-popover>

        <el-date-picker
          v-if="dueEditing"
          ref="duePicker"
          class="task-row__picker"
          size="small"
          type="datetime"
          value-format="YYYY-MM-DDTHH:mm:ss"
          format="YYYY-MM-DD HH:mm"
          v-model="dueDraft"
          :editable="false"
          clearable
          placeholder="未设截止时间"
          @visible-change="handleDueVisible"
        />
        <button
          v-else
          class="task-row__due"
          :class="{ 'task-row__due--overdue': overdue, 'task-row__due--empty': !task.dueDate }"
          type="button"
          :disabled="selectMode"
          :title="selectMode ? '' : task.dueDate ? '修改截止时间' : '设置截止时间'"
          @click.stop="openDue"
        >
          <AppIcon name="clock" :size="12" />
          {{ dueText }}
        </button>
      </div>

      <div v-if="!selectMode" class="task-row__actions">
        <button
          class="task-row__action"
          type="button"
          :aria-label="`编辑：${task.title}`"
          title="编辑"
          @click.stop="emit('edit', task)"
        >
          <AppIcon name="edit" />
        </button>
        <button
          class="task-row__action task-row__action--danger"
          type="button"
          :aria-label="`删除：${task.title}`"
          title="删除"
          @click.stop="emit('remove', task)"
        >
          <AppIcon name="trash" />
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.task-row {
  display: grid;
  /* 前置位 40px（命中区）放 24px 方形框；正文一列；右侧元信息 + 固定宽度的操作列 */
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-card);
  cursor: pointer;
  transition: border-color var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease);
}

.task-row:hover,
.task-row:focus-within {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-card-hover);
}

/* 批量选择：选中行留一个持久的高亮 */
.task-row--selected {
  border-color: var(--color-border-strong);
  background-color: var(--color-hover);
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
  width: 26px;
  height: 26px;
  /* 比卡片描边深两档：设计稿里这是每张卡的第一个落点，必须一眼看清 */
  border: 1.5px solid color-mix(in srgb, var(--color-text) 26%, transparent);
  border-radius: 8px;
  background-color: var(--color-surface);
  color: transparent;
  transition: color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease),
    background-color var(--dur-fast) var(--ease);
}

/* 悬停时给出「点一下就会完成」的预览：薄荷绿描边 + 淡绿底 + 半透明勾号 */
.task-row__check:hover .task-row__check-box {
  border-color: var(--color-mint);
  background-color: var(--color-mint-bg);
  color: var(--color-mint-fg);
}

.task-row__check:active .task-row__check-box {
  background-color: color-mix(in srgb, var(--color-mint) 28%, transparent);
}

/* 批量选择：同尺寸方形框，选中态用正文色实底 */
.task-row__box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  margin: 0 7px;
  border: 1.5px solid color-mix(in srgb, var(--color-text) 26%, transparent);
  border-radius: 8px;
  background-color: var(--color-surface);
  color: transparent;
  transition: color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease),
    background-color var(--dur-fast) var(--ease);
}

.task-row__box--on {
  border-color: var(--color-primary-bg);
  background-color: var(--color-primary-bg);
  color: var(--color-primary-fg);
}

/* ---------- 正文 ---------- */

.task-row__body {
  min-width: 0;
}

/* 标题是这一行唯一的「重音」：16px / 600 */
.task-row__title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
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
  min-height: 21px;
  margin-top: 3px;
  font-size: 13px;
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

.task-row__prio {
  cursor: pointer;
  transition: border-color var(--dur-fast) var(--ease);
}

.task-row__prio:hover:not(:disabled) {
  border-color: currentColor;
}

.task-row__due {
  display: inline-flex;
  /* 固定一列：今天 / 10-17 / 未设截止时间 都右对齐，优先级胶囊的位置才不会左右浮动 */
  justify-content: flex-end;
  align-items: center;
  gap: 4px;
  min-width: 92px;
  padding: 0;
  border: none;
  background-color: transparent;
  /* 时间是次要信息：纯文本、不套胶囊，只靠时钟图标和字号压住重量 */
  color: var(--color-text-2);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  line-height: 1.6;
  white-space: nowrap;
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease);
}

.task-row__due:hover:not(:disabled) {
  color: var(--color-text);
}

.task-row__due--empty {
  color: var(--color-text-3);
}

/* 逾期：只用红字 + 红图标 */
.task-row__due--overdue,
.task-row__due--overdue:hover:not(:disabled) {
  color: var(--color-danger);
  font-weight: 500;
}

.task-row__prio:disabled,
.task-row__due:disabled {
  cursor: default;
}

/* 就地编辑的日期面板：外观贴着元信息文字，点开才出现 */
.task-row__picker {
  width: 152px;
}

.task-row__picker :deep(.el-input__wrapper) {
  padding: 0 4px;
  background-color: transparent;
  box-shadow: none;
}

.task-row__picker :deep(.el-input__wrapper.is-focus) {
  box-shadow: none;
}

.task-row__picker :deep(.el-input__inner) {
  height: 20px;
  color: var(--color-text-2);
  font-size: 12px;
}

/*
 * 操作：桌面端绝对定位在右端 —— 默认让元信息贴住卡片右边缘，
 * 悬停时元信息整体左移让位、按钮淡入（两者不重叠，也不推挤卡片宽度）。
 * 触屏（无 hover）退回静态排列，操作始终可见。
 */
.task-row__actions {
  display: flex;
  flex: none;
  width: 60px;
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
  .task-row:focus-within .task-row__actions {
    opacity: 1;
  }

  /* 左移 68px：正好让出两个 29px 按钮 + 间距 */
  .task-row:hover .task-row__meta,
  .task-row:focus-within .task-row__meta {
    transform: translateX(-68px);
  }
}

.task-row__action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 29px;
  height: 29px;
  padding: 0;
  border: none;
  border-radius: var(--radius-md);
  background-color: transparent;
  color: var(--color-text-3);
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease), background-color var(--dur-fast) var(--ease);
}

.task-row__action:hover {
  color: var(--color-text);
  background-color: var(--color-bg-soft);
}

.task-row__action--danger:hover {
  color: var(--color-danger);
}

/* ---------- 已完成 ---------- */

.task-row--done .task-row__title {
  color: var(--color-text-2);
  background-size: 100% 1px;
}

.task-row--done .task-row__check-box {
  border-color: var(--color-status-done);
  background-color: var(--color-status-done);
  color: var(--color-surface);
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

.task-row--leaving .task-row__check-box {
  border-color: var(--color-status-done);
  background-color: var(--color-status-done);
  color: var(--color-surface);
}

/* 窄容器：右侧元信息换到正文下方，左元信息、右操作 */
@container (max-width: 720px) {
  .task-row {
    grid-template-columns: 40px minmax(0, 1fr);
    gap: 12px;
  }

  .task-row__side {
    grid-column: 2;
    width: 100%;
    justify-content: space-between;
  }

  .task-row__meta {
    justify-content: flex-start;
  }

  .task-row__due {
    min-width: 0;
  }

  .task-row__actions {
    position: static;
    transform: none;
    opacity: 1;
  }

  /* 覆盖桌面端的「悬停让位」：窄容器里元信息与操作分列两端，不需要左移 */
  .task-row:hover .task-row__meta,
  .task-row:focus-within .task-row__meta {
    transform: none;
  }
}
</style>
