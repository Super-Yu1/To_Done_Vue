<script setup lang="ts">
/**
 * 演示模式（UC-11 / 8.6）：免登录、不请求后端，数据为前端内置示范数据。
 * 页面结构与本尊一致（同一套组件）；新建 / 编辑 / 删除 / 切状态都真的生效，
 * 但只存在内存里——刷新页面即还原。
 * 2026-10-15 起与真实页一样有：行内快捷改（E）、批量选择（F）、底部快速录入（H）。
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import BackToTop from '@/components/BackToTop.vue'
import BatchActionBar from '@/components/BatchActionBar.vue'
import ConfettiLayer from '@/components/ConfettiLayer.vue'
import FilterBar from '@/components/FilterBar.vue'
import QuickAddTask from '@/components/QuickAddTask.vue'
import StatBar from '@/components/StatBar.vue'
import TaskFormDialog from '@/components/TaskFormDialog.vue'
import TaskList from '@/components/TaskList.vue'
import { useDemoTasks } from '@/composables/useDemoTasks'
import type { Task, TaskPayload, TaskPriority } from '@/types'

const {
  query,
  tasks,
  stats,
  loading,
  applyQuery,
  loadMore,
  changeStatus,
  create,
  update,
  remove,
  patchTask,
  batchSetStatus,
  batchSetPriority,
  batchRemove,
} = useDemoTasks()

/** 任务弹窗（新建 / 详情 / 编辑都在这一个弹窗里） —— 与真实页同一套交互 */
const dialogVisible = ref(false)
/** true = 只读详情（点任务行进来）；点右上角「编辑」切成可编辑 */
const readonly = ref(false)
const editingTask = ref<Task | null>(null)

/**
 * 演示态的排序（2026-10-18）：没有后端，就按同一套 sortBy / sortDirection 在内存里排。
 * 未选排序时原样返回，保持组件自己的默认顺序；优先级按业务权重（低 < 中 < 高）而不是字典序。
 */
const sortedTasks = computed(() => {
  const { sortBy, sortDirection } = query
  if (!sortBy) return tasks.value
  const dir = sortDirection === 'asc' ? 1 : -1
  const WEIGHT = { LOW: 1, MEDIUM: 2, HIGH: 3 } as const

  /**
   * 截止时间比较：**没有截止时间的永远排最后**（正序倒序都一样）。
   * direction 单独传：优先级排序的次键要固定升序，不能跟着表方向翻转（见下）。
   */
  function byDue(left: Task, right: Task, direction = dir): number {
    const lv = left.dueDate ? Date.parse(left.dueDate) : null
    const rv = right.dueDate ? Date.parse(right.dueDate) : null
    if (lv === null && rv === null) return 0
    if (lv === null) return 1
    if (rv === null) return -1
    return (lv - rv) * direction
  }

  return [...tasks.value].sort((a, b) => {
    if (sortBy === 'priority') {
      /*
       * 同优先级内固定按截止时间近 → 远（方向恒为 1）：
       * 后端修复后的规则是 `ORDER BY priority {dir}, due_date ASC`，次键不跟随表方向；
       * 之前这里用 byDue(a, b) 会把组内也翻成远 → 近，与真实页不一致（2026-10-18 对齐）。
       */
      const diff = (WEIGHT[a.priority] - WEIGHT[b.priority]) * dir
      return diff !== 0 ? diff : byDue(a, b, 1)
    }
    if (sortBy === 'dueDate') return byDue(a, b)
    if (sortBy === 'completedAt') {
      const av = a.completedAt ? Date.parse(a.completedAt) : Number.MAX_SAFE_INTEGER
      const bv = b.completedAt ? Date.parse(b.completedAt) : Number.MAX_SAFE_INTEGER
      return (av - bv) * dir
    }
    return (Date.parse(a.recordedAt) - Date.parse(b.recordedAt)) * dir
  })
})

