<script setup lang="ts">
/**
 * 任务卡片（8.5；2026-10-18 按设计稿改版）：
 * 左侧方形复选框，中间标题 / 描述，右侧优先级标签与人类可读的截止时间（`今天 14:57` / `10-18`）。
 *
 * 整行点击 = **直接打开编辑弹窗**（2026-10-27 起不再有只读详情）。
 *
 * 行内只读（2026-10-27）：优先级与截止时间不再能就地修改，统一走编辑弹窗；
 * 行尾只保留删除。本组件只发事件，落接口由调用方负责。
 * 批量选择（F）：前置位换成方形多选框，行尾操作隐藏、点击整行 = 勾选。
 */
import { computed, onUnmounted, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import AppTooltip from './AppTooltip.vue'
import ImageSlideshow from './ImageSlideshow.vue'
import { TASK_PRIORITY_LABEL } from '@/constants'
import { formatDateTime, formatDueDay, isOverdue } from '@/utils/date'
import { forgetImageUrl, resolveImageUrl } from '@/utils/imageUrl'
import type { Task, TaskStatus } from '@/types'

const props = defineProps<{
  task: Task
  /** 批量选择模式：前置位换方形框、行内快捷入口禁用、点击整行 = 勾选 */
  selectMode?: boolean
  selected?: boolean
  /** 这次切换会让这一行离开列表（未完成页勾选完成、已完成页取消勾选都算），先播形态变化再落数据 */
  leaveOnToggle?: boolean
}>()

/**
 * 勾选完成后先本地展示完成态（绿勾 + 划线）160ms，
 * 再交给列表的 leave 过渡做 420ms 缩小淡出 —— 缩小交给 transition，
 * 不能用 CSS animation：animation 会让 TransitionGroup 的补位（FLIP）失效。
 */
const SETTLE_MS = 160

const emit = defineEmits<{
  /** 点击整行：直接打开编辑弹窗 */
  open: [Task]
  remove: [Task]
  'toggle-status': [Task]
  'toggle-select': [Task]
}>()

const isDone = computed(() => props.task.status === 'DONE')
const dueText = computed(() =>
  props.task.dueDate ? formatDueDay(props.task.dueDate) : '未设截止时间',
)
/**
 * 悬停时才显示的完整时刻（2026-10-31）：**同一年内省略年份**。
 * 「11-01 04:57」比「2026-11-01 04:57」短约 40px —— 时间列因此不用为 16 个字符
 * 预留 140px，短日期那一段空格子也就跟着收窄。跨年任务仍带年份，12-31 / 01-01 不会混。
 */
const dueTitle = computed(() => {
  if (!props.task.dueDate) return ''
  const text = formatDateTime(props.task.dueDate)
  return text.startsWith(`${new Date().getFullYear()}-`) ? text.slice(5) : text
})

/**
 * 勾选 / 取消勾选的退场（2026-10-18，2026-10-30 补齐反方向）：
 * `leaveOnToggle` = 「这次切换会让这一行离开列表」—— 未完成页勾选完成、已完成页取消勾选都算。
 * 先本地切成**目标态**、把形态变化播出来（划线划出 / 收回、勾选圈染色 / 褪色），
 * 160ms 后再把状态交给数据层；行离开时的缩小淡出由 TaskList 的 leave 过渡完成
 * （必须带 `--leaving`，否则走的是 200ms 的快速淡出，看起来就是「直接消失」）。
 *
 * ⚠ 这里存的是**目标状态**而不是布尔：两个方向要显示的样子不同。
 * 原来只判 `isDone`，「已完成 → 未完成」会直接 emit，划线根本没机会退回去。
 */
const pending = ref<TaskStatus | null>(null)
let leaveTimer: number | undefined

/** 视图上的完成态：pending 存在时以它为准（数据还没回写） */
const displayDone = computed(() => (pending.value ?? props.task.status) === 'DONE')

/** 逾期也按「视图状态」算：取消完成后它立刻回到「可能逾期」，只是退场期间不显示标记 */
const overdue = computed(() => isOverdue(props.task.dueDate, pending.value ?? props.task.status))

/**
 * 逾期标记（2026-10-29）：那 160ms 的退场里先收起 ——
 * 否则「已完成」的绿勾会同时挂着红胶囊；取消完成同理，别刚变回未完成就闪一下红标。
 */
const showOverdue = computed(() => overdue.value && !pending.value)

function handleToggleStatus() {
  if (pending.value) return
  if (!props.leaveOnToggle) {
    emit('toggle-status', props.task)
    return
  }
  pending.value = isDone.value ? 'TODO' : 'DONE'
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  leaveTimer = window.setTimeout(() => emit('toggle-status', props.task), reduceMotion ? 0 : SETTLE_MS)
}

onUnmounted(() => window.clearTimeout(leaveTimer))

/**
 * 整行点击（2026-10-27）：选择模式下改为勾选；否则直接打开编辑弹窗。
 * 用户正在划选文字（想复制）时不触发。
 */
function handleRowClick() {
  if (props.selectMode) {
    emit('toggle-select', props.task)
    return
  }
  if (window.getSelection()?.toString()) return
  emit('open', props.task)
}

/* ---------- 列表里的配图缩略（2026-10-31） ---------- */

/**
 * 只显示第一张，其余靠右上角 `+N` 交代 —— 一列缩略图会把「标题 + 描述」挤走，
 * 而这一行真正要读的还是文字。
 * 点击打开大图（2026-11-01 换掉 `ElImageViewer`）：改成与任务弹窗同一套 `ImageSlideshow`，
 * 放进灯箱里放大展示 —— 同一份「配图」在列表、弹窗、大图三处长得一样，
 * 而不是列表里一种皮肤、点开又是另一种（EP 那套是全屏黑底 + 系统箭头，和这套液态玻璃不搭）。
 * 灯箱必须 `Teleport` 到 body：卡片的 `backdrop-filter` 会给 fixed 后代造包含块，不传送就会被压在卡片里。
 * 绑定时必须 `.stop` —— 否则同一次点击会顺带触发整行的「打开编辑弹窗」。
 */
const imagePreviewOpen = ref(false)
/**
 * 大图预览的地址列表：**点开的那一刻**才解析（2026-10-31）。
 * 列表渲染阶段只解析封面那一张 —— 一个任务可能挂 9 张图，没点开就不该进 URL 缓存、
 * 更不该被算成「用过的」（`utils/imageUrl` 的 LRU 按使用顺序淘汰）。
 */
const viewerUrls = ref<string[]>([])
/** 灯箱里正在看第几张：每次打开都从封面（0）开始 */
const viewerIndex = ref(0)
/** 封面：第一张（模板里的 `v-if` 已经保证有图，这里仍取可选链，类型上才收得住） */
const cover = computed(() => props.task.images[0])
/** 封面实际用的地址：走 `utils/imageUrl` 的 URL 复用，切页签时不换 src，浏览器才不会重下 */
const coverUrl = ref('')
/** 当前封面已经重试过一次：同一条地址再失败就认了，避免 error 循环 */
const coverRetried = ref(false)

watch(
  cover,
  (image) => {
    coverRetried.value = false
    coverUrl.value = image ? resolveImageUrl(image) : ''
  },
  { immediate: true },
)

/**
 * 封面加载失败（旧 URL 刚好过期 / 对象被删）：作废缓存里那条，换成这次响应给的最新地址再试一次。
 * 两次都失败说明地址本身不可用，不再重试。
 */
function handleCoverError() {
  const image = cover.value
  if (!image || coverRetried.value) return
  coverRetried.value = true
  forgetImageUrl(image.objectKey)
  coverUrl.value = resolveImageUrl(image)
}

function openImages() {
  if (!props.task.images.length) return
  viewerUrls.value = props.task.images.map((image) => resolveImageUrl(image))
  viewerIndex.value = 0
  imagePreviewOpen.value = true
}

function closeImages() {
  imagePreviewOpen.value = false
}

/**
 * 灯箱的键盘出口：Esc 关。
 * 左右键不在这里接 —— 那是「换第几张」的事，由 `ImageSlideshow` 的 `keyboard` 参数统一管，
 * 边界（首尾夹住）只写一处。
 */
function onViewerKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closeImages()
}

