<script setup lang="ts">
/**
 * 演示模式（UC-11 / 8.6）：免登录、不请求后端，数据为前端内置示范数据。
 * 页面结构与本尊一致（同一套组件）；新建 / 编辑 / 删除 / 切状态都真的生效，
 * 但只存在内存里——刷新页面即还原。
 */
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import FilterBar from '@/components/FilterBar.vue'
import StatBar from '@/components/StatBar.vue'
import TaskFormDialog from '@/components/TaskFormDialog.vue'
import TaskList from '@/components/TaskList.vue'
import { useDemoTasks } from '@/composables/useDemoTasks'
import type { Task, TaskPayload } from '@/types'

const { query, tasks, stats, loading, applyQuery, loadMore, changeStatus, create, update, remove } =
  useDemoTasks()

const dialogVisible = ref(false)
const editingTask = ref<Task | null>(null)

/** 演示模式的写操作提示：改动真的生效，只是不落库 */
const MEMORY_HINT = '（演示模式：仅内存，刷新还原）'

function openCreate() {
  editingTask.value = null
  dialogVisible.value = true
}

function openEdit(task: Task) {
  editingTask.value = task
  dialogVisible.value = true
}

function handleSubmit(payload: TaskPayload) {
  if (editingTask.value) {
    update(editingTask.value.id, payload)
    ElMessage.success(`已保存${MEMORY_HINT}`)
  } else {
    create(payload)
    ElMessage.success(`已新建${MEMORY_HINT}`)
  }
  dialogVisible.value = false
}

/** 删除与真实页同一套动作：先确认，再移入回收站（演示模式下回收站也是内存态） */
async function handleRemove(task: Task) {
  const retention = stats.value?.trashRetentionDays
  const message = retention
    ? `将移入回收站，${retention} 天内可恢复。`
    : '将移入回收站，可在回收站里恢复。'
  try {
    await ElMessageBox.confirm(message, '删除任务', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  remove(task.id)
  ElMessage.success(`已移入回收站${MEMORY_HINT}`)
}

/** 切换状态：先划掉、再落位（与真实页同一套节奏） */
function handleToggleStatus(task: Task) {
  void changeStatus(task.id, task.status === 'DONE' ? 'TODO' : 'DONE')
}

/** 空状态只在筛掉全部结果时出现，所以这里的操作是清空筛选 */
function resetFilters() {
  query.keyword = ''
  query.status = undefined
  query.priority = undefined
  applyQuery()
}
</script>

<template>
  <div class="page">
    <header class="demo-header">
      <div>
        <h1 class="page-title">演示模式</h1>
        <p class="demo-header__hint">
          这是内置的 {{ tasks.length }} / {{ stats?.total ?? 0 }} 条示范数据，免登录体验完整界面；
          新建、编辑、删除、切换状态都会真的生效（含回收站），但只存在内存里，刷新即还原。
        </p>
      </div>
      <el-button type="primary" @click="openCreate">
        <AppIcon name="plus" />
        <span class="btn-text">新建任务</span>
      </el-button>
    </header>

    <StatBar :stats="stats" />
    <FilterBar :query="query" @change="applyQuery" />

    <TaskList
      :tasks="tasks"
      :loading="loading"
      empty-title="没有匹配的任务"
      empty-description="换个关键词，或放宽筛选条件。"
      empty-action-text="清空筛选"
      @load-more="loadMore"
      @edit="openEdit"
      @remove="handleRemove"
      @toggle-status="handleToggleStatus"
      @empty-action="resetFilters"
    />

    <TaskFormDialog v-model:visible="dialogVisible" :task="editingTask" @submit="handleSubmit" />
  </div>
</template>

<style scoped>
.demo-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.demo-header__hint {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--color-text-2);
}
</style>
