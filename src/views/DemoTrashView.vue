<script setup lang="ts">
/**
 * 演示模式 · 回收站（8.6）：列表与本尊共用 TrashList，数据来自与任务页共享的内存态。
 * 恢复 / 彻底删除 / 清空都是真的生效，但只存在内存里，刷新即还原。
 */
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import BackToTop from '@/components/BackToTop.vue'
import TrashList from '@/components/TrashList.vue'
import { useDemoTrash } from '@/composables/useDemoTrash'
import type { TrashTask } from '@/types'

const { tasks, total, restore, purge, clear } = useDemoTrash()
const clearing = ref(false)

const MEMORY_HINT = '（演示模式：仅内存，刷新还原）'

function handleRestore(task: TrashTask) {
  restore(task)
  ElMessage.success(`已恢复${MEMORY_HINT}`)
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
  purge(task)
  ElMessage.success(`已彻底删除${MEMORY_HINT}`)
}

/** 清空与真实页一致：需要输入「清空」二字才执行 */
async function handleClear() {
  if (total.value === 0) return
  try {
    await ElMessageBox.prompt(
      `回收站内的 ${total.value} 条任务及其配图会被全部删除，此操作不可恢复。请输入「清空」以确认。`,
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
    const removed = clear()
    ElMessage.success(`已清空 ${removed} 条${MEMORY_HINT}`)
  } finally {
    clearing.value = false
  }
}
</script>

<template>
  <div class="page">
    <TrashList
      :tasks="tasks"
      :clearing="clearing"
      :clear-disabled="total === 0"
      @restore="handleRestore"
      @purge="handlePurge"
      @clear="handleClear"
    />

    <BackToTop />
  </div>
</template>