watch(imagePreviewOpen, (open) => {
  if (open) window.addEventListener('keydown', onViewerKeydown)
  else window.removeEventListener('keydown', onViewerKeydown)
})

onUnmounted(() => window.removeEventListener('keydown', onViewerKeydown))
</script>

<template>
  <article
    class="task-row"
    :class="{
      'task-row--done': displayDone,
      'task-row--select': selectMode,
      'task-row--selected': selected,
      'task-row--leaving': pending !== null,
    }"
    role="button"
    tabindex="0"
    :aria-label="selectMode ? `选择任务：${task.title}` : `查看任务详情：${task.title}`"
    @click="handleRowClick"
    @keydown.enter.prevent="handleRowClick"
    @keydown.space.prevent="handleRowClick"
  >
    <!--
      逾期标记（2026-11-01）：从伪元素改成**真实元素**，因为伪元素挂不了气泡。
      视觉仍是那枚 5px 红胶囊（内层 `::before` 画）；外面这层 14px 是**命中区** ——
      5px 的悬停目标鼠标根本停不住。气泡里那句「逾期」补的就是「这枚红条是什么意思」。
    -->
    <AppTooltip v-if="showOverdue" content="逾期" placement="left">
      <span class="task-row__edge" aria-hidden="true" />
    </AppTooltip>

    <!-- 批量选择模式：方形多选框（完成态是绿底，这里是黑底，两种语义不混） -->
    <span
      v-if="selectMode"
      class="task-row__box"
      :class="{ 'task-row__box--on': selected }"
      aria-hidden="true"
    >
      <AppIcon v-if="selected" name="check" :size="14" />
    </span>

    <AppTooltip
      v-else
      :content="displayDone ? '标记为未完成' : '标记为已完成'"
      placement="top"
    >
      <button
        class="task-row__check"
        type="button"
        :aria-pressed="displayDone"
        :aria-label="displayDone ? '标记为未完成' : '标记为已完成'"
        @click.stop="handleToggleStatus"
      >
        <span class="task-row__check-box">
          <AppIcon name="check" :size="14" />
        </span>
      </button>
    </AppTooltip>

    <div class="task-row__body">
      <!-- 标题不再挂气泡（2026-10-28）：悬停整行会弹一条与正文重复的标题，噪声大于收益 -->
      <h3 class="task-row__title">{{ task.title }}</h3>
      <!--
        描述是可选字段，但这一行**始终渲染**并占一行高度：
        否则没填描述的任务会矮一截，长列表里行的节奏忽高忽低。
      -->
      <p class="task-row__description">{{ task.description || '' }}</p>
    </div>

    <!-- 右侧：优先级 + 截止时间（**只读展示**）+ 删除；操作按钮悬停才显形（不推动布局） -->
    <div class="task-row__side" :class="{ 'task-row__side--images': task.images.length }">
      <div class="task-row__meta">
        <!--
          配图缩略（2026-10-31）：有图才渲染，放在优先级左边。
          **只显示首张封面**，多图也不叠底卡、不挂角标 —— 张数点开大图自己看，
          列表这一行首先要把「标题 + 描述」读清楚。
        -->
        <button
          v-if="task.images.length"
          class="task-thumbs"
          type="button"
          :aria-label="`查看配图，共 ${task.images.length} 张`"
          @click.stop="openImages"
        >
          <!-- lazy + async decode：44px 的封面不该和首屏任务抢带宽 -->
          <img
            class="task-thumbs__img"
            :src="coverUrl"
            alt=""
            draggable="false"
            loading="lazy"
            decoding="async"
            @error="handleCoverError"
          />
        </button>

        <!-- 2026-10-27：优先级只展示，修改统一走编辑弹窗 -->
        <span class="task-row__prio" :class="`task-row__prio--${task.priority.toLowerCase()}`">
          {{ TASK_PRIORITY_LABEL[task.priority] }}
        </span>

      </div>

      <!--
        截止时间（2026-10-31 四改）：从 meta 里提出来、自己绝对定位在右列右端。
        悬停展开时它向左**盖住**优先级（优先级原地不动），而不是把优先级挤走。
      -->
      <span
        class="task-row__due"
        :class="{ 'task-row__due--overdue': showOverdue, 'task-row__due--empty': !task.dueDate }"
      >
        <!-- 逾期时把时钟换成警告三角（同一枚 12px 图标位） -->
        <AppIcon :name="showOverdue ? 'alert' : 'clock'" :size="12" />
        <span class="task-row__due-text">
          <span class="task-row__due-short">{{ dueText }}</span>
          <span class="task-row__due-full">{{ dueTitle || dueText }}</span>
        </span>
      </span>

      <div v-if="!selectMode" class="task-row__actions">
        <!-- 2026-10-27：铅笔去掉，点整行即编辑；这里只留删除 -->
        <AppTooltip content="删除" placement="top">
          <button
            class="task-row__action task-row__action--danger"
            type="button"
            :aria-label="`删除：${task.title}`"
            @click.stop="emit('remove', task)"
          >
            <AppIcon name="trash" />
          </button>
        </AppTooltip>
      </div>
    </div>

    <!--
      大图灯箱（2026-11-01）：与弹窗共用 `ImageSlideshow`，只把尺寸放大一档。
      `Teleport` 是硬要求 —— 卡片的 `backdrop-filter` 会给 fixed 后代造包含块，
      不传送到 body 的话，灯箱会被压在卡片里（EP 的 `teleported` 干的就是这件事）。
      下方缩略图条（2026-11-01 追加）：点一张就滑到那张，与弹窗里的缩略图同一套语义。
      三个出口：点遮罩、右上角 ×、Esc。
    -->
    <Teleport to="body">
      <Transition name="lightbox">
        <div
          v-if="imagePreviewOpen"
          class="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="查看配图"
          @click.self="closeImages"
        >
          <div class="lightbox__body">
            <div class="lightbox__stage">
              <ImageSlideshow
                v-model:index="viewerIndex"
                :urls="viewerUrls"
                label="任务配图"
                large
                keyboard
              />
              <button class="lightbox__close" type="button" aria-label="关闭" @click="closeImages">
                ×
              </button>
            </div>

            <!-- 只有一张时不摆这条：一枚缩略图既没有「切」的作用，也只是一层噪声 -->
            <div v-if="viewerUrls.length > 1" class="lightbox__thumbs" role="tablist" aria-label="配图列表">
              <button
                v-for="(url, index) in viewerUrls"
                :key="index"
                class="lightbox__thumb"
                :class="{ 'lightbox__thumb--on': index === viewerIndex }"
                type="button"
                role="tab"
                :aria-selected="index === viewerIndex"
                :aria-label="`第 ${index + 1} 张`"
                @click="viewerIndex = index"
              >
                <img class="lightbox__thumb-img" :src="url" alt="" draggable="false" />
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </article>
</template>

