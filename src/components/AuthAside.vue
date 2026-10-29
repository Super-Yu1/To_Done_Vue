<script setup lang="ts">
/**
 * 认证页左栏（注册 / 登录共用，2026-10-16 从 RegisterView 抽出来）：
 * 主张 + 场景标签 + [可交互的示例清单] + 动态提示 + 三条产品说明。
 * 抽成组件的原因很直接 —— 两个页面要用同一套东西，写两份迟早会长歪（改一处忘一处）。
 *
 * 示例清单是**真的能点**：点勾选圈完成 / 取消完成，与演示模式里那套动作一致 ——
 * 先只划掉这一行、等线划完再换位（`readStrikeMs` 定时机），换位走 `-move` 的 transform 过渡。
 * 数据只在这个组件实例的内存里：不落库、不请求后端，刷新即还原。
 *
 * 彩蛋（2026-10-16 加）：六条全划掉时，左栏里炸开一簇粒子、光晕闪一次，提示文案换成庆祝语。
 * 三条底线：只在左栏内（不遮右侧表单）、`pointer-events: none`（不挡点击）、
 * 动画结束后整层 DOM 销毁（`bursts` 清空 + 计时器在卸载时清掉）。
 */
import { computed, onUnmounted, ref } from 'vue'
import AppIcon from './AppIcon.vue'
import AppTooltip from './AppTooltip.vue'
import ConfettiLayer from './ConfettiLayer.vue'
import { TASK_PRIORITY_CLASS, TASK_PRIORITY_LABEL } from '@/constants'
import { readStrikeMs, sleep } from '@/utils/timing'
import type { TaskPriority } from '@/types'

/**
 * 文案的默认值是两页共用的那一套（价值词 + 互动引导 + 庆祝语）；
 * 只有 `lead`（主张）按场景各写一句，需要时也可以把其余三个 prop 传进来覆盖。
 */
const props = withDefaults(
  defineProps<{
    /** 主张：注册页讲「要做什么」，登录页讲「回来做什么」 */
    lead: string
    /** 价值词行：四个动作/状态词，替代原来那串「邮箱登录 · 任务配图 · …」的功能清单 */
    sub?: string
    /** 还没动过时那句互动引导 */
    tip?: string
    /** 全部划掉后的庆祝文案 */
    doneTip?: string
  }>(),
  {
    sub: '记录 · 规划 · 执行 · 清空',
    tip: '点击圆圈试试，全部划掉有惊喜哦。',
    doneTip: '太棒了！你已经掌握了划掉任务的快乐。',
  },
)

interface PreviewTask {
  id: string
  title: string
  priority: TaskPriority
  done: boolean
  /** 完成时间（毫秒）：只用来决定它在「已完成」那一段里的位置 */
  completedAt: number
}

/**
 * 真实内容、不用占位词；五条（2026-10-16 从六条收到五条）——
 * 加了品牌块之后左栏更高了，收一条才能让「主张的顶」与右侧卡片顶对齐、整页也不出现滚动。
 * 默认预置两条已完成（末尾那两条，`completedAt` 决定它们在已完成段里的先后）——
 * 一上来就看得见「划掉是什么样」，剩下三条留给用户点（点完即触发彩蛋）。
 */
const items = ref<PreviewTask[]>([
  { id: 'p1', title: '把设计评审的意见回写进文档', priority: 'MEDIUM', done: false, completedAt: 0 },
  { id: 'p2', title: '周五前定下配图的顺序', priority: 'HIGH', done: false, completedAt: 0 },
  { id: 'p4', title: '把季度目标拆成这周能做的三件事', priority: 'MEDIUM', done: false, completedAt: 0 },
  { id: 'p5', title: '整理这周的会议记录', priority: 'LOW', done: true, completedAt: 1 },
  { id: 'p6', title: '把上个月的归档收个尾', priority: 'LOW', done: true, completedAt: 2 },
])

/** 与列表同一条排序规则：未完成在前（保持原顺序），已完成在后（最近完成的靠前） */
const ordered = ref<PreviewTask[]>([])

