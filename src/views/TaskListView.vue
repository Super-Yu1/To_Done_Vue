<script setup lang="ts">
/**
 * 任务列表（UC-05 / 8.5）：瀑布流 + 筛选 + 统计；数据走 todo store，后端接口就绪即可用。
 * 2026-10-15 起多了三件事：行内快捷改（E）、批量选择（F）、底部快速录入（H）——
 * 数据动作全在 store（patchTask / batch*），页面只负责状态与提示。
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { confirmDestructive } from '@/composables/usePreferences'
import AppIcon from '@/components/AppIcon.vue'
import BackToTop from '@/components/BackToTop.vue'
import BatchActionBar from '@/components/BatchActionBar.vue'
import FilterBar from '@/components/FilterBar.vue'
import QuickAddTask from '@/components/QuickAddTask.vue'
import StatBar from '@/components/StatBar.vue'
import TaskFormDialog from '@/components/TaskFormDialog.vue'
import TaskList from '@/components/TaskList.vue'
import { PAGE_SIZE } from '@/constants'
import { useTodoStore } from '@/stores/todo'
import type { Task, TaskPayload, TaskPriority, TaskQuickFilter } from '@/types'

const todo = useTodoStore()

/** 任务弹窗（新建 / 详情 / 编辑都在这一个弹窗里，用 mode 区分） */
const dialogVisible = ref(false)
/** true = 只读详情（点任务行进来）；点右上角「编辑」切成可编辑 */
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

/**
 * 统计栏快捷筛选（2026-10-18）：三选一，全部走服务端参数 ——
 * 高优先级 `priority=HIGH`、逾期 `overdue=true`、今日到期 `dueToday=true`。
 * 不再用本地过滤，也不用把 page size 临时放大到 100。
 */
const activeFilter = ref<TaskQuickFilter | null>(null)

/** 服务端筛选后列表就是 store 里那一页；保留别名让模板与批量逻辑少改一处 */
const visibleTasks = computed(() => todo.tasks)

const hasFilters = computed(() =>
  Boolean(
    todo.query.keyword ||
      todo.query.status ||
      todo.query.priority ||
      todo.query.overdue ||
      todo.query.dueToday ||
      activeFilter.value,
  ),
)

/** 快捷筛选下空列表的文案：明确是筛掉了，而不是一条任务都没有 */
const emptyTitle = computed(() => (activeFilter.value ? '没有符合条件的任务' : '还没有任务'))
const emptyDescription = computed(() =>
  activeFilter.value
    ? '换个快捷筛选，或清空筛选后再看。'
    : '记录第一件事，之后按优先级与截止时间跟踪它。',
)