<style scoped>
/*
 * 任务卡（2026-10-27 四改：回到「一行一卡」）：
 * 每行是一块独立的玻璃（20px 圆角 + 26px 模糊 + 0.5 白 + 高光边），
 * 悬停整体上浮 2px、影更深 —— 一列卡在渐变上各自浮着，层级靠「一张张卡」读，而不是分组里的发丝线。
 * 行高 87px（padding 18 / 22、前置位 40px 放 24px 勾选圈、标题 17 / 描述 14），换皮不换骨架。
 */
.task-row {
  position: relative;
  display: grid;
  /* 前置位 40px（命中区）放 24px 圆形框；正文一列；右侧元信息 + 固定宽度的操作列 */
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 18px 22px;
  border: 1px solid var(--glass-card-border);
  border-radius: var(--radius-lg);
  background-color: var(--glass-card-bg);
  backdrop-filter: var(--glass-card-blur);
  box-shadow: var(--shadow-card);
  cursor: pointer;
  transition: background-color var(--dur-base) var(--ease), border-color var(--dur-base) var(--ease),
    box-shadow var(--dur-base) var(--ease), transform var(--dur-base) var(--ease);
}

/* 悬停 = 上浮 2px + 影更深 + 高光边更亮：三件事一起动，卡才像被拿起来 */
.task-row:hover {
  border-color: var(--glass-card-border-hover);
  background-color: var(--glass-card-bg-hover);
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-2px);
}

