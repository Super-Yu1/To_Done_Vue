<script setup lang="ts">
/**
 * 筛选与动作（2026-10-27 三改为一条工具栏）：
 * 搜索井 → 状态分段控件 → 排序 / 批量选择 → 页面主操作，全在同一条玻璃条上。
 * 原来「搜索 + 新建」和「页签 + 工具」分两行，是因为演示页中间要塞一条提示；
 * 提示已经上移到页首，这里就收成一行 —— 首屏的纵向空间留给任务本身。
 *
 * 排序仍是「字段 + 方向」两件独立的事，只是收进同一个下拉面板里：
 * 字段决定按什么排，方向决定正序 / 倒序；空字段 = 不传参、沿用后端固定规则。
 * query 由调用方持有（真实页来自 todo store、演示页来自本地内存态），按 8.3 直接改它的字段。
 */
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import { SEARCH_DEBOUNCE_MS } from '@/constants'
import type { TaskQuery } from '@/types'

const props = defineProps<{ query: TaskQuery; selectMode?: boolean }>()
/**
 * change = 「筛选条件变化，请从第 1 页重取」；
 * toggle-select = 「进入 / 退出批量选择」（由调用方按 selectMode 决定方向）。
 */
const emit = defineEmits<{ change: []; 'toggle-select': [] }>()

/**
 * 是否在选择模式（2026-10-31）：
 * 不再需要原来那套「退出时晚 320ms 再切回来」—— 批量条现在与常规行**同高叠放**、
 * 整行交叉淡化，两行之间不会再出现「滑出时与第一行交叠」，也就不必错开时间。
 *
 * 更重要的一点：批量条**不再作为第二行插进来**。它一插进来，工具栏就从 68px 长到 110px，
 * 下面的任务列表跟着整体下移 42px —— 那才是「整页跳一下」的真正来源。
 * （旧实现用 grid `1fr → 0fr` 过渡高度，那只是让「长高」平滑，长出来的高度仍然占位。）
 */
const selecting = computed(() => Boolean(props.selectMode))

/** 分段控件的 value 统一用字符串：`unfinished` / `DONE` / `all`，再映射回查询字段 */
const ALL = 'all'

/**
 * 页签顺序：**未完成 → 已完成 → 全部**。
 * 「全部」退到最后 —— 日常最常看的是「还没做完的」，默认也停在这里（见 store / useDemoTasks 的初始 status）。
 */
/**
 * 页签（2026-10-26 修）：「未完成」= **非 DONE**（TODO + IN_PROGRESS），走 `onlyUnfinished`。
 * 原来这一档发的是 `status=TODO`，把 IN_PROGRESS 的任务藏了起来 ——
 * 于是出现「统计写已完成 22 / 共 24，列表却只剩 1 条」，差的正是那 1 条 IN_PROGRESS。
 */
const TAB_UNFINISHED = 'unfinished'
const tabs = [
  { value: TAB_UNFINISHED, label: '未完成' },
  { value: 'DONE', label: '已完成' },
  { value: ALL, label: '全部' },
]

/**
 * 排序字段（2026-10-18 定稿）：优先级 / 创建时间 / 截止时间（默认）/ 完成时间。
 * 方向不放在字段里，由面板底部的「正序 / 倒序」切换。
 */
const SORT_OPTIONS = [
  { value: 'priority', label: '优先级' },
  { value: 'recordedAt', label: '创建时间' },
  { value: 'dueDate', label: '截止时间' },
  { value: 'completedAt', label: '完成时间' },
]

const sortOpen = ref(false)

/**
 * 三角的朝向（2026-10-31）：不直接绑 `sortOpen`。
 * el-popover 收起时，`visible` 要等它自己的一层时序才回写，三角会比面板慢半拍（实测约 200ms 才起步）；
 * 这里点下按钮就立即翻转，`sortOpen` 只做兜底同步（点面板外面关闭那种情况）。
 * 方向：展开 0° → 180°（顺时针），收起 180° → 0°（逆时针），原路返回。
 */
const caretOpen = ref(false)

watch(sortOpen, (open) => {
  caretOpen.value = open
})

