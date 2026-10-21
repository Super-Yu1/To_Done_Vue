<script setup lang="ts">
/**
 * 任务弹窗（UC-05 / 6.5 ⑦ / 8.8）—— **同一套字段，两种模式**：
 *   · 只读（`readonly`，点任务行进来的「任务详情」）：控件全部禁用、去掉字数统计与配图增删入口，
 *     右上角给「编辑」按钮；只读界面与编辑界面逐字段一致，避免两套排版各写一遍再走样。
 *   · 编辑 / 新建：正常填写并提交。
 * 状态只有未完成 / 已完成两态，且由列表上的勾选切换，所以表单里不放状态字段：
 * 新建固定为未完成，编辑时保持该任务原有状态不变。
 * 编辑时默认勾选「将时间更新为当前时间」（改的是 recordedAt）。
 * 只负责收集表单，提交交给调用方：真实页落库、演示页弹「演示模式不保存」。
 */
import { computed, reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import AppIcon from './AppIcon.vue'
import { TASK_PRIORITY_OPTIONS } from '@/constants'
import TaskImageField from './TaskImageField.vue'
import type { Task, TaskPayload, TaskPriority } from '@/types'

const props = defineProps<{
  task?: Task | null
  submitting?: boolean
  /** 上传进度 0~100：由调用方从 onUploadProgress 透传，>0 时才显示进度条 */
  progress?: number
  /** 只读模式：渲染任务详情（同一套字段，只是不可编辑），点右上角「编辑」切回可编辑 */
  readonly?: boolean
}>()
const visible = defineModel<boolean>('visible', { required: true })
const emit = defineEmits<{
  submit: [payload: TaskPayload, images: File[]]
  /** 只读模式下点右上角「编辑」：由调用方把 readonly 关掉即可，弹窗不关不重开 */
  edit: []
}>()

const formRef = ref<FormInstance>()

/**
 * 配图状态：order 是提交顺序（已有图给 id、新选的图占位 'NEW'），files 是新选的图。
 * 结构与 TaskImageField 的 v-model 一致，弹窗只负责打开时按任务重置、提交时把它带走。
 */
const images = ref<{ order: string[]; files: File[] }>({ order: [], files: [] })

const form = reactive({
  title: '',
  description: '',
  priority: 'MEDIUM' as TaskPriority,
  dueDate: '' as string | null,
  refreshRecordedAt: true,
})

const rules: FormRules = {
  title: [
    { required: true, message: '请填写标题', trigger: 'blur' },
    { max: 100, message: '标题最多 100 个字符', trigger: 'blur' },
  ],
}

const isEdit = computed(() => !!props.task)
const isReadonly = computed(() => props.readonly === true)

/** 平铺的优先级胶囊：按「高 → 中 → 低」展示（2026-10-21 弹窗改版，下拉换成胶囊） */
const PRIORITY_PILLS = [...TASK_PRIORITY_OPTIONS].reverse()
const dialogTitle = computed(() => {
  if (isReadonly.value) return '任务详情'
  return isEdit.value ? '编辑任务' : '新建任务'
})

/** 弹窗每次打开都按当前任务重置表单，避免带上一次的残留 */
watch(visible, (opened) => {
  if (!opened) return
  form.title = props.task?.title ?? ''
  form.description = props.task?.description ?? ''
  form.priority = props.task?.priority ?? 'MEDIUM'
  form.dueDate = props.task?.dueDate ?? null
  form.refreshRecordedAt = true
  // 已有图按后端返回的顺序铺开；新选的图清空，免得上一次打开留下的文件跟过来
  images.value = {
    order: (props.task?.images ?? []).map((image) => image.id),
    files: [],
  }
  formRef.value?.clearValidate()
})

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  /*
   * imageOrder：已有图填它的 id、新选的图填 'NEW'（按出现次序对应 images 段的文件）；
   * 'NEW' 的个数必须与 images 段的文件数一致（后端已校验，新建 / 更新同一契约）。
   * 新建且一张没选时不传；编辑时即使清空了也要传空数组——那是「把已有图全删掉」的唯一表达，
   * 省略会被当成「不动配图」。
   */
  const order = images.value.order
  const imageOrder = isEdit.value || order.length > 0 ? order : undefined

  emit(
    'submit',
    {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      // 状态不在这里改：新建即未完成，编辑保持原状态
      status: props.task?.status ?? 'TODO',
      priority: form.priority,
      dueDate: form.dueDate || null,
      refreshRecordedAt: form.refreshRecordedAt,
      imageOrder,
    },
    images.value.files,
  )
}
</script>