/* 键盘焦点与悬停同一姿态，再套一圈苹果蓝，键盘用户才看得出当前在哪 */
.task-row:focus-visible,
.task-row:has(:focus-visible) {
  outline: none;
  border-color: var(--glass-card-border-hover);
  box-shadow: var(--shadow-card-hover), 0 0 0 2px color-mix(in srgb, var(--color-accent) 45%, transparent);
  transform: translateY(-2px);
}

/*
 * 逾期标记（2026-10-29 八改定位置，2026-11-01 从伪元素换成真实元素）：
 * 居中悬在「卡片左边缘 ↔ 勾选圈」之间。量过：卡片左边到 24px 勾选圈的左边是 31px
 * （1px 描边 + 22px 内边距 + 40px 命中区里 8px 的居中留白），胶囊取 5px 宽、左缘 13px
 * （相对内边距盒 12px），左右各余 13px、整数像素不落半格；高 54%（≈46px）、两端全圆角、
 * 垂直居中与勾选圈同线。
 *
 * 外层这 14px 是**命中区**（红条左右各 4.5px 透明）：`left: 12 + 2.5 − 14/2 = 7.5`。
 * 为什么要命中区：伪元素挂不了气泡，而 5px 宽的悬停目标鼠标停不住 —— 现在悬停会显示「逾期」。
 * 只有逾期那一行才渲染这个元素（`v-if`），不再用 `--row-edge` 变量做「透明占位」。
 */
.task-row__edge {
  position: absolute;
  top: 50%;
  left: 7.5px;
  width: 14px;
  height: 54%;
  transform: translateY(-50%);
  /* 悬停目标不是按钮，用 help 光标提示「这里有个说明」 */
  cursor: help;
}

/* 真正的红胶囊：5px 宽，画在命中区正中 */
.task-row__edge::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 5px;
  transform: translateX(-50%);
  border-radius: var(--radius-pill);
  background-color: var(--color-danger);
}

/* 批量选择：选中行留一层品牌浅蓝，和悬停的浮起区分开 */
.task-row--selected {
  background-color: var(--color-brand-soft);
}

/* ---------- 勾选 / 多选 ---------- */

.task-row__check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  border-radius: var(--radius-md);
  background-color: transparent;
  cursor: pointer;
}

.task-row__check-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  /* 圆形复选框：细一圈浅灰描边，悬停才染上品牌色 */
  border: 1.5px solid color-mix(in srgb, var(--color-text) 20%, transparent);
  border-radius: 50%;
  background-color: transparent;
  color: transparent;
  transition: color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease),
    background-color var(--dur-fast) var(--ease), box-shadow var(--dur-base) var(--ease),
    transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* 卡片悬停：勾选圈先透一层很淡的光，提示这一列是「点一下就完成」的入口 */
.task-row:hover .task-row__check-box,
.task-row:focus-visible .task-row__check-box, .task-row:has(:focus-visible) .task-row__check-box {
  box-shadow: 0 0 10px color-mix(in srgb, var(--color-check-bg) 20%, transparent);
}