function pickSort(value: string) {
  props.query.sortBy = value as TaskQuery['sortBy']
  // 换字段时保留用户当前选的方向；没设过就按默认升序
  props.query.sortDirection = props.query.sortDirection ?? 'asc'
  emit('change')
}

/** 正序 = asc。默认升序（截止时间近 → 远） */
const isAsc = computed(() => props.query.sortDirection !== 'desc')

function setDirection(direction: 'asc' | 'desc') {
  props.query.sortDirection = direction
  emit('change')
}

const activeTab = computed({
  get: () => {
    if (props.query.onlyUnfinished) return TAB_UNFINISHED
    return props.query.status === 'DONE' ? 'DONE' : ALL
  },
  set: (value: string) => {
    props.query.onlyUnfinished = value === TAB_UNFINISHED ? true : undefined
    props.query.status = value === 'DONE' ? 'DONE' : undefined
    emit('change')
  },
})

let debounceTimer: number | undefined

watch(
  () => props.query.keyword,
  () => {
    window.clearTimeout(debounceTimer)
    debounceTimer = window.setTimeout(() => emit('change'), SEARCH_DEBOUNCE_MS)
  },
)

/* ---------- 分段控件的白色滑块（2026-10-27） ---------- */

/**
 * 选中态的「白底 + 阴影」不再挂在按钮上，而是交给一块独立滑块：
 * 切页签时它在三个按钮之间**滑过去**（transform 过渡），比原地闪现更像一个控件。
 * 位置 / 宽高靠量当前按钮的 `offset*` 得出 —— 与侧栏导航的浮块是同一套做法。
 */
const tabsRef = ref<HTMLElement | null>(null)
/** 按钮元素按渲染顺序收集；普通数组即可，不参与响应式 */
const tabEls: HTMLElement[] = []
const indicator = reactive({ left: 0, top: 0, width: 0, height: 0, visible: false })
/** 首帧先摆好位置再打开过渡，避免从 (0,0) 滑进来 */
const indicatorReady = ref(false)

function setTabRef(el: unknown, index: number) {
  if (el instanceof HTMLElement) tabEls[index] = el
}

async function updateIndicator() {
  // 等 active 类落到 DOM 上再量（字重 400 → 600 会改变按钮宽度）
  await nextTick()
  const index = tabs.findIndex((tab) => tab.value === activeTab.value)
  const el = tabEls[index]
  if (!el) {
    indicator.visible = false
    return
  }
  indicator.left = el.offsetLeft
  indicator.top = el.offsetTop
  indicator.width = el.offsetWidth
  indicator.height = el.offsetHeight
  indicator.visible = true
  if (!indicatorReady.value) {
    requestAnimationFrame(() => {
      indicatorReady.value = true
    })
  }
}

const indicatorStyle = computed(() => ({
  transform: `translate(${indicator.left}px, ${indicator.top}px)`,
  width: `${indicator.width}px`,
  height: `${indicator.height}px`,
  opacity: indicator.visible ? 1 : 0,
}))

watch(activeTab, () => void updateIndicator())

let tabsObserver: ResizeObserver | undefined

onMounted(() => {
  // 容器尺寸变了（换行、字体加载、窗口缩放）也要重新量
  if (tabsRef.value) {
    tabsObserver = new ResizeObserver(() => void updateIndicator())
    tabsObserver.observe(tabsRef.value)
  }
  void updateIndicator()
})

onUnmounted(() => {
  window.clearTimeout(debounceTimer)
  tabsObserver?.disconnect()
})
</script>

