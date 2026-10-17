<script setup lang="ts">
/**
 * 任务列表（UC-05 / 8.5）：瀑布流 + 筛选 + 统计；数据走 todo store，后端接口就绪即可用。
 * 2026-10-15 起多了三件事：行内快捷改（E）、批量选择（F）、底部快速录入（H）——
 * 数据动作全在 store（patchTask / batch*），页面只负责状态与提示。
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import BackToTop from '@/components/BackToTop.vue'
import BatchActionBar from '@/components/BatchActionBar.vue'
import FilterBar from '@/components/FilterBar.vue'
import QuickAddTask from '@/components/QuickAddTask.vue'
import StatBar from '@/components/StatBar.vue'
import TaskFormDialog from '@/components/TaskFormDialog.vue'
import TaskList from '@/components/TaskList.vue'
import { useTodoStore } from '@/stores/todo'
import type { Task, TaskPayload, TaskPriority } from '@/types'

const todo = useTodoStore()

/** 任务弹窗（新建 / 详情 / 编辑都在这一个弹窗里，用 mode 区分） */
const dialogVisible = ref(false)
/** true = 只读详情（点任务行进来）；点右上角「编辑」切成可编辑 */
const readonly = ref(false)
const editingTask = ref<Task | null>(null)
const submitting = ref(false)
/** 配图上传进度（0~100）：有图在传时弹窗里显示进度条 */
const uploadProgress = ref(0)

/** 批量选择（F）：只作用于当前已加载的行 —— 分页 + 无限滚动，不做跨页全选 */
const selectMode = ref(false)
const selectedIds = ref<string[]>([])
const batchBusy = ref(false)

/** 快速录入（H）：提交中禁用输入，防重复创建 */
const quickAdding = ref(false)

function onUploadProgress(percent: number) {
  uploadProgress.value = percent
}

const hasFilters = computed(() =>
  Boolean(todo.query.keyword || todo.query.status || todo.query.priority),
)

const selectedTasks = computed(() => todo.tasks.filter((task) => selectedIds.value.includes(task.id)))
const allSelected = computed(
  () => todo.tasks.length > 0 && selectedIds.value.length >= todo.tasks.length,
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
  readonly.value = false
  dialogVisible.value = true
}

/** 行尾铅笔：跳过只读详情，直接进可编辑（2026-10-17） */
function openEdit(task: Task) {
  editingTask.value = task
  readonly.value = false
  dialogVisible.value = true
}

/** 点任务行：打开弹窗的只读模式（先看详情，不直接进编辑） */
function openDetail(task: Task) {
  editingTask.value = task
  readonly.value = true
  dialogVisible.value = true
}

/** 详情右上角「编辑」：同一个弹窗就地切成可编辑（不关不重开） */
function startEdit() {
  readonly.value = false
}

async function handleSubmit(payload: TaskPayload, images: File[]) {
  const editing = editingTask.value
  submitting.value = true
  uploadProgress.value = 0
  try {
    if (editing) {
      await todo.updateTask(editing.id, payload, images, onUploadProgress)
    } else {
      await todo.createTask(payload, images, onUploadProgress)
    }
    ElMessage.success(editing ? '已保存' : '已创建')
    if (editing) {
      // 保存后停在详情：用 store 重取后的对象刷新，再切回只读模式
      editingTask.value = todo.tasks.find((item) => item.id === editing.id) ?? editing
      readonly.value = true
    } else {
      dialogVisible.value = false
    }
  } catch {
    // 失败时保持弹窗打开（可编辑态），便于修改后重试
  } finally {
    submitting.value = false
    uploadProgress.value = 0
  }
}

function handleToggleStatus(task: Task) {
  const next = task.status === 'DONE' ? 'TODO' : 'DONE'
  void guard(() => todo.changeStatus(task.id, next))
}

/** 行内快捷改优先级 / 截止时间（E）：store 里是乐观更新 + 失败回滚，不整表刷新 */
function handleQuickPriority(task: Task, priority: TaskPriority) {
  void guard(() => todo.patchTask(task.id, { priority }))
}

function handleQuickDue(task: Task, dueDate: string | null) {
  void guard(() => todo.patchTask(task.id, { dueDate }))
}

/** 快速录入（H）：新任务按创建时间倒序落到未完成组最上面，所以提示里点明「已置顶」 */
async function handleQuickAdd(title: string) {
  quickAdding.value = true
  try {
    await todo.createTask({ title, status: 'TODO', priority: 'MEDIUM' })
    ElMessage.success(`已添加「${title}」· 已置顶`)
  } catch {
    // 提示已由 http 层给出
  } finally {
    quickAdding.value = false
  }
}

