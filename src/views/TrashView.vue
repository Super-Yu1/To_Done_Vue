<script setup lang="ts">
/**
 * 回收站（UC-06 / 6.5 ⑩ / 8.8）：数据走 trash store，列表结构与演示页共用 TrashList。
 * 彻底删除不可恢复，清空回收站需输入「清空」二字方可执行。
 */
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import BackToTop from '@/components/BackToTop.vue'
import TrashList from '@/components/TrashList.vue'
import { SEARCH_DEBOUNCE_MS } from '@/constants'
  import { useTrashStore } from '@/stores/trash'
import type { TrashTask } from '@/types'

const trash = useTrashStore()
const clearing = ref(false)

/* ---------- 搜索（2026-10-18 改为服务端）----------
 * 后端 `GET /api/trash/tasks` 已支持 keyword（标题 / 描述模糊匹配、忽略大小写），
 * 这里防抖 300ms 后从第 1 页重取；关键词为空时 store 不会发送该参数。
 */
let keywordTimer: number | undefined

watch(
  () => trash.query.keyword,
  () => {
    window.clearTimeout(keywordTimer)
    keywordTimer = window.setTimeout(
      () => guard(() => trash.fetchTrash()),
      SEARCH_DEBOUNCE_MS,
    )
  },
)

onUnmounted(() => window.clearTimeout(keywordTimer))

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
  const ids = trash.tasks.map((task) => task.id)
  selectedIds.value = ids.every((id) => selectedIds.value.includes(id)) ? [] : ids
}

/** 后端没有批量恢复接口，逐条恢复；单条失败不打断，最后汇总 */
async function handleBatchRestore() {
  const ids = [...selectedIds.value]
  if (!ids.length) return
  batchBusy.value = true
  let ok = 0
  for (const id of ids) {
    try {
      await trash.restore(id)
      ok += 1
    } catch {
      // 单条失败已由 http 层提示，继续恢复其余
    }
  }
  batchBusy.value = false
  ElMessage.success(`已恢复 ${ok} 条`)
  exitSelect()
}

/** 批量彻底删除（2026-10-18）：逐条 purge，跑完汇总 */
async function handleBatchPurge() {
  const ids = [...selectedIds.value]
  if (!ids.length) return
  try {
    await ElMessageBox.confirm(
      `将彻底删除选中的 ${ids.length} 条任务及其配图，该操作不可逆，确认继续？`,
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
  let ok = 0
  for (const id of ids) {
    try {
      await trash.purge(id)
      ok += 1
    } catch {
      // 单条失败已由 http 层提示，继续处理其余
    }
  }
  batchBusy.value = false
  ElMessage.success(`已彻底删除 ${ok} 条`)
  exitSelect()
}

async function guard(action: () => Promise<unknown>) {
  try {
    await action()
  } catch {
    // 提示已由 http 层给出
  }
}

onMounted(() => guard(() => trash.fetchTrash()))

async function handleRestore(task: TrashTask) {
  await guard(() => trash.restore(task.id))
  ElMessage.success('已恢复')
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
  await guard(() => trash.purge(task.id))
  ElMessage.success('已彻底删除')
}

async function handleClear() {
  if (trash.total === 0) return
  try {
    await ElMessageBox.prompt(
      `该操作不可逆，确认清空全部 ${trash.total} 条数据？任务及其配图会被一并删除、无法恢复。请输入「清空」以确认。`,
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
      v-model:keyword="trash.query.keyword"
      :tasks="trash.tasks"
      :total="trash.total"
      :loading="trash.loading && trash.tasks.length === 0"
      :clearing="clearing"
      :clear-disabled="trash.total === 0"
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
      @load-more="guard(() => trash.loadMore())"
    />

    <BackToTop />
  </div>
</template>