/*
 * 直接悬停勾选圈（2026-10-29 改浅绿预览）：先给结果、再给动作 ——
 * 描边与微光都是「完成后的绿」，点下去颜色不会再跳一次。
 */
.task-row__check:hover .task-row__check-box {
  border-color: color-mix(in srgb, var(--color-check-bg) 55%, var(--color-check-fg));
  background-color: color-mix(in srgb, var(--color-check-bg) 14%, transparent);
  color: var(--color-check-fg);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-check-bg) 14%, transparent),
    0 0 16px color-mix(in srgb, var(--color-check-bg) 40%, transparent);
  transform: scale(1.08);
}

.task-row__check:active .task-row__check-box {
  background-color: color-mix(in srgb, var(--color-check-bg) 30%, transparent);
}

/* 批量选择：同尺寸圆形框，选中态用品牌色实底 */
.task-row__box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin: 0 8px;
  border: 1.5px solid color-mix(in srgb, var(--color-text) 18%, transparent);
  border-radius: 50%;
  background-color: transparent;
  color: transparent;
  transition: color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease),
    background-color var(--dur-fast) var(--ease);
}

.task-row__box--on {
  border-color: var(--color-brand);
  background-color: var(--color-brand);
  color: var(--color-brand-fg);
}

/* ---------- 正文 ---------- */

.task-row__body {
  min-width: 0;
}

/* 标题是这一行唯一的「重音」：15px / 600 / 微收字距 */
.task-row__title {
  /* 2026-10-26：标题也锁单行 —— 极窄窗口下换行会让行高从 84 变成 107，行高必须恒定才彻底平滑 */
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: -0.01em;
  color: var(--color-text);
  word-break: break-word;
  /*
   * 勾选完成时的横线：平时宽度为 0，加上 --done 后自左向右划出来。
   * 用 background 画线而不是 text-decoration，是因为后者只能瞬间出现、不能"由无到有"。
   */
  background-image: linear-gradient(currentColor, currentColor);
  background-repeat: no-repeat;
  background-position: 0 55%;
  background-size: 0 1px;
  transition: color var(--dur-strike) var(--ease), background-size var(--dur-strike) var(--ease);
}

/* 描述只留一行，超出部分省略号收尾；比标题小一档（13px）做弱化 */
.task-row__description {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  /* 占位高度 = 一行正文：没填描述的任务也占着这一行，行高才一致 */
  min-height: 22px;
  margin-top: 3px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-text-2);
  word-break: break-word;
}

/* ---------- 右侧元信息 ---------- */

.task-row__side {
  position: relative;
  display: flex;
  flex: none;
  align-items: center;
  justify-content: flex-end;
  /*
   * 2026-10-31 四改：宽度交给内容 —— 时间已经绝对定位在右端，右列不再需要一个固定宽度撑着。
   * padding-right 40 仍然是给删除按钮的：它显形时整列不位移。
   */
  width: auto;
  padding-right: 40px;
}

.task-row__meta {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  /*
   * 右侧留出「常态时间」的宽度（图标 12 + gap 5 + 短日期约 44）：优先级到这里为止，
   * 再往右就是时间的绝对定位区。悬停展开时时间向左长，盖住的正是优先级这一块。
   */
  padding-right: 73px;
}

/* 「未设截止时间」的行平时就显示 6 个字（约 95 宽），右边要多留一截 */
.task-row__side:has(.task-row__due--empty) .task-row__meta {
  padding-right: 107px;
}

.task-row__side:has(.task-row__due--empty) .task-row__due {
  min-width: 95px;
}

/*
 * 触屏（无 hover）下删除按钮是静态列、不是浮层，不需要那 40px 预留。
 */
@media (hover: none) {
  .task-row__side {
    padding-right: 0;
  }

  .task-row__due {
    right: 0;
  }
}

/* ---------- 配图缩略（2026-10-31） ---------- */

/*
 * 44px 封面卡（2026-10-31）：只放首张图，圆角与输入框同一档（--radius-md）。
 * 44 是「一眼能认出是张图」的下限：32 在真机上只读成一个灰块。
 * 圆角裁切放在按钮上（overflow: hidden），图片悬停放大时才不会顶到旁边的优先级标签。
 */
.task-thumbs {
  /*
   * 2026-10-31 四改：回到 flex 流 —— 时间改成绝对定位之后，右列已经没有「会把缩略图推走」的宽度变化了，
   * 所以它可以紧挨着优先级（12px），不必再钉在最左端、离优先级隔着一大片空白。
   */
  flex: none;
  width: 44px;
  height: 44px;
  padding: 0;
  overflow: hidden;
  border: none;
  border-radius: var(--radius-md);
  background-color: var(--color-hover);
  /* 一圈发丝墨边：浅色照片压在浅色卡上，没有这圈边就看不出边界在哪 */
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-text) 8%, transparent);
  cursor: zoom-in;
  transition: box-shadow var(--dur-base) var(--ease);
}

.task-thumbs__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--dur-base) var(--ease);
}