function rebuild() {
  ordered.value = [
    ...items.value.filter((task) => !task.done),
    ...items.value.filter((task) => task.done).sort((a, b) => b.completedAt - a.completedAt),
  ]
}

rebuild()

const doneCount = computed(() => items.value.filter((task) => task.done).length)
const allDone = computed(() => doneCount.value === items.value.length)

/** 用户是否动过手：默认那两条已完成是预置的，所以「没动过」不能拿 doneCount 判断 */
const touched = ref(false)

/** 提示文案三态：没动过（邀请）→ 还剩 N 个 → 全划掉。都控制在一行内，避免换行把左栏高度顶变 */
const tipText = computed(() => {
  if (allDone.value) return props.doneTip
  if (!touched.value) return props.tip
  return `还剩 ${items.value.length - doneCount.value} 个任务…`
})

/**
 * 底部的三条说明：统一成「四字小标题 + 冒号 + 一句话」的格式，读起来是一组而不是三句散文。
 * 三条都必须是本产品真实成立的事：不写「云端同步」这类没有的能力，
 * 也不提「管理员」（用户可见的界面上不暴露后台的存在，2026-10-16 定）。
 * 采用「小圆环 + 勾」的图标而不是裸勾号 —— 勾号单独放着显得单薄。
 * 句尾不加句号（2026-10-27 定）：三条并排时更像标签，加了句号反而显得在念报告。
 */
const features = [
  '免登录先逛：演示模式，即刻体验全部功能',
  '专属空间：你的清单与记录，仅你可见',
  '高效整理：支持多重划分，批量操作更省心',
]

/* ---------- 彩蛋 ---------- */

/** 光晕的呼吸时长（粒子由 ConfettiLayer 自己收尾，这里只管光晕这一层） */
const HALO_MS = 900
/** 连点保护：这段时间内再触发，只换文案不再放烟花 */
const COOLDOWN_MS = 1200

const confetti = ref<InstanceType<typeof ConfettiLayer> | null>(null)
const celebrating = ref(false)

const timers: number[] = []
function later(fn: () => void, ms: number) {
  timers.push(window.setTimeout(fn, ms))
}

onUnmounted(() => {
  timers.forEach((id) => window.clearTimeout(id))
  timers.length = 0
})

let lastCelebrateAt = 0

/**
 * 放彩蛋：粒子交给 `ConfettiLayer`（认证页与演示模式共用那一个），
 * 这里只负责光晕与冷却；第二次及以后规模减小（5 簇），避免连点刷屏。
 */
function celebrate() {
  const now = Date.now()
  const withinCooldown = now - lastCelebrateAt < COOLDOWN_MS
  const repeat = lastCelebrateAt > 0
  lastCelebrateAt = now

  if (withinCooldown) return

  confetti.value?.fire(repeat ? 5 : 8)
  celebrating.value = true
  later(() => {
    celebrating.value = false
  }, HALO_MS)
}

/**
 * 点勾选圈：先只改这一行的状态（线先划出来、位置不动），等线划完再重排 ——
 * 与 stores/todo 里 changeStatus 的两步走完全一个节奏（同用 readStrikeMs 定时机）。
 * 划掉最后一条时立刻放彩蛋（烟花不等划线，视觉上更跟手）。
 */
async function togglePreview(task: PreviewTask) {
  touched.value = true
  const nextDone = !task.done
  task.done = nextDone
  task.completedAt = nextDone ? Date.now() : 0

  if (nextDone && items.value.every((item) => item.done)) {
    celebrate()
  }

  await sleep(readStrikeMs())
  rebuild()
}
</script>

