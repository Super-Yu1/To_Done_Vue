<script setup lang="ts">
/**
 * 任务表单弹窗（UC-05 / 6.5 ⑦ / 8.8）。
 * 状态只有未完成 / 已完成两态，且由列表上的勾选切换，所以表单里不再放状态字段：
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
const emit = defineEmits<{ submit: [payload: TaskPayload, images: File[]] }>()

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
   * imageOrder：已有图填它的 id、新选的图填 'NEW'（按出现次序对应 images 段的文件）。
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
  <el-dialog v-model="visible" :title="dialogTitle" width="520px" append-to-body>
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
      <el-form-item label="标题" prop="title">
        <el-input v-model="form.title" maxlength="100" show-word-limit placeholder="要做什么" />
      </el-form-item>

      <el-form-item label="描述">
        <el-input v-model="form.description" type="textarea" :rows="3" maxlength="500" show-word-limit />
      </el-form-item>

      <el-form-item label="优先级">
        <el-select v-model="form.priority">
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
        />
      </el-form-item>

      <el-form-item v-if="isEdit">
        <el-checkbox v-model="form.refreshRecordedAt">将时间更新为当前时间</el-checkbox>
      </el-form-item>

      <el-form-item label="配图">
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
      <el-button :disabled="submitting" @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
/* 进度条贴在表单下方、页脚上方，不挤动表单本身 */
.task-form__progress {
  margin-top: 4px;
}
</style>