/* 悬停：图片在框内轻推一下（overflow 裁住），外圈阴影加深 —— 明确的「可放大」暗示 */
.task-thumbs:hover {
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--color-text) 12%, transparent),
    0 6px 14px -6px rgba(24, 36, 74, 0.32);
}

.task-thumbs:hover .task-thumbs__img {
  transform: scale(1.06);
}

.task-thumbs:active .task-thumbs__img {
  transform: scale(0.98);
}

/* 键盘聚焦：图片上不能靠阴影表达焦点，给一圈主色轮廓 */
.task-thumbs:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 3px;
}

/*
 * 优先级（2026-10-27 三改）：从「描边胶囊」收成**圆点 + 文字**的一小块浅底 ——
 * 分组列表里每行都挂一枚描边胶囊，边太多、太吵；去掉描边后它退回「标记」这一层，
 * 靠色相（红 / 橙 / 蓝灰）和一枚 4px 圆点区分三档。
 */
.task-row__prio {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: opacity 160ms var(--ease);
  height: 22px;
  padding: 0 9px;
  border: none;
  border-radius: var(--radius-pill);
  background-color: color-mix(in srgb, currentColor 11%, transparent);
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}

.task-row__prio::before {
  content: '';
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: currentColor;
}

/* 2026-10-27：胶囊只用于展示，不再有可点手感（修改统一走编辑弹窗） */

.task-row__prio--high {
  color: color-mix(in srgb, var(--color-priority-high-fg) 82%, var(--color-text));
}

.task-row__prio--medium {
  color: color-mix(in srgb, var(--color-priority-medium-fg) 82%, var(--color-text));
}

.task-row__prio--low {
  color: color-mix(in srgb, var(--color-priority-low-fg) 82%, var(--color-text));
}

.task-row__due {
  /*
   * 2026-10-31 四改：绝对定位在右列右端（`right: 40px` 让开删除按钮那 40px）。
   * 宽度由内容决定、并受内部 `max-width` 过渡控制 —— 展开时**从右缘向左长**，
   * 因为不在流里，所以不会推开优先级，而是直接盖在它上面。
   */
  position: absolute;
  top: 50%;
  right: 40px;
  transform: translateY(-50%);
  display: inline-flex;
  /*
   * 2026-10-31 五改：**宽度用 `min-width` 过渡**，内容居中。
   * `width: auto` 不能插值，但 `min-width` 可以 —— 常态 61（图标 12 + 间距 5 + 最长的短日期
   * `10-18` 44，即这一列永远站得下任何短日期），悬停放开到 95（+ 完整时刻）。
   * 内容居中是为了让图标和日期这一组始终贴在一起、不因为短日期字少而飘到一头。
   */
  min-width: 61px;
  /*
   * 常态**左对齐**：容器宽恒 61（站得下最长的短日期），但「明天」只占 42，
   * 若居中就会在左侧留下 9.5px，图标于是离优先级 21.5 —— 和「缩略图 ↔ 优先级」的 12 对不上。
   * 左对齐让图标永远贴着容器左缘，三处间距才是同一个 12。
   */
  justify-content: flex-start;
  transition: min-width 260ms var(--ease);
  align-items: center;
  gap: 5px;
  /*
   * 2026-10-31 三改：不再预留固定宽度，按内容走 —— 短日期时这一列只有「🕐 明天」那点宽，
   * 图标就紧挨着字（原来 96 的固定宽让图标离字 50 多像素）。
   * 悬停时靠内部文本容器的 `max-width` 过渡向左展开（见 `.task-row__due-text`），
   * 缩略图已经绝对定位钉住，不会被推走。
   */
  padding: 0;
  border: none;
  background-color: transparent;
  /* 日期比描述更轻：纯文本、浅灰，只靠时钟图标和字号压住重量 */
  color: var(--color-text-3);
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
  line-height: 1.6;
  white-space: nowrap;
}

/*
 * 悬停展开 / 收回（2026-10-31 四改）：`max-width` 过渡 + 两段文本叠放 + 右对齐裁切。
 *
 * 两段文本用 grid 叠在同一格，容器宽度取较宽的那个（完整时刻 77），再被 `max-width` 裁住：
 *   · 常态 44 → 只看得见右边的短日期「明天」；
 *   · 悬停 130 → 容器展开到 77，完整时刻从**左边逐像素露出来**，读起来是「向左滑出」；
 *   · 收回时上限降回 44，容器从 77 收到 44，同一段文字从左边被裁掉、短日期淡回来 ——
 *     所以**收回也有动画**，不是瞬间变短。
 * ⚠ 两段必须都留在 DOM 里（`display: none` 一换，宽度就跳了，收回会变成硬切）。
 * 时钟图标排在这块文本左边，跟着左缘走，所以永远贴着字。
 */
.task-row__due-text {
  display: inline-block;
  white-space: nowrap;
}