<template>
  <div class="aside" :class="{ 'aside--celebrating': celebrating }">
    <!-- 背景呼吸：一圈极淡的绿光，600ms 一闪而过；外面那层 `overflow: hidden` 负责把它裁在内容盒内 -->
    <span class="aside__glow" aria-hidden="true">
      <span class="aside__halo" />
    </span>

    <!-- 粒子层：自带裁剪（粒子飞不出去）、pointer-events: none，动画结束整层销毁 -->
    <ConfettiLayer ref="confetti" />

    <!--
      品牌组合：图标（44px，是顶栏那颗的两倍）+ 名字 + 副标语。
      它跟着内容一起垂直居中；左边缘**不与标题同线**，而是右移 25px 去对齐下面每一行的勾选圈
      （logo 与勾选圈落在同一条垂直线上，见 `--aside-check-rail`）。
    -->
    <div class="aside__brand">
      <img class="aside__brand-logo" src="/logo.svg" alt="" width="44" height="44" />
      <div class="aside__brand-text">
        <p class="aside__brand-name">To_Done</p>
        <p class="aside__brand-slogan">极简待办 · 高效生活</p>
      </div>
    </div>

    <p class="aside__lead">{{ lead }}</p>
    <p class="aside__sub">{{ sub }}</p>

    <!--
      可以真的点：示例任务用的是这个组件自己的内存态（不落库）。
      既然可交互，就不对读屏隐藏 —— 勾选圈是带 aria-pressed 的按钮。
    -->
    <TransitionGroup
      tag="ul"
      class="aside__list"
      name="sample"
      aria-label="示例任务：点勾选圈即可完成"
    >
      <li
        v-for="item in ordered"
        :key="item.id"
        class="sample-row"
        :class="{ 'sample-row--done': item.done }"
      >
        <AppTooltip
          :content="item.done ? '标记为未完成' : '标记为已完成'"
          placement="top"
        >
          <button
            class="sample-row__check"
            type="button"
            :aria-pressed="item.done"
            :aria-label="`${item.done ? '标记为未完成' : '标记为已完成'}：${item.title}`"
            @mousedown.prevent
            @click="togglePreview(item)"
          >
            <span class="sample-row__check-ring">
              <AppIcon name="check" :size="13" />
            </span>
          </button>
        </AppTooltip>
        <span class="sample-row__title">{{ item.title }}</span>
        <span class="prio" :class="TASK_PRIORITY_CLASS[item.priority]">
          <span
            class="prio__dot"
            :class="{ 'prio__dot--hollow': item.priority !== 'HIGH' }"
            aria-hidden="true"
          />
          {{ TASK_PRIORITY_LABEL[item.priority] }}
        </span>
      </li>
    </TransitionGroup>

    <!-- 提示随勾选进度换文案：淡出淡入，全划掉时转成完成色 -->
    <Transition name="tip" mode="out-in">
      <p
        :key="tipText"
        class="aside__tip"
        :class="{ 'aside__tip--done': allDone }"
        aria-live="polite"
      >
        <AppIcon v-if="allDone" class="aside__tip-icon" name="sparkle" :size="13" />
        {{ tipText }}
      </p>
    </Transition>

    <ul class="aside__features">
      <li v-for="text in features" :key="text" class="aside__feature">
        <span class="aside__feature-mark" aria-hidden="true">
          <AppIcon name="check" :size="11" />
        </span>
        <span>{{ text }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
/* 宽度交给外壳的 aside-inner（460px）收口 */
.aside {
  position: relative;
  width: 100%;
  /*
   * 「勾选圈轨」的横向位置 = 行边框 1 + 行内边距 22 +（34 命中区 − 28 圆环）/ 2 = 26px。
   * 行内边距若改了（现在是 22px，各断点只收纵向），这里要跟着改。
   */
  --aside-check-rail: 26px;
  /*
   * logo.svg 是 1024 的方形画布，里头那颗蓝圆直径 660.9（占画布 0.645），
   * 44px 尺寸下四周各留 ~7.8px 透明边。眼睛认的是蓝圆而不是画布，
   * 所以品牌块的内边距得把这段留白扣掉，蓝圆才和勾选圈真正落在同一条垂直线上。
   */
  --aside-brand-inset: 7.8px;
}

/*
 * 品牌组合：图标 44px（顶栏那颗的两倍）+ 名字 + 副标语一字排开。
 * 名字用正文色 + 700，是这一栏里除主张外最重的一块；副标语压到 12px 浅灰，只做层次不抢戏。
 * 左内边距把品牌块推到「勾选圈轨」上，再扣掉 logo 画布自带的 7.8px 透明边 ——
 * 落线的是 logo 里那颗蓝圆，不是 44px 的外框（`26 − 7.8 = 18.2px`）。
 */
.aside__brand {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-left: calc(var(--aside-check-rail) - var(--aside-brand-inset));
}

.aside__brand-logo {
  display: block;
  flex: none;
  width: 44px;
  height: 44px;
}

.aside__brand-name {
  font-size: 19px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.01em;
  color: var(--color-text);
}

.aside__brand-slogan {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.2;
  color: var(--color-text-3);
}

/* 品牌与主张之间留出呼吸感：标题的顶正好落在右侧卡片顶附近（见 CHANGELOG 实测） */
.aside__lead {
  margin-top: 36px;
  font-size: 32px;
  line-height: 1.4;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.aside__sub {
  margin-top: 10px;
  font-size: 14px;
  color: var(--color-text-2);
}

/* 与上方标签行之间留够距离，卡片之间也别挤在一起 */
.aside__list {
  display: grid;
  gap: 14px;
  margin: 28px 0 0;
  padding: 0;
  list-style: none;
}

/*
 * 换位动画：与任务列表同一套（只动 transform、不走 height）——
 * 勾选后那条划线播完落到「已完成」段，取消完成时也会滑回上面。
 * 只声明 -move：示例条数恒为 6，不会有新增 / 移除。
 */
.sample-move {
  transition: transform var(--dur-base) var(--ease);
}

/* 提示：三态之间淡出淡入；全划掉时转成完成色 + 稍大一档 */
.aside__tip {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--color-text-2);
}

.aside__tip--done {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-status-done);
}

