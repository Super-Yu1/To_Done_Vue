<script setup lang="ts">
/**
 * 注销用户弹窗（8.9）：无输入，只有说明与确认按钮，确认按钮用危险色。
 * 注销是软删除且不可恢复；邮箱与手机号立即释放，任务与图片保留。
 */
import { computed } from 'vue'
import type { AdminUser } from '@/types'

const props = defineProps<{ user: AdminUser | null; submitting?: boolean }>()
const visible = defineModel<boolean>('visible', { required: true })
const emit = defineEmits<{ confirm: [] }>()

const displayName = computed(() => props.user?.name || props.user?.email || '')
const dataSummary = computed(() => {
  const user = props.user
  if (!user) return ''
  const taskTotal = user.taskCount + user.taskCountInTrash
  const imageTotal = user.imageCount + user.imageCountInTrash
  return `现有 ${taskTotal} 条任务（含回收站 ${user.taskCountInTrash} 条）、${imageTotal} 张图片。`
})
</script>

<template>
  <el-dialog v-model="visible" title="注销用户" width="480px" append-to-body>
    <p class="dialog-hint">
      「{{ displayName }}」将<strong>立即无法登录，且注销不可恢复</strong>。
    </p>
    <ul class="dialog-list">
      <li>邮箱与手机号会被释放，任何人都可以用它们重新注册。</li>
      <li>任务、配图、头像与回收站数据保留，但不再与之关联。</li>
      <li>{{ dataSummary }}</li>
    </ul>
    <p class="dialog-hint">若只是想临时停用，请改用「冻结」。</p>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="danger" :loading="submitting" @click="emit('confirm')">注销该用户</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.dialog-hint {
  font-size: 12px;
  line-height: 1.8;
  color: var(--color-text-2);
}

.dialog-list {
  margin: 8px 0;
  padding-left: 20px;
  font-size: 12px;
  line-height: 1.9;
  color: var(--color-text-2);
}
</style>
