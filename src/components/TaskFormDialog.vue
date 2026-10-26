<script setup lang="ts">
/**
 * 任务弹窗（UC-05 / 6.5 ⑦ / 8.8）—— **只有编辑与新建两种用途**（2026-10-27 去掉只读详情）：
 * 点任务行即进编辑，字段正常填写并提交。
 * 状态只有未完成 / 已完成两态，且由列表上的勾选切换，所以表单里不放状态字段：
 * 新建固定为未完成，编辑时保持该任务原有状态不变。
 * 编辑时默认勾选「将时间更新为当前时间」（改的是 recordedAt）。
 * 只负责收集表单，提交交给调用方：真实页落库、演示页弹「演示模式不保存」。
 */
import { computed, reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { TASK_PRIORITY_OPTIONS } from '@/constants'
import TaskImageField from './TaskImageField.vue'
import type { Task, TaskPayload, TaskPriority } from '@/types'

const props = defineProps<{
  task?: Task | null
  submitting?: boolean
  /** 上传进度 0~100：由调用方从 onUploadProgress 透传，>0 时才显示进度条 */
  progress?: number
}>()
const visible = defineModel<boolean>('visible', { required: true })
const emit = defineEmits<{
  submit: [payload: TaskPayload, images: File[]]
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

/** 平铺的优先级胶囊：按「高 → 中 → 低」展示（2026-10-21 弹窗改版，下拉换成胶囊） */
const PRIORITY_PILLS = [...TASK_PRIORITY_OPTIONS].reverse()
const dialogTitle = computed(() => (isEdit.value ? '编辑任务' : '新建任务'))

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
    <!-- 头部：大标题（右上角关闭按钮由 el-dialog 自带） -->
    <template #header>
      <div class="task-form__header">
        <span class="task-form__title">{{ dialogTitle }}</span>
      </div>
    </template>

    <el-form
      ref="formRef"
      class="task-form"
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
            placeholder="标题"
          />
          <span v-if="form.title.length > 80" class="task-form__counter">
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
          placeholder="补充说明（可选）"
        />
        <span v-if="form.description.length > 400" class="task-form__counter task-form__counter--desc">
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
          />
        </div>

        <div class="task-form__row task-form__row--stack">
          <span class="task-form__label">配图</span>
          <!--
            key 让每次打开都拿到全新的字段实例：弹窗体关闭后仍留在 DOM 里，
            编辑同一个任务时 props.images 不变，光靠 props 重建清不掉上一次选的新文件。
          -->
          <TaskImageField
            :key="`${task?.id ?? 'new'}-${visible}`"
            v-model="images"
            :images="task?.images"
            :submitting="submitting"
          />
        </div>

        <!-- 「将时间更新为当前时间」只在编辑时出现 -->
        <el-checkbox
          v-if="isEdit"
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

/*
 * 「将时间更新为当前时间」的勾选（2026-10-27）：改用强调蓝。
 * 它原来跟随 EP 的 --el-color-primary（浅色主题是近黑、深色主题是近白），
 * 勾没勾上全靠明暗差，深色下几乎分不清；蓝色与「新建任务 / 搜索聚焦环」同一支色。
 */
.task-form__refresh {
  align-self: flex-start;
  --el-checkbox-checked-bg-color: var(--color-accent);
  --el-checkbox-checked-input-border-color: var(--color-accent);
  --el-checkbox-input-border-color-hover: var(--color-accent);
  --el-checkbox-checked-text-color: var(--color-text);
}

.task-form__refresh :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: var(--color-accent);
  border-color: var(--color-accent);
}

.task-form__refresh :deep(.el-checkbox__input.is-checked .el-checkbox__inner::after) {
  border-color: #fff;
}

/*
 * 键盘聚焦时给一圈淡蓝描边。
 * 不能用 `.is-focus` —— EP 在鼠标点击后也会加这个类，会把未勾选的框一起涂蓝。
 */
.task-form__refresh
  :deep(.el-checkbox__input .el-checkbox__original:focus-visible + .el-checkbox__inner) {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 35%, transparent);
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

</style>
