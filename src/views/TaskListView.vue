<script setup lang="ts">
/** 任务列表（UC-05 / 8.5）：瀑布流 + 筛选 + 统计；数据走 todo store，后端接口就绪即可用 */
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import FilterBar from '@/components/FilterBar.vue'
import StatBar from '@/components/StatBar.vue'
import TaskFormDialog from '@/components/TaskFormDialog.vue'
import TaskList from '@/components/TaskList.vue'
import { useTodoStore } from '@/stores/todo'
import type { Task, TaskPayload } from '@/types'

const todo = useTodoStore()

const dialogVisible = ref(false)
const editingTask = ref<Task | null>(null)
const submitting = ref(false)

const hasFilters = computed(() =>
  Boolean(todo.query.keyword || todo.query.status || todo.query.priority),
)

/** 接口失败的具体提示由 http 层统一给出，页面只保证不把 rejection 漏到控制台 */
async function guard(action: () => Promise<unknown>) {
  try {
    await action()
  } catch {
    // 提示已由 http 层给出
  }
}

onMounted(() => guard(() => todo.refresh()))

function openCreate() {
  editingTask.value = null
  dialogVisible.value = true
}

function openEdit(task: Task) {
  editingTask.value = task
  dialogVisible.value = true
}

async function handleSubmit(payload: TaskPayload) {
  const editing = editingTask.value
  submitting.value = true
  try {
    if (editing) {
      await todo.updateTask(editing.id, payload)
    } else {
      await todo.createTask(payload)
    }
    dialogVisible.value = false
    ElMessage.success(editing ? '已保存' : '已创建')
  } catch {
    // 失败时保持弹窗打开，便于修改后重试
  } finally {
    submitting.value = false
  }
}

function handleToggleStatus(task: Task) {
  const next = task.status === 'DONE' ? 'TODO' : 'DONE'
  void guard(() => todo.changeStatus(task.id, next))
}

async function handleRemove(task: Task) {
  // 文案里的天数取自 stats 下发的 trashRetentionDays，不写死 90（8.8）
  const retention = todo.stats?.trashRetentionDays
  const message = retention
    ? `将移入回收站，${retention} 天内可恢复。`
    : '将移入回收站，可在回收站里恢复。'
  try {
    await ElMessageBox.confirm(message, '删除任务', {
      confirmButtonText: '移入回收站',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  await guard(() => todo.removeTask(task.id))
}

function handleEmptyAction() {
  if (!hasFilters.value) {
    openCreate()
    return
  }
  todo.query.keyword = ''
  todo.query.status = undefined
  todo.query.priority = undefined
  void guard(() => todo.fetchTasks())
}
</script>

<template>
  <div class="page">
    <header class="task-header">
      <h1 class="page-title">任务</h1>
      <el-button type="primary" @click="openCreate">
        <AppIcon name="plus" />
        <span class="btn-text">新建任务</span>
      </el-button>
    </header>

    <StatBar :stats="todo.stats" />
    <FilterBar :query="todo.query" @change="guard(() => todo.fetchTasks())" />

    <TaskList
      :tasks="todo.tasks"
      :loading="todo.loading && todo.tasks.length === 0"
      empty-title="还没有任务"
      empty-description="记录第一件事，之后按优先级与截止时间跟踪它。"
      empty-action-text="新建任务"
      @load-more="guard(() => todo.loadMore())"
      @edit="openEdit"
      @remove="handleRemove"
      @toggle-status="handleToggleStatus"
      @empty-action="handleEmptyAction"
    />

    <TaskFormDialog
      v-model:visible="dialogVisible"
      :task="editingTask"
      :submitting="submitting"
      @submit="handleSubmit"
    />
  </div>
</template>

<style scoped>
.task-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
</style>