const selectedTasks = computed(() =>
  visibleTasks.value.filter((task) => selectedIds.value.includes(task.id)),
)
const allSelected = computed(
  () => visibleTasks.value.length > 0 && selectedIds.value.length >= visibleTasks.value.length,
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

/**
 * 统计栏胶囊：点同一枚 = 取消；任意一枚都会把列表切回「未完成」，
 * 保证列表口径与统计数字（未完成的逾期 / 今日到期 / 高优）一致。
 */
function handleFilter(next: TaskQuickFilter | null) {
  // 快捷筛选与批量选择互斥：避免选中被筛掉的行
  exitSelect()
  activeFilter.value = next

  /*
   * 2026-10-21 修 Bug：三枚胶囊都只算「未完成」，而未完成 = TODO + IN_PROGRESS。
   * 原来这里塞的是 `status = 'TODO'`，把 IN_PROGRESS 的任务排除了 ——
   * 统计写「今日到期 1 / 逾期 12」，点开却少一条（少的正是 IN_PROGRESS 那条）。
   * 现在改用后端本就有的 `onlyUnfinished`，并清掉页签的 status，避免两者叠加再筛一次。
   */
  todo.query.status = undefined
  todo.query.onlyUnfinished = next ? true : undefined
  todo.query.priority = next === 'high' ? 'HIGH' : undefined
  todo.query.overdue = next === 'overdue' ? true : undefined
  todo.query.dueToday = next === 'dueToday' ? true : undefined
  todo.query.size = PAGE_SIZE

  void guard(() => todo.fetchTasks())
}

/** 搜索 / 页签 / 排序变化：快捷筛选是一次性的，跟着收起 */
function handleQueryChange() {
  if (activeFilter.value) {
    activeFilter.value = null
    todo.query.priority = undefined
    todo.query.overdue = undefined
    todo.query.dueToday = undefined
    todo.query.size = PAGE_SIZE
  }
  void guard(() => todo.fetchTasks())
}

function openCreate() {
  editingTask.value = null
  dialogVisible.value = true
}

/** 点任务行：**直接进编辑**（2026-10-27 起不再有只读详情） */
function openEdit(task: Task) {
  editingTask.value = task
  dialogVisible.value = true
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
    // 2026-10-27：保存后直接关闭（不再停在只读详情）
    dialogVisible.value = false
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
  // 2026-10-27：改走「删除二次确认」偏好（个人中心·偏好里可关），与回收站的彻底删除同一套
  const ok = await confirmDestructive(message, '删除任务', '移入回收站')
  if (!ok) return
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
  todo.query.overdue = undefined
  todo.query.dueToday = undefined
  todo.query.size = PAGE_SIZE
  activeFilter.value = null
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
  selectedIds.value = allSelected.value ? [] : visibleTasks.value.map((task) => task.id)
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
  // 批量删除同样受「删除二次确认」开关控制（关掉后直接移入回收站）
  const ok = await confirmDestructive(message, '批量删除', '移入回收站')
  if (!ok) return

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
    <StatBar
      :stats="todo.stats"
      :high-priority="todo.highPriorityCount"
      :active-filter="activeFilter"
      @filter="handleFilter"
    />

    <FilterBar
      :query="todo.query"
      :select-mode="selectMode"
      @change="handleQueryChange"
      @toggle-select="toggleSelectMode"
    >
      <!-- 第一行右侧只留主操作：新建任务 -->
      <template #actions>
        <el-button type="primary" @click="openCreate">
          <AppIcon name="plus" />
          <span class="btn-text">新建任务</span>
        </el-button>
      </template>

      <!-- 批量操作条并到第二行右侧（选择模式才出现）；进入时从右往左滑入、退出时原路滑回 -->
      <template #tabs-actions>
        <Transition name="batch-slide">
          <BatchActionBar
            v-if="selectMode"
          :selected-count="selectedIds.length"
          :total-count="visibleTasks.length"
          :all-selected="allSelected"
          :busy="batchBusy"
          :status="todo.query.status"
          :only-unfinished="Boolean(todo.query.onlyUnfinished)"
          @complete="handleBatchStatus('DONE')"
          @uncomplete="handleBatchStatus('TODO')"
          @remove="handleBatchRemove"
          @change-priority="handleBatchPriority"
          @toggle-all="toggleAll"
          />
        </Transition>
      </template>
    </FilterBar>

    <TaskList
      :tasks="visibleTasks"
      :loading="todo.loading && visibleTasks.length === 0"
      :select-mode="selectMode"
      :leaving-on-toggle="
        Boolean(activeFilter) ||
        Boolean(todo.query.onlyUnfinished) ||
        Boolean(todo.query.status && todo.query.status !== 'DONE')
      "
      :selected-ids="selectedIds"
      :empty-title="emptyTitle"
      :empty-description="emptyDescription"
      :empty-action-text="activeFilter ? '清空筛选' : '新建任务'"
      @load-more="guard(() => todo.loadMore())"
      @open="openEdit"
      @remove="handleRemove"
      @toggle-status="handleToggleStatus"
      @toggle-select="toggleSelect"
      @empty-action="handleEmptyAction"
    >
      <!-- 快捷筛选激活时收起快速录入：新任务不满足筛选条件，录了也看不见 -->
      <template #footer>
        <QuickAddTask v-if="!activeFilter" :submitting="quickAdding" @create="handleQuickAdd" />
      </template>
    </TaskList>

    <TaskFormDialog
      v-model:visible="dialogVisible"
      :task="editingTask"
      :submitting="submitting"
      :progress="uploadProgress"
      @submit="handleSubmit"
    />

    <BackToTop />
  </div>
</template>

<style scoped>
/*
 * 页面内的纵向节奏（2026-10-27 三改）：18px。
 * 页头仍不设「任务」大标题 —— 概览卡里的那句「还有 N 件事没划掉」就是这一页的标题；
 * 概览 → 工具栏 → 列表读成一叠，间距统一，节奏才像一块，而不是三张互不相干的卡。
 */
.page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
</style>
