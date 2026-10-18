<script setup lang="ts">
/**
 * 演示模式 · 回收站（8.6）：列表与本尊共用 TrashList，数据来自与任务页共享的内存态。
 * 恢复 / 彻底删除 / 清空都是真的生效，但只存在内存里，刷新即还原。
 */
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import BackToTop from '@/components/BackToTop.vue'
import TrashList from '@/components/TrashList.vue'
import { useDemoTrash } from '@/composables/useDemoTrash'
import type { TrashTask } from '@/types'

const { tasks, total, restore, purge, clear } = useDemoTrash()
const clearing = ref(false)

const MEMORY_HINT = '（演示模式：仅内存，刷新还原）'

/* ---------- 搜索（2026-10-18）：演示态在内存列表上过滤 ---------- */
const keyword = ref('')

const visibleTasks = computed(() => {
  const key = keyword.value.trim().toLowerCase()
  if (!key) return tasks.value
  return tasks.value.filter(
    (task) =>
      task.title.toLowerCase().includes(key) ||
      (task.description ?? '').toLowerCase().includes(key),
  )
})

/* ---------- 批量恢复（2026-10-18）---------- */

const selectMode = ref(false)
const selectedIds = ref<string[]>([])
const batchBusy = ref(false)

function enterSelect() {
  selectMode.value = true
  selectedIds.value = []
}

function exitSelect() {
  selectMode.value = false
  selectedIds.value = []
}

function toggleSelect(task: TrashTask) {
  selectedIds.value = selectedIds.value.includes(task.id)
    ? selectedIds.value.filter((id) => id !== task.id)
    : [...selectedIds.value, task.id]
}

/** 全选只作用于当前搜索结果 */
function toggleAll() {
  const ids = visibleTasks.value.map((task) => task.id)
  selectedIds.value = ids.every((id) => selectedIds.value.includes(id)) ? [] : ids
}

/** 演示态没有后端，逐条从内存恢复 */
function handleBatchRestore() {
  const targets = visibleTasks.value.filter((task) => selectedIds.value.includes(task.id))
  if (!targets.length) return
  batchBusy.value = true
  targets.forEach((task) => restore(task))
  batchBusy.value = false
  ElMessage.success(`已恢复 ${targets.length} 条${MEMORY_HINT}`)
  exitSelect()
}

/** 批量彻底删除（演示态）：逐条从内存清掉，先二次确认 */
async function handleBatchPurge() {
  const targets = visibleTasks.value.filter((task) => selectedIds.value.includes(task.id))
  if (!targets.length) return
  try {
    await ElMessageBox.confirm(
      `将彻底删除选中的 ${targets.length} 条任务及其配图，该操作不可逆，确认继续？`,
      '批量彻底删除',
      {
        confirmButtonText: '彻底删除',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger',
      },
    )
  } catch {
    return
  }

  batchBusy.value = true
  targets.forEach((task) => purge(task))
  batchBusy.value = false
  ElMessage.success(`已彻底删除 ${targets.length} 条${MEMORY_HINT}`)
  exitSelect()
}

function handleRestore(task: TrashTask) {
  restore(task)
  ElMessage.success(`已恢复${MEMORY_HINT}`)
}

async function handlePurge(task: TrashTask) {
  // 回收站的彻底删除不可恢复，必须二次确认（不受「删除二次确认」偏好影响）
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
      `该操作不可逆，确认清空全部 ${total.value} 条数据？任务及其配图会被一并删除、无法恢复。请输入「清空」以确认。`,
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
      v-model:keyword="keyword"
      :tasks="visibleTasks"
      :clearing="clearing"
      :clear-disabled="total === 0"
      :select-mode="selectMode"
      :selected-ids="selectedIds"
      :batch-busy="batchBusy"
      @restore="handleRestore"
      @purge="handlePurge"
      @clear="handleClear"
      @enter-select="enterSelect"
      @exit-select="exitSelect"
      @toggle-select="toggleSelect"
      @toggle-all="toggleAll"
      @batch-restore="handleBatchRestore"
      @batch-purge="handleBatchPurge"
    />

    <BackToTop />
  </div>
</template>