<template>
  <div class="filter-bar">
    <!--
      两行同高叠放（2026-10-31）：常态一行、选择模式一行。
      隐藏的那行用绝对定位脱离文档流 —— 父级高度始终由「正在显示的那行」决定（46px + 上下 padding），
      切模式时高度一像素都不变，下面的任务列表原地不动。
      旧实现把批量条当第二行插进来，工具栏从 68 长到 110，列表跟着下移 42px；
      grid 的 `1fr → 0fr` 只让「长高」这件事平滑，长出来的高度仍然占位。
    -->
    <div class="filter-bar__stack">
      <!--
        `inert`：不在当前模式的那一行整棵子树都不可聚焦、不可点、对读屏隐藏。
        只靠 opacity: 0 的话，Tab 仍然会走进看不见的按钮里。
      -->
      <div
        class="filter-bar__row"
        :class="{ 'filter-bar__row--off': selecting }"
        :inert="selecting"
      >
        <!-- 搜索：贴在最左，占满剩余宽度；它是一口「凹进去的井」，不是又一层白玻璃 -->
        <el-input
          v-model="query.keyword"
          class="filter-bar__search"
          placeholder="搜索标题或描述"
          clearable
        >
          <template #prefix>
            <AppIcon name="search" />
          </template>
        </el-input>

        <!-- 状态分段控件 -->
        <div ref="tabsRef" class="filter-bar__tabs" role="tablist" aria-label="任务状态">
          <!-- 白色滑块：位置 / 宽高由 JS 量当前页签得出，切页签时滑过去 -->
          <span
            class="filter-bar__tab-indicator"
            :class="{ 'filter-bar__tab-indicator--ready': indicatorReady }"
            :style="indicatorStyle"
            aria-hidden="true"
          />

          <button
            v-for="(tab, index) in tabs"
            :key="tab.value"
            :ref="(el) => setTabRef(el, index)"
            class="filter-bar__tab"
            :class="{ 'filter-bar__tab--active': activeTab === tab.value }"
            type="button"
            role="tab"
            :aria-selected="activeTab === tab.value"
            @click="activeTab = tab.value"
          >
            {{ tab.label }}
          </button>
        </div>

        <div class="filter-bar__tools">
          <el-popover
            v-model:visible="sortOpen"
            trigger="click"
            placement="bottom"
            :width="176"
            popper-class="todone-sort-pop"
          >
            <template #reference>
              <button
                class="filter-bar__ghost"
                type="button"
                :aria-expanded="sortOpen"
                @click="caretOpen = !caretOpen"
              >
                排序
                <!--
                  小三角随展开方向转：字符本身是 ▾，展开转 180° 就成了 ▴（顺时针），
                  收起再原路转回来（逆时针）。用旋转而不是换字符 —— 换字符是瞬切，转不完这一程。
                -->
                <span
                  class="filter-bar__caret"
                  :class="{ 'filter-bar__caret--open': caretOpen }"
                  aria-hidden="true"
                >▾</span>
              </button>
            </template>

            <div class="sort-panel" role="menu" aria-label="排序方式">
              <p class="sort-panel__title">排序方式</p>
              <button
                v-for="option in SORT_OPTIONS"
                :key="option.value"
                class="sort-panel__item"
                :class="{ 'sort-panel__item--active': query.sortBy === option.value }"
                type="button"
                role="menuitemradio"
                :aria-checked="query.sortBy === option.value"
                @click="pickSort(option.value)"
              >
                {{ option.label }}
                <AppIcon v-if="query.sortBy === option.value" name="check" :size="14" />
              </button>

              <div class="sort-panel__divider" aria-hidden="true" />

              <div class="sort-panel__dir" role="group" aria-label="排序方向">
                <button
                  class="sort-panel__dir-btn"
                  :class="{ 'sort-panel__dir-btn--active': isAsc }"
                  type="button"
                  @click="setDirection('asc')"
                >
                  正序 <span aria-hidden="true">↑</span>
                </button>
                <button
                  class="sort-panel__dir-btn"
                  :class="{ 'sort-panel__dir-btn--active': !isAsc }"
                  type="button"
                  @click="setDirection('desc')"
                >
                  倒序 <span aria-hidden="true">↓</span>
                </button>
              </div>
            </div>
          </el-popover>

          <button class="filter-bar__ghost" type="button" @click="emit('toggle-select')">
            批量选择
          </button>
        </div>

        <div v-if="$slots.actions" class="filter-bar__actions">
          <slot name="actions" />
        </div>
      </div>

      <!--
        选择模式：整行换内容 —— 搜索 / 分段 / 排序 / 批量选择 / 新建任务 全部让位，
        换成「已选 N 条 + 四个动作 + 全选」，右端挂「退出选择」。
        不保留搜索与排序是有意的：边筛边选时，被筛掉的行会从视觉上消失，却仍在选中集里被提交。
      -->
      <div
        v-if="$slots['tabs-actions']"
        class="filter-bar__row filter-bar__row--batch"
        :class="{ 'filter-bar__row--off': !selecting }"
        :inert="!selecting"
      >
        <slot name="tabs-actions" />
        <button
          v-if="selecting"
          class="filter-bar__ghost filter-bar__exit"
          type="button"
          @click="emit('toggle-select')"
        >
          退出选择
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * 工具栏（2026-10-27 三改）：一条玻璃横条，所有控件都站在同一基线上。
 * 比顶部概览更薄、更轻（同一档填色，影只给到卡片级），
 * 于是页面上出现「概览 → 工具 → 内容」三层高度，不再是一摞同重的白卡。
 */