.aside__tip-icon {
  flex: none;
}

.tip-enter-active,
.tip-leave-active {
  transition: opacity var(--dur-fast) var(--ease);
}

.tip-enter-from,
.tip-leave-to {
  opacity: 0;
}

/* 光晕的裁剪层：比内容盒大一圈，但光晕再大也只到这里为止（不越到右侧表单上） */
.aside__glow {
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow: hidden;
  pointer-events: none;
}

/* 背景呼吸：一圈极淡的绿光，一闪而过 */
.aside__halo {
  position: absolute;
  inset: -48px;
  opacity: 0;
  pointer-events: none;
  background-image: radial-gradient(
    62% 52% at 50% 46%,
    color-mix(in srgb, var(--color-status-done) 20%, transparent),
    transparent 70%
  );
}

.aside--celebrating .aside__halo {
  animation: halo-breathe 850ms var(--ease);
}

@keyframes halo-breathe {
  0% {
    opacity: 0;
  }
  35% {
    opacity: 0.6;
  }
  100% {
    opacity: 0;
  }
}

/* 系统「减少动效」：装饰性动画全关，文案变化照旧（那才是有信息量的部分） */
@media (prefers-reduced-motion: reduce) {
  .aside__halo {
    display: none;
  }
}

/*
 * 与列表里的任务行同源：勾选圈 + 1fr 标题 + 优先级胶囊，20px 圆角、1px 发丝线。
 * 尺寸比真实列表行大一档（28px 圈、15px 标题、16×22 内边距）—— 认证页是"放大看产品"的场景。
 */
.sample-row {
  display: grid;
  /* 前置位 34px 是勾选按钮的命中区（内层圆环 28px，用负外边距抵消，行高不变） */
  grid-template-columns: 34px minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  /* 纵向 14px：加了品牌块之后收一点，宽屏 900px 上下仍然整页不滚动 */
  padding: 14px 22px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  background-color: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
}

