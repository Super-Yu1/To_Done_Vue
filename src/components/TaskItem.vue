<script setup lang="ts">
/**
 * 任务行（8.5；2026-10-15 改版）：
 * 信息全部聚在左侧一列 —— 标题 / 描述 / 元信息行（优先级 · 截止时间）左对齐，
 * 右侧只留操作。原「168px 右对齐元信息列」在宽屏下离标题隔了一整屏（问题见
 * docs/前端修改说明 第 3 条 A），故去掉；元信息行的左边缘与标题对齐，整列竖扫仍是齐的。
 *
 * 整行点击 = 打开**只读详情**（不是直接进编辑）：编辑入口挪到详情弹窗右上角那个按钮上。
 *
 * 行内快捷入口（E）：优先级胶囊点开就是三档选择、截止时间点开就地弹日期面板；
 * 本组件只发事件，落接口由调用方负责（真实页走 store、演示页走内存态）。
 * 勾选完成：视觉仍是 26px 圆环，命中区扩到 34px（D）。
 * 批量选择（F）：前置位换成方形多选框，行内快捷入口与删除整体禁用/隐藏。
 */
import { computed, nextTick, ref } from 'vue'
import AppIcon from './AppIcon.vue'
import PriorityPicker from './PriorityPicker.vue'
import { TASK_PRIORITY_CLASS, TASK_PRIORITY_LABEL } from '@/constants'
import { formatDateTime, isOverdue } from '@/utils/date'
import type { Task, TaskPriority } from '@/types'

const props = defineProps<{
  task: Task
  /** 批量选择模式：前置位换方形框、行内快捷入口禁用、点击整行 = 勾选 */
  selectMode?: boolean
  selected?: boolean
}>()

const emit = defineEmits<{
  /** 点击整行：打开只读详情（编辑入口在详情弹窗右上角，2026-10-15 起） */
  open: [Task]
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
  props.task.dueDate ? formatDateTime(props.task.dueDate) : '未设截止时间',
)

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

async function openDue() {
  dueEditing.value = true
  await nextTick()
  duePicker.value?.handleOpen()
}

function commitDue(value: string | null) {
  dueEditing.value = false
  emit('change-due-date', props.task, value || null)
}

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
    :class="{ 'task-row--done': isDone, 'task-row--select': selectMode, 'task-row--selected': selected }"
    role="button"
    tabindex="0"
    :aria-label="selectMode ? `选择任务：${task.title}` : `查看任务详情：${task.title}`"
    @click="handleRowClick"
    @keydown.enter.prevent="handleRowClick"
    @keydown.space.prevent="handleRowClick"
  >
    <!-- 批量选择模式：方形多选框 —— 形状与「完成」圆环不同，避免两种语义混淆 -->
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
      :aria-pressed="isDone"
      :aria-label="isDone ? '标记为未完成' : '标记为已完成'"
      :title="isDone ? '标记为未完成' : '标记为已完成'"
      @click.stop="emit('toggle-status', task)"
    >
      <span class="task-row__check-ring">
        <AppIcon name="check" :size="14" />
      </span>
    </button>

    <div class="task-row__body">
      <h3 class="task-row__title">{{ task.title }}</h3>
      <p v-if="task.description" class="task-row__description">{{ task.description }}</p>

      <div class="task-row__meta">
        <el-popover
          v-model:visible="priorityOpen"
          trigger="click"
          placement="bottom-start"
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
          :model-value="task.dueDate"
          :editable="false"
          clearable
          placeholder="未设截止时间"
          @change="commitDue"
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
          {{ dueText }}
        </button>
      </div>
    </div>

    <div v-if="!selectMode" class="task-row__actions">
      <button
        class="task-row__action"
        type="button"
        :aria-label="`删除：${task.title}`"
        title="删除"
        @click.stop="emit('remove', task)"
      >
        <AppIcon name="trash" />
      </button>
    </div>
  </article>
</template>

<style scoped>
.task-row {
  display: grid;
  /* 前置位 34px：勾选圈的命中区（圆环本身仍是 26px），与回收站的标记列同宽，两页文字左边缘对齐 */
  grid-template-columns: 34px minmax(0, 1fr) 32px;
  align-items: center;
  gap: 14px;
  /* 2026-10-16 收紧：13×18（原 16×20），一屏能多看一条 */
  padding: 13px 18px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  cursor: pointer;
  transition: border-color var(--dur-fast) var(--ease), background-color var(--dur-fast) var(--ease);
}

.task-row:hover,
.task-row:focus-within {
  border-color: var(--color-border-strong);
  background-color: var(--color-hover);
}