.filter-bar {
  /* 按容器宽度降级（与任务行的 @container 同一套思路）：窄侧栏 + 窄窗口时不看视口看这一条自己 */
  container-type: inline-size;
  padding: 10px 12px;
  border: 1px solid var(--glass-panel-border);
  /* 2026-10-30 归并：写死的 20 改走令牌，与概览 / 任务卡同一档 */
  border-radius: var(--radius-lg);
  background-color: var(--glass-panel-bg);
  backdrop-filter: var(--glass-panel-blur);
  box-shadow: var(--shadow-card);
}

/*
 * 两行同高叠放（2026-10-31）：
 * 两条都**恒定定位**、叠在同一个 grid 格子里 —— 高度交给较大的一行决定，
 * 切模式时这条工具栏的高度一像素都不变，下面的列表不会被推。
 *
 * ⚠ 不用 `position: absolute` 藏行：position 不可过渡，藏着的那行从 absolute 变回 static 时
 * 会重新参与布局，transform 的过渡直接被打断 —— 滑动就变成瞬移。grid 叠放让两行始终是同一种
 * 定位方式，只切 opacity / transform，位移才是连续的。
 */
.filter-bar__stack {
  display: grid;
  grid-template-areas: 'row';
}

/* 一行控件：搜索 / 分段 / 工具 / 主操作（选择模式下是批量条 + 退出） */
.filter-bar__row {
  display: flex;
  grid-area: row;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 12px;
  /* 46 = 搜索井的高度；批量条里的按钮只有 30，也撑到同一档，两行才一样高 */
  min-height: 46px;
  /* 显示态不裁任何东西，还留 8px 余量给 focus 环 —— 免得键盘焦点被裁掉半圈 */
  clip-path: inset(-8px);
  transition:
    opacity 180ms var(--ease),
    transform 260ms cubic-bezier(0.22, 1, 0.36, 1),
    clip-path 280ms cubic-bezier(0.22, 1, 0.36, 1);
}

/*
 * 退场的那一行：往右让开 + 淡出。
 * 「右」正是常态行里「批量选择」按钮所在的方向 —— 所以读起来是
 * **批量条从那个按钮的位置推出来**，而不是整条交叉淡化。
 */
.filter-bar__row--off {
  opacity: 0;
  transform: translateX(26px);
  pointer-events: none;
}

/*
 * 批量行退得更远（72px），并且**从左侧被裁光**（`inset(0 0 0 100%)`）。
 * 两者叠加的效果不是「整条淡入」，而是像被人从右边「拉开」——
 * 从「批量选择」按钮那一端起始、向左铺满整条工具栏，正好对上点击的位置。
 * 退出时反向：先往右缩、同时从左边收回去。
 */
.filter-bar__row--batch.filter-bar__row--off {
  transform: translateX(72px);
  clip-path: inset(0 0 0 100%);
}

/* 批量条整行：动作靠左排，「退出选择」推到最右 */
.filter-bar__exit {
  margin-left: auto;
}

/*
 * 搜索井（2026-10-27）：胶囊形、凹进玻璃里 ——
 * 底色比面板更深一档（墨色兑水）+ 一道内阴影，聚焦时整口井提亮成白色并套上苹果蓝环。
 *
 * flex-basis 和 min-width 都取 160（2026-10-29）：换行**按 basis 算、不看 shrink**，
 * 原来 basis 写 240 时存在一段「240 放不下、但 160 明明放得下」的窗口（约 1180 附近），
 * 主按钮会被挤到第二行 —— 窗口拖过这里就跳一下。basis 收到下限，这一行只在真的塞不下时才折。
 */