/* 勾选按钮：34px 命中区包着 28px 圆环 —— 与任务列表里的勾选同一个做法 */
.sample-row__check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  /* 34 − 28 = 6，上下各收 3px，让示例行的高度与加按钮之前完全一致 */
  margin: -3px 0;
  padding: 0;
  border: none;
  border-radius: var(--radius-pill);
  background-color: transparent;
  cursor: pointer;
}

.sample-row__check-ring {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-pill);
  color: transparent;
  transition: color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease),
    background-color var(--dur-fast) var(--ease);
}

/* 悬停预览「点一下就会完成」，与任务列表里勾选圈的反馈同一套 */
.sample-row__check:hover .sample-row__check-ring {
  border-color: color-mix(in srgb, var(--color-check-bg) 55%, var(--color-check-fg));
  background-color: color-mix(in srgb, var(--color-check-bg) 14%, transparent);
  color: var(--color-check-fg);
}

.sample-row__title {
  min-width: 0;
  overflow: hidden;
  font-size: 15px;
  white-space: nowrap;
  text-overflow: ellipsis;
  /*
   * 勾选完成的横线：用 background 画线（和列表里一样），
   * 配 transition 而不是 keyframes —— 这样划出去、收回来两个方向都有过渡。
   */
  background-image: linear-gradient(currentColor, currentColor);
  background-repeat: no-repeat;
  background-position: 0 58%;
  background-size: 0 1px;
  transition: color var(--dur-strike) var(--ease), background-size var(--dur-strike) var(--ease);
}

/* 胶囊字号跟着这一档走（.prio 的基础字号是 12px，列表里用那个） */
.sample-row .prio {
  font-size: 13px;
}

/* 已完成那条：勾选圈填浅绿、勾用深墨绿，标题被划掉 */
.sample-row--done .sample-row__check-ring {
  border-color: transparent;
  background-color: var(--color-check-bg);
  color: var(--color-check-fg);
}

.sample-row--done .sample-row__title {
  color: var(--color-text-2);
  background-size: 100% 1px;
}

/* 三条说明：小勾 + 一行文字，收在示例清单下面，补足左栏高度 */
.aside__features {
  display: grid;
  gap: 10px;
  margin: 20px 0 0;
  padding: 0;
  list-style: none;
}

.aside__feature {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 14px;
  line-height: 1.65;
  color: var(--color-text-2);
}

/* 圆环里的勾：比裸勾号更像"通过了"的标记，也不会跟左侧勾选圈混淆 */
.aside__feature-mark {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 17px;
  height: 17px;
  margin-top: 2px;
  border-radius: var(--radius-pill);
  background-color: color-mix(in srgb, var(--color-status-done) 14%, transparent);
  color: var(--color-status-done);
}

/* 折行档（≤900，与外壳的折行点同一个数）：左栏折到表单上方后要短一些，只留前三条示例；优先级胶囊让位给信息密度 */
@media (max-width: 900px) {
  .aside__lead {
    font-size: 26px;
  }

  .aside__list {
    margin-top: 24px;
  }

  .aside__list .sample-row:nth-child(n + 4) {
    display: none;
  }

  .sample-row .prio {
    display: none;
  }
}

/*
 * 短屏 + 分栏（≥901px 与外壳的折行点同一个数，高度 ≤880）：横屏平板的高度就是 768–834，
 * 左栏内容 + 上下内边距会把页脚顶出首屏（实测 1180×820 整页 898、超出 78px）。
 * 这里把行内边距与几处纵向间距各收一档（合计 ~80px）—— 条数与文案都不动，
 * 示例清单照旧 5 条，彩蛋的触发条件（全部划掉）不受影响。
 */
@media (min-width: 901px) and (max-height: 880px) {
  .aside__lead {
    margin-top: 28px;
  }

  .aside__sub {
    margin-top: 8px;
  }

  .aside__list {
    gap: 10px;
    margin-top: 20px;
  }

  .sample-row {
    padding: 10px 22px;
  }

  .aside__tip {
    margin-top: 10px;
  }

  .aside__features {
    margin-top: 12px;
  }
}
</style>