/* 批量选择：选中行留一个持久的高亮，避免与 hover 混在一起认不出来 */
.task-row--selected {
  border-color: var(--color-border-strong);
  background-color: var(--color-hover);
}

/* 勾选：34px 命中区包着 26px 圆环，视觉尺寸不变、点得更容易（D） */
.task-row__check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: none;
  border-radius: var(--radius-pill);
  background-color: transparent;
  cursor: pointer;
}

.task-row__check-ring {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-pill);
  color: transparent;
  transition: color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease),
    background-color var(--dur-fast) var(--ease);
}

/* 悬停时给出「点一下就会完成」的预览：淡绿底 + 半透明勾号 */
.task-row__check:hover .task-row__check-ring {
  border-color: var(--color-status-done);
  background-color: color-mix(in srgb, var(--color-status-done) 12%, transparent);
  color: var(--color-status-done);
}

.task-row__check:active .task-row__check-ring {
  background-color: color-mix(in srgb, var(--color-status-done) 22%, transparent);
}

/* 批量选择：前置位换成方形框（与完成圆环区分开） */
.task-row__box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin: 0 6px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  background-color: transparent;
  color: transparent;
  transition: color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease),
    background-color var(--dur-fast) var(--ease);
}

.task-row__box--on {
  border-color: var(--color-primary-bg);
  background-color: var(--color-primary-bg);
  color: var(--color-primary-fg);
}

.task-row__body {
  min-width: 0;
}

/* 标题是这一行唯一的「重音」：15px / 600（2026-10-16 从 500 提到 600） */
.task-row__title {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
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

/* 描述只留一行，超出部分省略号收尾；比标题小一档（13px）做弱化，仍是次要色 */
.task-row__description {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-top: 2px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-2);
  word-break: break-word;
}

/*
 * 元信息行：优先级与截止时间和标题同一起点，宽屏下也不用横穿整屏去找它们（A/C）。
 * 固定顺序（优先级在前、时间在后）与 10px 间距，让整列竖扫时两项都在同一条线上。
 */
.task-row__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 5px;
}

.task-row__prio {
  cursor: pointer;
  transition: border-color var(--dur-fast) var(--ease);
}

.task-row__prio:hover:not(:disabled) {
  border-color: currentColor;
}

.task-row__due {
  padding: 0;
  border: none;
  background-color: transparent;
  color: var(--color-text-2);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  line-height: 1.6;
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease);
}

.task-row__due:hover:not(:disabled) {
  color: var(--color-text);
}

.task-row__due--empty {
  color: var(--color-text-3);
}

/* 逾期：只用红字（原先左边插一个小圆点，会让整列左右晃） */
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

.task-row__picker :deep(.el-input__inner) {
  height: 20px;
  color: var(--color-text-2);
  font-size: 12px;
}

/*
 * 操作平时收起（透明度 0），整行悬停或键盘焦点进入才显形 —— 行本身才是主角。
 * 只在真有 hover 的设备上收：触屏没有 hover，收起来就等于点不到（`hv` 媒体查询是关键）。
 */
.task-row__actions {
  display: flex;
  justify-content: flex-end;
  transition: opacity var(--dur-fast) var(--ease);
}

@media (hover: hover) {
  .task-row__actions {
    opacity: 0;
  }

  .task-row:hover .task-row__actions,
  .task-row:focus-within .task-row__actions {
    opacity: 1;
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
  border-radius: var(--radius-md);
  background-color: transparent;
  color: var(--color-text-3);
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease), background-color var(--dur-fast) var(--ease);
}

/* 整行可点之后，只有删除按钮还需要 hover 反馈；hover 才显危险色，平时保持克制 */
.task-row__action:hover {
  color: var(--color-danger);
  background-color: var(--color-bg);
}

/* 已完成：标题转次要色，横线从 0 拉到 100%（宽度过渡在上面那条规则里） */
.task-row--done .task-row__title {
  color: var(--color-text-2);
  background-size: 100% 1px;
}

.task-row--done .task-row__check-ring {
  border-color: var(--color-status-done);
  background-color: var(--color-status-done);
  color: var(--color-surface);
}

.task-row--done .task-row__due {
  color: var(--color-text-3);
}

/* 窄屏：元信息与操作换到第二段，左对齐（桌面优先，这里只保证不挤坏） */
@container (max-width: 640px) {
  .task-row {
    grid-template-columns: 34px minmax(0, 1fr);
    gap: 12px;
  }

  .task-row__actions {
    grid-column: 2;
    justify-content: flex-start;
  }
}
</style>