.filter-bar__search {
  flex: 1 1 160px;
  min-width: 160px;
}

.filter-bar__search :deep(.el-input__wrapper) {
  height: 46px;
  padding: 1px 18px;
  border: none;
  border-radius: var(--radius-pill);
  background-color: var(--color-field-bg);
  backdrop-filter: blur(10px);
  box-shadow: inset 0 0 0 1px var(--color-field-border), inset 0 1px 3px rgba(17, 24, 39, 0.06);
  transition: background-color var(--dur-fast) var(--ease), box-shadow var(--dur-base) var(--ease);
}

.filter-bar__search :deep(.el-input__wrapper:hover) {
  background-color: var(--color-field-bg-hover);
}

.filter-bar__search :deep(.el-input__wrapper.is-focus) {
  background-color: var(--color-field-bg-focus);
  box-shadow:
    inset 0 0 0 1.5px var(--color-accent),
    0 0 0 4px color-mix(in srgb, var(--color-accent) 14%, transparent),
    0 0 18px color-mix(in srgb, var(--color-accent) 22%, transparent);
}

.filter-bar__search :deep(.el-input__prefix) {
  color: var(--color-text-3);
  transition: color var(--dur-fast) var(--ease);
}

/* 聚焦时放大镜跟着描边一起转苹果蓝 */
.filter-bar__search :deep(.el-input__wrapper.is-focus) .el-input__prefix {
  color: var(--color-accent);
}

.filter-bar__search :deep(.el-input__inner) {
  font-size: 15px;
}

/*
 * 主操作区（2026-10-29 收形）：按钮 46px 高、**胶囊圆角** —— 与左侧胶囊搜索井、
 * 胶囊分段控件同一套形状语言（原来是 12px 方钮和两个胶囊并排，形状是混的）。
 * 横向留白 22 → 18：颜色降饱和之后再把体积收一档，整条工具栏才读成一个控件组。
 */
.filter-bar__actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 8px;
  /* 与「排序 / 批量选择」拉开一点：主操作不该和文字按钮连成一条 */
  margin-left: 8px;
}

.filter-bar__actions :deep(.el-button) {
  height: 46px;
  margin-left: 0;
  padding: 0 18px;
  border-radius: var(--radius-pill);
  font-size: 14.5px;
  font-weight: 550;
  /* 收成方钮时留白也要跟着收（18 → 14），收回来的宽度才不会靠 width 硬切 */
  transition: padding 280ms cubic-bezier(0.22, 1, 0.36, 1);
}

/*
 * 按钮文案（2026-10-29）：收的是 **max-width**，不是 `display: none` ——
 * 后者在两个方向都是瞬切，展开时整枚按钮会「跳」一下；这里文字、左边距、按钮留白
 * 一起走 280ms + `cubic-bezier(0.22, 1, 0.36, 1)`，与侧栏折叠同一条曲线，拖窗口时是同一个节拍。
 * 4.2em 略大于「新建任务」四个全角字（4em）：换了更长的文案要把它调大，否则文字会被切掉。
 */
.filter-bar__actions :deep(.btn-text) {
  overflow: hidden;
  white-space: nowrap;
  max-width: 4.2em;
  transition:
    max-width 280ms cubic-bezier(0.22, 1, 0.36, 1),
    margin-left 280ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 160ms var(--ease);
}

/*
 * 「新建任务」（2026-10-30 定稿二）：走 `--color-cta` —— **浅色浅蓝 + 深字、深色深蓝 + 白字**。
 * 浅色 #69adff 与白卡的明度对比只有约 2.1:1，所以内高光提到 .45（浅蓝面上更亮的一条边），
 * 边界靠它勾出来；仍**不带外投影**（约定：按钮一律不投影）。
 */