/** 批量选择（F）：与真实页同一套交互，只是数据落在内存态 */
const selectMode = ref(false)
const selectedIds = ref<string[]>([])
const batchBusy = ref(false)

const selectedTasks = computed(() => tasks.value.filter((task) => selectedIds.value.includes(task.id)))
const allSelected = computed(
  () => tasks.value.length > 0 && selectedIds.value.length >= tasks.value.length,
)

/** 演示模式的写操作提示：改动真的生效，只是不落库 */
const MEMORY_HINT = '（演示模式：仅内存，刷新还原）'

/* ---------- 气泡引导（首次进演示模式时指一下勾选圈） ---------- */

const GUIDE_KEY = 'todone_demo_guide_seen'
/** 只在没看过的时候出现；点勾选圈或点它的 × 都记成看过 */
const guideVisible = ref(false)

onMounted(() => {
  guideVisible.value = window.localStorage.getItem(GUIDE_KEY) !== '1'
})

function dismissGuide() {
  if (!guideVisible.value) return
  guideVisible.value = false
  window.localStorage.setItem(GUIDE_KEY, '1')
}

/* ---------- 「全部划掉」彩蛋 ---------- */

const confetti = ref<InstanceType<typeof ConfettiLayer> | null>(null)

/** 全划掉：统计来自全部演示数据（不是筛选后的可见列表） */
const allDone = computed(() => {
  const total = stats.value?.total ?? 0
  return total > 0 && stats.value?.done === total
})

watch(allDone, (done, was) => {
  if (!done || was) return
  confetti.value?.fire(8)
  dismissGuide()
  ElMessage.success('全部划掉了，今天可以收工')
})

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

function handleSubmit(payload: TaskPayload) {
  const editing = editingTask.value
  if (editing) {
    update(editing.id, payload)
    ElMessage.success(`已保存${MEMORY_HINT}`)
    // 保存后停在详情：演示态 update 是同步的，直接取重排后的对象再切回只读
    editingTask.value = tasks.value.find((item) => item.id === editing.id) ?? editing
    readonly.value = true
  } else {
    create(payload)
    ElMessage.success(`已新建${MEMORY_HINT}`)
    dialogVisible.value = false
  }
}

/** 行内快捷改（E）：与真实页同一套动作 */
function handleQuickPriority(task: Task, priority: TaskPriority) {
  patchTask(task.id, { priority })
}

function handleQuickDue(task: Task, dueDate: string | null) {
  patchTask(task.id, { dueDate })
}

