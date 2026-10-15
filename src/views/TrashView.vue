<script setup lang="ts">
/**
 * 回收站（UC-06 / 6.5 ⑩ / 8.8）：数据走 trash store，列表结构与演示页共用 TrashList。
 * 彻底删除不可恢复，清空回收站需输入「清空」二字方可执行。
 */
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import BackToTop from '@/components/BackToTop.vue'
import TrashList from '@/components/TrashList.vue'
import { useTrashStore } from '@/stores/trash'
import type { TrashTask } from '@/types'

const trash = useTrashStore()
const clearing = ref(false)

async function guard(action: () => Promise<unknown>) {
  try {
    await action()
  } catch {
    // 提示已由 http 层给出
  }
}

onMounted(() => guard(() => trash.fetchTrash(1)))

async function handleRestore(task: TrashTask) {
  await guard(() => trash.restore(task.id))
  ElMessage.success('已恢复')
}

async function handlePurge(task: TrashTask) {
  try {
    await ElMessageBox.confirm(
      `「${task.title}」及其配图会被一并删除，此操作不可恢复。`,
      '彻底删除',
      {
        confirmButtonText: '彻底删除',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger',
      },
    )
  } catch {
    return
  }
  await guard(() => trash.purge(task.id))
  ElMessage.success('已彻底删除')
}

async function handleClear() {
  if (trash.total === 0) return
  try {
    await ElMessageBox.prompt(
      `回收站内的 ${trash.total} 条任务及其配图会被全部删除，此操作不可恢复。请输入「清空」以确认。`,
      '清空回收站',
      {
        confirmButtonText: '清空',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger',
        inputPlaceholder: '清空',
        inputValidator: (value) => value === '清空' || '请输入「清空」两个字',
      },
    )
  } catch {
    return
  }
  clearing.value = true
  try {
    const removed = await trash.clearTrash()
    ElMessage.success(`已清空 ${removed} 条`)
  } catch {
    // 提示已由 http 层给出
  } finally {
    clearing.value = false
  }
}
</script>

<template>
  <div class="page">
    <TrashList
      :tasks="trash.tasks"
      :clearing="clearing"
      :clear-disabled="trash.total === 0"
      @restore="handleRestore"
      @purge="handlePurge"
      @clear="handleClear"
    />

    <BackToTop />
  </div>
</template>