<template>
  <el-dialog
    v-model="visible"
    width="512px"
    append-to-body
    align-center
    class="task-form-dialog"
  >
    <!-- 头部：大标题；只读时右侧多一个「编辑」（与关闭按钮并排） -->
    <template #header>
      <div class="task-form__header">
        <span class="task-form__title">{{ dialogTitle }}</span>
        <el-button v-if="isReadonly" size="small" class="task-form__edit" @click="emit('edit')">
          <AppIcon name="edit" :size="14" />
          <span class="btn-text">编辑</span>
        </el-button>
      </div>
    </template>

    <el-form
      ref="formRef"
      class="task-form"
      :class="{ 'task-form--readonly': isReadonly }"
      :model="form"
      :rules="rules"
      label-position="top"
      @submit.prevent
    >
      <!-- ① 标题：无边框输入，聚焦才显一条下划线；字数统计靠上限才出现 -->
      <el-form-item prop="title" class="task-form__item task-form__item--title">
        <div class="task-form__title-row">
          <el-input
            v-model="form.title"
            class="task-form__title-input"
            maxlength="100"
            :disabled="isReadonly"
            placeholder="标题"
          />
          <span v-if="!isReadonly && form.title.length > 80" class="task-form__counter">
            {{ form.title.length }}/100
          </span>
        </div>
      </el-form-item>

      <!-- ② 描述：浅灰底、无边框文本域 -->
      <el-form-item class="task-form__item">
        <el-input
          v-model="form.description"
          class="task-form__desc"
          type="textarea"
          :rows="6"
          maxlength="500"
          resize="none"
          :disabled="isReadonly"
          placeholder="补充说明（可选）"
        />
        <span
          v-if="!isReadonly && form.description.length > 400"
          class="task-form__counter task-form__counter--desc"
        >
          {{ form.description.length }}/500
        </span>
      </el-form-item>

      <!-- ③ 属性区：整块浅灰面板，与正文分开 -->
      <div class="task-form__panel">
        <div class="task-form__row">
          <span class="task-form__label">优先级</span>
          <div class="task-form__prios" role="radiogroup" aria-label="优先级">
            <button
              v-for="item in PRIORITY_PILLS"
              :key="item.value"
              class="task-form__prio"
              :class="[
                `task-form__prio--${item.value.toLowerCase()}`,
                { 'task-form__prio--on': form.priority === item.value },
              ]"
              type="button"
              role="radio"
              :aria-checked="form.priority === item.value"
              :disabled="isReadonly"
              @click="form.priority = item.value"
            >
              {{ item.label }}
            </button>
          </div>
        </div>

        <div class="task-form__row">
          <span class="task-form__label">截止时间</span>
          <el-date-picker
            v-model="form.dueDate"
            class="task-form__due"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ss"
            placeholder="选择日期"
            clearable
            :disabled="isReadonly"
          />
        </div>

        <div class="task-form__row task-form__row--stack">
          <span class="task-form__label">配图</span>
          <!--
            key 让每次打开都拿到全新的字段实例：弹窗体关闭后仍留在 DOM 里，
            编辑同一个任务时 props.images 不变，光靠 props 重建清不掉上一次选的新文件。
          -->
          <TaskImageField
            :key="`${task?.id ?? 'new'}-${visible}-${isReadonly}`"
            v-model="images"
            :images="task?.images"
            :submitting="submitting"
            :readonly="isReadonly"
          />
        </div>

        <!-- 「将时间更新为当前时间」是编辑动作，详情里不出现 -->
        <el-checkbox
          v-if="isEdit && !isReadonly"
          v-model="form.refreshRecordedAt"
          class="task-form__refresh"
        >
          将时间更新为当前时间
        </el-checkbox>
      </div>
    </el-form>

    <!-- 有图在传时才出现：进度由调用方从 onUploadProgress 透传 -->
    <el-progress
      v-if="progress && progress > 0 && progress < 100"
      class="task-form__progress"
      :percentage="progress"
      :stroke-width="4"
      :show-text="false"
    />

    <template #footer>
      <div class="task-form__footer">
        <el-button v-if="isReadonly" class="task-form__cancel" @click="visible = false">
          关闭
        </el-button>
        <template v-else>
          <el-button class="task-form__cancel" :disabled="submitting" @click="visible = false">
            取消
          </el-button>
          <el-button
            class="task-form__save"
            type="primary"
            :loading="submitting"
            @click="handleSubmit"
          >
            保存
          </el-button>
        </template>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.task-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.task-form__item {
  margin-bottom: 0;
}

/* 头部：20px 大标题；右侧留 40px 给关闭按钮，避免标题与 X 撞在一起 */
.task-form__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-right: 40px;
}

.task-form__title {
  font-size: 20px;
  font-weight: 600;
  line-height: 32px;
  color: var(--color-text);
}

/* ① 标题：无边框、无底色，聚焦才显一条下划线 —— 像「正在写的一行字」而不是表单框 */
.task-form__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.task-form__title-input {
  flex: 1;
}

.task-form__title-input :deep(.el-input__wrapper) {
  padding: 10px 14px;
  border-radius: 12px;
  background-color: var(--color-hover);
  box-shadow: none;
  transition: box-shadow var(--dur-fast) var(--ease);
}

