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
import {
  TASK_MAX_IMAGES,
  TASK_PRIORITY_OPTIONS,
  UPLOAD_MAX_BYTES,
} from '@/constants'
import type { Task, TaskPayload, TaskPriority } from '@/types'

const props = defineProps<{ task?: Task | null; submitting?: boolean }>()
const visible = defineModel<boolean>('visible', { required: true })
const emit = defineEmits<{ submit: [TaskPayload] }>()

const formRef = ref<FormInstance>()

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
const imageLimit = computed(() => `最多 ${TASK_MAX_IMAGES} 张，单张不超过 ${UPLOAD_MAX_BYTES / 1024 / 1024}MB`)

/** 弹窗每次打开都按当前任务重置表单，避免带上一次的残留 */
watch(visible, (opened) => {
  if (!opened) return
  form.title = props.task?.title ?? ''
  form.description = props.task?.description ?? ''
  form.priority = props.task?.priority ?? 'MEDIUM'
  form.dueDate = props.task?.dueDate ?? null
  form.refreshRecordedAt = true
  formRef.value?.clearValidate()
})

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  emit('submit', {
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    // 状态不在这里改：新建即未完成，编辑保持原状态
    status: props.task?.status ?? 'TODO',
    priority: form.priority,
    dueDate: form.dueDate || null,
    refreshRecordedAt: form.refreshRecordedAt,
  })
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
        <p class="task-form__images-hint">
          配图上传尚未接通：按 6.5 ⑦，配图随任务一起提交（{{ imageLimit }}），
          前端还需本地压缩与拖动排序，待后端接口就绪后实现。
        </p>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.task-form__images-hint {
  font-size: 12px;
  line-height: 1.7;
  color: var(--color-text-2);
}
</style>