.filter-bar__actions :deep(.el-button--primary) {
  --el-button-bg-color: var(--color-cta);
  --el-button-border-color: transparent;
  --el-button-text-color: var(--color-cta-fg);
  --el-button-hover-bg-color: var(--color-cta-hover);
  --el-button-hover-border-color: transparent;
  --el-button-hover-text-color: var(--color-cta-fg);
  --el-button-active-bg-color: var(--color-cta-active);
  --el-button-active-border-color: transparent;
  /*
   * 两层内光：上沿一条亮边（光打在按钮顶面）+ 一圈更淡的内发光（浅蓝面上的「厚度」）。
   * 浅蓝与白卡明度差不足 3:1，这两层就是唯一的边界线索。
   */
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45), inset 0 0 12px -6px rgba(255, 255, 255, 0.35);
  transition:
    background-color var(--dur-fast) var(--ease),
    padding 280ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 120ms var(--ease);
}

.filter-bar__actions :deep(.el-button--primary:hover) {
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55), inset 0 0 12px -6px rgba(255, 255, 255, 0.45);
}

.filter-bar__actions :deep(.el-button--primary:active) {
  transform: scale(0.96);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.38), inset 0 0 10px -6px rgba(255, 255, 255, 0.3);
}

/*
 * 分段控件（2026-10-27 按苹果口径）：轨道只是一层极淡的中性底，
 * 真正的「选中」由滑块的白色 + 微影表达；深色主题换成浅灰半透（见 main.css 的 --seg-*）。
 */
.filter-bar__tabs {
  position: relative;
  display: flex;
  flex: none;
  align-items: center;
  gap: 2px;
  padding: 4px;
  border-radius: var(--radius-pill);
  background-color: var(--seg-track-bg);
}

/*
 * 白色滑块：位置 / 宽高由 JS 给出（量当前页签的 offset*），切页签时滑过去。
 * 首帧不加过渡（`--ready` 才打开），否则会从 (0,0) 滑进来；
 * 「减少动效」下 `--dur-base` 归零，等于直接落位。
 */
.filter-bar__tab-indicator {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 0;
  border-radius: var(--radius-pill);
  background-color: var(--seg-thumb-bg);
  box-shadow: var(--seg-thumb-shadow);
  pointer-events: none;
}

.filter-bar__tab-indicator--ready {
  transition:
    transform var(--dur-base) var(--ease),
    width var(--dur-base) var(--ease),
    height var(--dur-base) var(--ease),
    opacity var(--dur-fast) var(--ease);
}

.filter-bar__tab {
  position: relative;
  z-index: 1;
  height: 34px;
  padding: 0 17px;
  border: none;
  border-radius: var(--radius-pill);
  background-color: transparent;
  color: var(--color-text-2);
  font-size: 14px;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  /* 白底与阴影交给滑块，按钮自己只管文字颜色 */
  transition: color var(--dur-fast) var(--ease);
}

.filter-bar__tab:hover {
  color: var(--color-text);
}

/* 选中项：文字转品牌墨色 + 加粗（白底由滑块提供，这里不要再写 background / box-shadow） */
.filter-bar__tab--active {
  color: var(--color-brand-ink);
  font-weight: 600;
}

.filter-bar__tab:focus-visible {
  outline: 2px solid var(--color-text);
  outline-offset: 2px;
}

.filter-bar__tools {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 2px;
  margin-left: auto;
}

/* 文字按钮（排序 / 批量选择）：无框无底，悬停才浮一层微光 */
.filter-bar__ghost {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 4px;
  height: 34px;
  padding: 0 12px;
  border: none;
  border-radius: var(--radius-control);
  background-color: transparent;
  color: var(--color-text-2);
  font-size: 14px;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease), background-color var(--dur-fast) var(--ease),
    transform 120ms var(--ease);
}

.filter-bar__ghost:hover {
  color: var(--color-text);
  background-color: var(--control-hover);
}

.filter-bar__ghost:active {
  transform: scale(0.97);
}

.filter-bar__ghost:focus-visible {
  outline: 2px solid var(--color-text);
  outline-offset: 2px;
}

/*
 * 展开指示三角（2026-10-31）：`inline-block` 是必需的 —— 父级虽然是 inline-flex、
 * flex item 会被 blockify，但这里仍显式写出来，避免以后父级改成 block 时 rotate 静默失效。
 * 展开时转 180°，颜色抬一档，和面板的展开是同一个动作。
 */