.task-form__title-input :deep(.el-input__wrapper.is-focus) {
  box-shadow: inset 0 0 0 1px var(--color-text);
}

.task-form__title-input :deep(.el-input__inner) {
  height: 24px;
  font-size: 16px;
  font-weight: 500;
}

/* 字数统计默认不出现，接近上限才亮出来 */
.task-form__counter {
  flex: none;
  font-size: 12px;
  color: var(--color-text-3);
  font-variant-numeric: tabular-nums;
}

.task-form__counter--desc {
  display: block;
  margin-top: 4px;
  text-align: right;
}

/* ② 描述：浅灰底、无边框的文本域 */
.task-form__desc :deep(.el-textarea__inner) {
  /* 2026-10-21：高度显著加高（≈120px），浅灰底无边框，聚焦才加一条极细的主色边 */
  min-height: 120px;
  padding: 14px;
  border-radius: 12px;
  background-color: var(--color-hover);
  box-shadow: none;
  font-size: 14px;
  line-height: 1.7;
  transition: box-shadow var(--dur-fast) var(--ease);
}

.task-form__desc :deep(.el-textarea__inner:focus) {
  box-shadow: inset 0 0 0 1px var(--color-text);
}

/* ③ 属性面板：整块浅灰，和正文明确分开 */
.task-form__panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border-radius: 14px;
  background-color: var(--color-hover);
}

.task-form__row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.task-form__row--stack {
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}

.task-form__label {
  flex: none;
  width: 64px;
  font-size: 13px;
  color: var(--color-text-2);
}

/* 优先级胶囊：高红 / 中橙 / 低蓝灰，选中时是实底 —— 与任务行上的优先级同一套令牌 */
.task-form__prios {
  display: flex;
  gap: 8px;
}

/* 胶囊：未选中只有「本色文字 + 透明底」，选中才实底白字（2026-10-21 定稿，去掉未选中描边） */
.task-form__prio {
  height: 30px;
  padding: 0 16px;
  border: none;
  border-radius: var(--radius-pill);
  background-color: transparent;
  color: var(--color-text-2);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease);
}

.task-form__prio:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.task-form__prio--high {
  color: var(--color-priority-high-fg);
}

.task-form__prio--medium {
  color: var(--color-priority-medium-fg);
}

.task-form__prio--low {
  color: var(--color-priority-low-fg);
}

.task-form__prio--high:hover:not(:disabled) {
  background-color: var(--color-priority-high-bg);
}

.task-form__prio--medium:hover:not(:disabled) {
  background-color: var(--color-priority-medium-bg);
}

.task-form__prio--low:hover:not(:disabled) {
  background-color: var(--color-priority-low-bg);
}

.task-form__prio--on.task-form__prio--high {
  background-color: var(--color-priority-high-fg);
  color: #fff;
}

.task-form__prio--on.task-form__prio--medium {
  background-color: var(--color-priority-medium-fg);
  color: #fff;
}

.task-form__prio--on.task-form__prio--low {
  background-color: var(--color-priority-low-fg);
  color: #fff;
}

/* 截止时间：做成白底按钮的样子（日历图标由 EP 自带），占满剩余宽度 */
.task-form__due {
  flex: 1;
}

.task-form__due :deep(.el-input__wrapper) {
  height: 36px;
  border-radius: 10px;
  background-color: var(--color-surface);
  box-shadow: none;
}

.task-form__due :deep(.el-input__wrapper.is-focus) {
  box-shadow: inset 0 0 0 1px var(--color-border-strong);
}

.task-form__refresh {
  align-self: flex-start;
}

/* 底部：取消（白底黑字）+ 保存（品牌主色，圆角），右对齐 */
.task-form__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.task-form__cancel {
  height: 36px;
  padding: 0 18px;
  border: 1px solid var(--color-border-strong);
  border-radius: 10px;
  background-color: var(--color-surface);
  color: var(--color-text);
}

.task-form__cancel:hover {
  background-color: var(--color-hover);
  color: var(--color-text);
}

.task-form__save {
  height: 36px;
  padding: 0 22px;
  border: none;
  border-radius: 10px;
  background-color: var(--color-primary-bg);
  color: var(--color-primary-fg);
}

.task-form__save:hover {
  background-color: var(--color-primary-bg);
  color: var(--color-primary-fg);
  opacity: 0.88;
}

/* 进度条贴在表单下方、页脚上方，不挤动表单本身 */
.task-form__progress {
  margin-top: 12px;
}

/*
 * 只读模式：值用正文色读清楚 —— EP 的禁用灰（--el-disabled-text-color）是给「填不了的输入框」用的，
 * 详情要的是「不用填的已填值」，两者观感不同。
 */
.task-form--readonly :deep(.is-disabled .el-input__inner),
.task-form--readonly :deep(.is-disabled .el-textarea__inner),
.task-form--readonly :deep(.is-disabled .el-select__placeholder) {
  color: var(--color-text);
  -webkit-text-fill-color: var(--color-text);
}
</style>