/* 两段文本靠 display 互换：宽度交给外层的 `min-width` 过渡去撑，内容本身不需要动画 */
.task-row__due-full {
  display: none;
}

@media (hover: hover) {
  /*
   * 103 是「让展开后的图标落在优先级正中」倒推出来的数（2026-10-31）：
   *   优先级中心距右缘 = 40（时间 right）+ 73（meta padding）+ 20（半宽）= 133；
   *   展开内容 = 图标 12 + 间距 5 + 完整时刻 78 = 95，居中在 103 的容器里左空 4；
   *   图标中心距右缘 = 40 + 103 − 4 − 6 = 133 ✔
   * 换句话说：容器要比内容宽 8，多出来的 4+4 正好把图标推到那个中点。
   * 字体或日期格式一变，95 就变，这个 103 要跟着重算。
   */
  .task-row:hover .task-row__due {
    min-width: 103px;
    /* 展开后改回居中，图标才落在优先级正中（见上面 103 的推导） */
    justify-content: center;
  }

  .task-row:hover .task-row__due-short {
    display: none;
  }

  .task-row:hover .task-row__due-full {
    display: inline;
  }

  /*
   * 时间向左展开时把优先级盖掉。
   * 它**原地不动**（时间绝对定位、不占位），只是淡出 ——
   * 纯文字直接叠在「高 / 中」上会糊成一片，必须有一方让出可见性。
   */
  .task-row:hover .task-row__prio {
    opacity: 0;
  }
}

.task-row__due--empty {
  color: var(--color-text-3);
}

/* 逾期：只用红字 + 红图标 */
.task-row__due--overdue {
  color: var(--color-danger);
  font-weight: 500;
}

/*
 * 操作：桌面端绝对定位在右端 —— 默认让元信息贴住卡片右边缘，
 * 悬停时元信息整体左移让位、按钮淡入（两者不重叠，也不推挤卡片宽度）。
 * 触屏（无 hover）退回静态排列，操作始终可见。
 */
.task-row__actions {
  display: flex;
  flex: none;
  /* 只剩删除一个按钮（32px），让位宽度同步 */
  width: 32px;
  justify-content: flex-end;
  gap: 2px;
  transition: opacity var(--dur-fast) var(--ease);
}

@media (hover: hover) {
  .task-row__actions {
    position: absolute;
    top: 50%;
    /* 2026-10-31：往右挪 10px，贴上卡片内缘（原来离右边还有一截，看着像没排满） */
    right: -10px;
    transform: translateY(-50%);
    opacity: 0;
  }

  .task-row:hover .task-row__actions,
  .task-row:focus-visible .task-row__actions, .task-row:has(:focus-visible) .task-row__actions {
    opacity: 1;
  }

  /* 按钮位已经由 `.task-row__side` 的 padding-right 预留，这里不再推 meta */
}

.task-row__action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: var(--radius-control);
  background-color: transparent;
  color: var(--color-text-3);
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease), background-color var(--dur-fast) var(--ease);
}

.task-row__action:hover {
  color: var(--color-text);
  background-color: var(--control-hover);
}

.task-row__action--danger:hover {
  color: var(--color-danger);
}

/* ---------- 已完成 ---------- */

.task-row--done .task-row__title {
  color: var(--color-text-2);
  background-size: 100% 1px;
}

.task-row--done .task-row__check-box {
  border-color: transparent;
  background-color: var(--color-check-bg);
  background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0) 62%);
  color: var(--color-check-fg);
  box-shadow: 0 3px 9px -4px color-mix(in srgb, var(--color-check-bg) 75%, transparent);
}

.task-row--done .task-row__description,
.task-row--done .task-row__due {
  color: var(--color-text-3);
}

/* ---------- 勾选 / 取消勾选的退场 ---------- */

/*
 * 退场期间整卡只读：连点会把 pending 打乱。
 * 「完成态长什么样」一律交给 `--done`（由 displayDone 控制），这里不再重复第二遍 ——
 * 取消勾选时 `--done` 被摘掉，绿勾褪色、划线从右往左收回，160ms 后行再缩小淡出。
 */
.task-row--leaving {
  pointer-events: none;
}

/* ---------- 大图灯箱（2026-11-01） ---------- */

/*
 * 灯箱 = 全屏遮罩 + 一块 16:9 的舞台。轮播的样式全在 `ImageSlideshow` 里，
 * 这里只管「多大、放哪儿、怎么进出」。
 * 层级取 3000：与 TitleTip / IdentityRow 同一档，压在弹窗遮罩（2000+）之上。
 */
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-mask-strong);

  /*
   * 灯箱自己的三个量都定在这一层，别处一律引用，不写第二遍：
   *   · `--lightbox-pad`：遮罩四周留白（宽度预算里也要减掉它，所以必须是变量）；
   *   · `--lightbox-thumb`：缩略图边长，跟着视口高度走（`clamp(56px, 7vh, 96px)`）——
   *     1080 高 ≈ 76px、800 高 ≈ 56px、1440 高封顶 96px。画面按比例缩，缩略图不能停在固定 px，
   *     否则 4K 上是一小排邮票，小窗上又显得笨重；
   *   · `--lightbox-gap`：画面 ↔ 缩略图条的间距。
   */
  --lightbox-pad: 24px;
  --lightbox-thumb: clamp(56px, 7vh, 96px);
  --lightbox-gap: 12px;

  padding: var(--lightbox-pad);
}