/** 快速录入（H）：新任务按创建时间倒序落到未完成组最上面 */
function handleQuickAdd(title: string) {
  create({ title, status: 'TODO', priority: 'MEDIUM' })
  ElMessage.success(`已添加「${title}」· 已置顶${MEMORY_HINT}`)
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

/** 切换状态：先划掉、再落位（与真实页同一套节奏）；第一次动手就把气泡引导收掉 */
function handleToggleStatus(task: Task) {
  dismissGuide()
  void changeStatus(task.id, task.status === 'DONE' ? 'TODO' : 'DONE')
}

/** 空状态只在筛掉全部结果时出现，所以这里的操作是清空筛选 */
function resetFilters() {
  query.keyword = ''
  query.status = undefined
  query.priority = undefined
  applyQuery()
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
  selectedIds.value = allSelected.value ? [] : tasks.value.map((task) => task.id)
}

function reportBatch(count: number) {
  ElMessage.success(`已处理 ${count} 条${MEMORY_HINT}`)
  exitSelect()
}

function handleBatchStatus(status: 'TODO' | 'DONE') {
  const ids = selectedIds.value
  if (!ids.length) return
  batchSetStatus(ids, status)
  reportBatch(ids.length)
}

function handleBatchPriority(priority: TaskPriority) {
  const ids = selectedIds.value
  if (!ids.length) return
  batchSetPriority(ids, priority)
  reportBatch(ids.length)
}

async function handleBatchRemove() {
  const ids = selectedIds.value
  if (!ids.length) return
  try {
    await ElMessageBox.confirm(`将 ${ids.length} 条任务移入回收站，可在回收站里恢复。`, '批量删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  batchRemove(ids)
  reportBatch(ids.length)
}

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
    <header class="demo-header">
      <div>
        <h1 class="page-title">演示模式</h1>
        <!-- 「刷新会还原」现在由布局层的通栏提示承担，这里只说数据规模，不重复 -->
        <p class="demo-header__hint">内置 {{ stats?.total ?? 0 }} 条示范数据，免登录体验完整界面。</p>
      </div>
      </header>

    <StatBar :stats="stats" />
    <FilterBar
      :query="query"
      :select-mode="selectMode"
      @change="applyQuery"
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
          :total-count="tasks.length"
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

    <!-- 列表外面这层只管两件事：给气泡引导当定位参照、给彩蛋粒子当活动范围 -->
    <div class="demo-list">
      <!-- 气泡引导：首次进演示模式时指向第一行的勾选圈，点 × 或动手勾选即记成看过 -->
      <p v-if="guideVisible" class="guide" role="note">
        <span>点这个方框，任务就完成了</span>
        <button class="guide__close" type="button" aria-label="知道了" @click="dismissGuide">✕</button>
      </p>

      <TaskList
        :tasks="sortedTasks"
        :loading="loading"
        :select-mode="selectMode"
        :leaving-on-toggle="query.status === 'TODO'"
        :selected-ids="selectedIds"
        empty-title="没有匹配的任务"
        empty-description="换个关键词，或放宽筛选条件。"
        empty-action-text="清空筛选"
        @load-more="loadMore"
        @open="openDetail"
        @edit="openEdit"
        @remove="handleRemove"
        @toggle-status="handleToggleStatus"
        @change-priority="handleQuickPriority"
        @change-due-date="handleQuickDue"
        @toggle-select="toggleSelect"
        @empty-action="resetFilters"
      >
        <template #footer>
          <QuickAddTask @create="handleQuickAdd" />
        </template>
      </TaskList>
    </div>

    <TaskFormDialog
      v-model:visible="dialogVisible"
      :task="editingTask"
      :readonly="readonly"
      @edit="startEdit"
      @submit="handleSubmit"
    />

    <!-- 全部划掉的彩蛋：粒子只在这个内容区里飞 -->
    <ConfettiLayer ref="confetti" />

    <BackToTop />
  </div>
</template>

<style scoped>
/* 页面内的纵向节奏（2026-10-18）：与真实任务页一致，统一 20px */
.page {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.demo-list {
  position: relative;
}

/*
 * 气泡引导：深底浅字的小气泡，指向第一行的勾选圈（左侧那个小三角是它的「嘴」）。
 * 用正文色当底、页面底色当字色，深浅主题都成立，不用新增色值。
 */
.guide {
  position: absolute;
  top: 6px;
  left: 52px;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px 6px 10px;
  border-radius: var(--radius-md);
  background-color: var(--color-text);
  color: var(--color-bg);
  font-size: 12px;
  line-height: 1.5;
  box-shadow: var(--shadow-dialog);
  animation: guide-in var(--dur-base) var(--ease);
}

.guide::before {
  content: '';
  position: absolute;
  left: -4px;
  top: 15px;
  width: 8px;
  height: 8px;
  background-color: var(--color-text);
  transform: rotate(45deg);
}

.guide__close {
  flex: none;
  padding: 0 2px;
  border: none;
  background-color: transparent;
  color: inherit;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  opacity: 0.7;
}

.guide__close:hover {
  opacity: 1;
}

@keyframes guide-in {
  from {
    opacity: 0;
    transform: translateX(-4px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .guide {
    animation: none;
  }
}

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