.filter-bar__caret {
  display: inline-block;
  font-size: 11px;
  line-height: 1;
  color: var(--color-text-3);
  transition: transform var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease);
}

.filter-bar__caret--open {
  transform: rotate(180deg);
  color: var(--color-text-2);
}

/* 悬停时按钮文字变深，三角跟着走一档，别一大一小两种灰 */
.filter-bar__ghost:hover .filter-bar__caret {
  color: var(--color-text-2);
}

.filter-bar__ghost:hover .filter-bar__caret--open {
  color: var(--color-text);
}

/* 工具栏自己真的放不下时，搜索井再收一档（按容器算，与侧栏收没收无关） */
@container (max-width: 760px) {
  /* 搜索的 flex-basis 与 min-width 一起收：换行按 basis 算，min-width 还压着实际宽度 */
  .filter-bar__search {
    flex-basis: 150px;
    min-width: 150px;
  }
}

/*
 * 主操作收成一枚加号方钮（2026-10-28 改断点）：**与侧栏折叠同一个宽度**。
 * DefaultLayout 的 `NARROW_SIDEBAR_MAX = 1150`、判断式是 `innerWidth < 1150`，
 * 所以这里取 1149.98（把小数宽度也算进去）—— 侧栏收窄与按钮收字在同一次 resize 里发生。
 * 之前按容器 ≤760 算：侧栏 1150 就收了，按钮却要拖到约 946 才收，中间一段明显不同步。
 * 文字让位而不是整行折行 —— 折行后按钮会孤零零落到第二行，比少一行字难看得多。
 * ⚠️ 改侧栏断点时，这里必须一起改。
 */
@media (max-width: 1149.98px) {
  .filter-bar__actions :deep(.btn-text) {
    max-width: 0;
    margin-left: 0;
    opacity: 0;
  }

  /*
   * 留白 22 → 14：16 图标 + 28 留白 + 2 描边 = 46 的方钮。
   * 三个量一起收，宽度是连续下去的（不再出现「前 3/4 不动、最后一帧缩到 46」的停顿），
   * 图标由 flex 的 justify-content: center 居中。
   */
  .filter-bar__actions :deep(.el-button) {
    padding-left: 14px;
    padding-right: 14px;
  }
}

/* ---------- 排序面板 ---------- */

.sort-panel {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sort-panel__title {
  padding: 2px 8px 6px;
  font-size: 12px;
  color: var(--color-text-3);
}

.sort-panel__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: 36px;
  padding: 0 8px;
  border: none;
  border-radius: var(--radius-sm);
  background-color: transparent;
  color: var(--color-text-2);
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease);
}

.sort-panel__item:hover {
  background-color: var(--color-hover);
  color: var(--color-text);
}

.sort-panel__item--active {
  color: var(--color-brand-ink);
  font-weight: 500;
}

.sort-panel__divider {
  height: 1px;
  margin: 6px 0;
  background-color: var(--color-border);
}

.sort-panel__dir {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.sort-panel__dir-btn {
  height: 28px;
  padding: 0 4px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: transparent;
  color: var(--color-text-2);
  font-size: 12px;
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease);
}

.sort-panel__dir-btn:hover {
  border-color: var(--color-border-strong);
  color: var(--color-text);
}

.sort-panel__dir-btn--active {
  border-color: color-mix(in srgb, var(--color-brand) 45%, transparent);
  background-color: var(--color-brand-soft);
  color: var(--color-brand-ink);
  font-weight: 500;
}
</style>

<style>
/* 排序面板是 teleport 出去的气泡，外层壳的留白与描边只能写成全局样式 */
.todone-sort-pop.el-popover {
  padding: 8px;
  /* 玻璃浮层：与全站浮层同一档填色与描边 */
  border: 1px solid var(--glass-border);
  background-color: var(--glass-bg-strong);
  backdrop-filter: var(--glass-blur);
  border-radius: var(--radius-md);
  box-shadow: 0 10px 30px rgba(16, 24, 20, 0.08);
}
</style>