async function handleRemove(task: Task) {
  // 文案里的天数取自 stats 下发的 trashRetentionDays，不写死 90（8.8）
  const retention = todo.stats?.trashRetentionDays
  const message = retention
    ? `将移入回收站，${retention} 天内可恢复。`
    : `将移入回收站，可在回收站里恢复。`
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

/* ---------- 批量选择（F） ---------- */

function enterSelect() {
  selectMode.value = true
  selectedIds.value = []
}

function exitSelect() {
  selectMode.value = false
  selectedIds.value = []
}

/** 工具栏上的「批量选择 / 退出选择」是同一枚按钮，按当前模式决定方向 */
function toggleSelectMode() {
  if (selectMode.value) exitSelect()
  else enterSelect()
}

function toggleSelect(task: Task) {
  selectedIds.value = selectedIds.value.includes(task.id)
    ? selectedIds.value.filter((id) => id !== task.id)
    : [...selectedIds.value, task.id]
}

function toggleAll() {
  selectedIds.value = allSelected.value ? [] : todo.tasks.map((task) => task.id)
}

/** 批量动作的统一收尾：报「成功 / 失败」，然后退出选择模式（列表已经在 store 里重取过） */
function reportBatch(total: number, failed: number) {
  if (failed) {
    ElMessage.warning(`已处理 ${total - failed} 条，${failed} 条失败，可重试`)
  } else {
    ElMessage.success(`已处理 ${total} 条`)
  }
  exitSelect()
}

async function handleBatchStatus(status: 'TODO' | 'DONE') {
  const targets = selectedTasks.value
  if (!targets.length) return
  batchBusy.value = true
  try {
    reportBatch(targets.length, await todo.batchChangeStatus(targets, status))
  } catch {
    // 提示已由 http 层给出
  } finally {
    batchBusy.value = false
  }
}

async function handleBatchPriority(priority: TaskPriority) {
  const targets = selectedTasks.value
  if (!targets.length) return
  batchBusy.value = true
  try {
    reportBatch(targets.length, await todo.batchChangePriority(targets, priority))
  } catch {
    // 提示已由 http 层给出
  } finally {
    batchBusy.value = false
  }
}

async function handleBatchRemove() {
  const targets = selectedTasks.value
  if (!targets.length) return
  const retention = todo.stats?.trashRetentionDays
  const message = retention
    ? `将 ${targets.length} 条任务移入回收站，${retention} 天内可恢复。`
    : `将 ${targets.length} 条任务移入回收站，可在回收站里恢复。`
  try {
    await ElMessageBox.confirm(message, '批量删除', {
      confirmButtonText: '移入回收站',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }

  batchBusy.value = true
  try {
    reportBatch(targets.length, await todo.batchRemoveTasks(targets))
  } catch {
    // 提示已由 http 层给出
  } finally {
    batchBusy.value = false
  }
}

/** Esc 退出选择模式（与「退出选择」按钮同一出口） */
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') exitSelect()
}

watch(selectMode, (on) => {
  if (on) {
    window.addEventListener('keydown', onKeydown)
  } else {
    window.removeEventListener('keydown', onKeydown)
    selectedIds.value = []
  }
})

onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="page">
    <StatBar :stats="todo.stats" />

    <FilterBar
      :query="todo.query"
      :select-mode="selectMode"
      @change="guard(() => todo.fetchTasks())"
      @toggle-select="toggleSelectMode"
    >
      <!-- 第一行右侧只留主操作：新建任务 -->
      <template #actions>
        <el-button type="primary" @click="openCreate">
          <AppIcon name="plus" />
          <span class="btn-text">新建任务</span>
        </el-button>
      </template>

      <!-- 批量操作条并到第二行右侧（选择模式才出现） -->
      <template #tabs-actions>
        <BatchActionBar
          v-if="selectMode"
          :selected-count="selectedIds.length"
          :total-count="todo.tasks.length"
          :all-selected="allSelected"
          :busy="batchBusy"
          @complete="handleBatchStatus('DONE')"
          @uncomplete="handleBatchStatus('TODO')"
          @remove="handleBatchRemove"
          @change-priority="handleBatchPriority"
          @toggle-all="toggleAll"
        />
      </template>
    </FilterBar>

    <TaskList
      :tasks="todo.tasks"
      :loading="todo.loading && todo.tasks.length === 0"
      :select-mode="selectMode"
      :leaving-on-toggle="todo.query.status === 'TODO'"
      :selected-ids="selectedIds"
      empty-title="还没有任务"
      empty-description="记录第一件事，之后按优先级与截止时间跟踪它。"
      empty-action-text="新建任务"
      @load-more="guard(() => todo.loadMore())"
      @open="openDetail"
      @edit="openEdit"
      @remove="handleRemove"
      @toggle-status="handleToggleStatus"
      @change-priority="handleQuickPriority"
      @change-due-date="handleQuickDue"
      @toggle-select="toggleSelect"
      @empty-action="handleEmptyAction"
    >
      <template #footer>
        <QuickAddTask :submitting="quickAdding" @create="handleQuickAdd" />
      </template>
    </TaskList>

    <TaskFormDialog
      v-model:visible="dialogVisible"
      :task="editingTask"
      :readonly="readonly"
      :submitting="submitting"
      :progress="uploadProgress"
      @edit="startEdit"
      @submit="handleSubmit"
    />

    <BackToTop />
  </div>
</template>

<style scoped>
/*
 * 页面内的纵向节奏（2026-10-18）：20px。
 * 页头「任务」大标题已移除 —— 顶部第一屏就是四张统计卡（侧边栏已标明当前页），
 * 统计卡 → 工具栏 → 列表之间留出统一的呼吸位。
 */
.page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
</style>
