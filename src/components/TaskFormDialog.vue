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
  <el-dialog v-model="visible" width="520px" append-to-body>
    <!-- 头部：只读时左边是「任务详情」、右上角是「编辑」；编辑 / 新建时只显示标题 -->
    <template #header>
      <div class="task-form__header">
        <span class="task-form__title">{{ dialogTitle }}</span>
        <el-button v-if="isReadonly" size="small" @click="emit('edit')">
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
      <el-form-item label="标题" prop="title">
        <el-input
          v-model="form.title"
          maxlength="100"
          :show-word-limit="!isReadonly"
          :disabled="isReadonly"
          placeholder="要做什么"
        />
      </el-form-item>

      <el-form-item label="描述">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          maxlength="500"
          :show-word-limit="!isReadonly"
          :disabled="isReadonly"
        />
      </el-form-item>

      <el-form-item label="优先级">
        <el-select v-model="form.priority" :disabled="isReadonly">
          <el-option
            v-for="item in TASK_PRIORITY_OPTIONS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="截止时间">
        <el-date-picker
          v-model="form.dueDate"
          type="datetime"
          value-format="YYYY-MM-DDTHH:mm:ss"
          placeholder="不设截止时间"
          clearable
          :disabled="isReadonly"
        />
      </el-form-item>

      <!-- 「将时间更新为当前时间」是编辑动作，详情里不出现 -->
      <el-form-item v-if="isEdit && !isReadonly">
        <el-checkbox v-model="form.refreshRecordedAt">将时间更新为当前时间</el-checkbox>
      </el-form-item>

      <el-form-item label="配图">
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
      </el-form-item>
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
      <el-button v-if="isReadonly" @click="visible = false">关闭</el-button>
      <template v-else>
        <el-button :disabled="submitting" @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
      </template>
    </template>
  </el-dialog>
</template>

<style scoped>
/* 进度条贴在表单下方、页脚上方，不挤动表单本身 */
.task-form__progress {
  margin-top: 4px;
}

/* 头部：标题在左、「编辑」在右上角；右侧留 24px 给 el-dialog 自带的关闭按钮 */
.task-form__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-right: 24px;
}

.task-form__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
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