/*
 * 灯箱里的一列：舞台 + 缩略图条，两块共用同一条左右边线（宽度定在这一层）。
 *
 * **整块占屏幕宽度的 80%**（2026-11-01 三改，用户口径）：原来是 `min(1560px, 94vw, …)`，
 * 1560 这个绝对上限在大屏上把窗口卡得显小，而 `100vh - 150px` 那一项在小屏上又相对偏大 ——
 * 两头都不对，因为一边是 px、一边是比例。现在两个约束都是视口：
 *   ① **80vw** —— 主约束，屏幕越宽窗口越大，占比恒定；
 *   ② `(100vh − 缩略图 − 间距 − 上下留白) × 16/9` —— 兜底：16:9 的窗口不能高过视口。
 *      扣的都是变量（缩略图随视口变化），缩略图变大时这条不会算漏。
 * 宽屏上 ① 生效（正好 80vw，上下各留 24px）；方屏 / 矮窗上 ② 生效（窗口贴满高度，占比略小于 80%）。
 * 别指望 `aspect-ratio` 和 `max-height` 互相谦让（那样高度会赢，16:9 就破了）。
 */
.lightbox__body {
  display: flex;
  flex-direction: column;
  gap: var(--lightbox-gap);
  width: min(
    80vw,
    calc(
      (100vh - var(--lightbox-thumb) - var(--lightbox-gap) - var(--lightbox-pad) * 2) * 16 / 9
    )
  );
}

.lightbox__stage {
  position: relative;
  width: 100%;
}

/*
 * 缩略图条（2026-11-01）：点一张就滑到那张，与弹窗里的缩略图同一套语义。
 * 非当前项压到 0.55 —— 暗底上「哪张是当前」靠亮度比靠描边更快读懂；
 * 当前项套一圈品牌蓝（深色主题里它是亮蓝，两套主题都看得见，不写死白色）。
 */
.lightbox__thumbs {
  display: flex;
  gap: 10px;
  justify-content: center;
  overflow-x: auto;
  scrollbar-width: none;
}

.lightbox__thumbs::-webkit-scrollbar {
  width: 0;
  height: 0;
}

/* 边长跟着视口走（见 `.lightbox` 上的 `--lightbox-thumb`），画面放大缩小时它跟着变 */
.lightbox__thumb {
  flex: none;
  width: var(--lightbox-thumb);
  height: var(--lightbox-thumb);
  padding: 0;
  border: none;
  border-radius: var(--radius-control);
  overflow: hidden;
  background-color: rgba(255, 255, 255, 0.08);
  opacity: 0.55;
  cursor: pointer;
  transition: opacity var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease);
}

.lightbox__thumb:hover {
  opacity: 0.85;
}

.lightbox__thumb--on {
  opacity: 1;
  box-shadow: 0 0 0 2px var(--color-brand);
}

.lightbox__thumb:focus-visible {
  outline: 2px solid var(--color-brand);
  outline-offset: 2px;
}

.lightbox__thumb-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 关闭：和翻页箭头同一套「深底白字浮在照片上」，只是贴在右上角 */
.lightbox__close {
  position: absolute;
  top: 18px;
  right: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  border-radius: var(--radius-pill);
  background-color: rgba(17, 24, 39, 0.45);
  color: #fff;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease);
}

.lightbox__close:hover {
  background-color: rgba(17, 24, 39, 0.68);
}

/* 进出场：遮罩淡入，舞台轻微放大归位（与弹窗开合同一个 320ms 曲线） */
.lightbox-enter-active,
.lightbox-leave-active {
  transition: opacity var(--dur-dialog) var(--ease);
}

.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;
}

.lightbox-enter-active .lightbox__stage,
.lightbox-leave-active .lightbox__stage {
  transition: transform var(--dur-dialog) var(--ease);
}

.lightbox-enter-from .lightbox__stage,
.lightbox-leave-to .lightbox__stage {
  transform: scale(0.985);
}

/* 窄容器：右侧元信息换到正文下方，左元信息、右操作 */
  /*
   * 2026-10-26 移除 720px 容器断点（原「窄容器把元信息挤到第三行」那套）：
   * 断点切换是瞬时的，无法补间 —— 宽度一变，行高就从 84 跳到 125，怎么调过渡都会有一下「顿」。
   * 现在行在任何宽度都保持同一套栅格，只压缩列宽、不改行高，滚动条缩放全程平滑。
   * 代价：窄窗口（< 720）正文列会偏窄，这是桌面优先的取舍。
   */

</style>
