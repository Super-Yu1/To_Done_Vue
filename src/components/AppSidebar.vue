<script setup lang="ts">
/**
 * 前台侧边栏（2026-10-16 起替代原顶栏，前台与演示模式共用）：
 * 顶部品牌（logo + 名字 [+ 演示模式徽章]）、中部主导航、底部设置区（插槽给）。
 *
 * 响应式只有两态，不做抽屉：>1024px 固定贴左满高；≤1024px 收回成一条顶部横条
 * （品牌在左、导航横排、设置靠右）—— 窄屏上横排比抽屉更好用，也省掉遮罩 / Esc / 焦点那一套。
 * 宽度走全局变量 `--sidebar-width`，布局骨架（`.app-layout`）用它让位，改宽度只改一处。
 *
 * 选中态（2026-10-18）：导航背后放一块白色「浮块」（indicator），切页时在三个入口之间滑过去，
 * 比每个链接各自亮一下更能看清「我从哪来、到哪去」。窄屏横排时浮块隐藏，回到链接自身白底。
 */
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import type { IconName } from './icons'
import AppIcon from './AppIcon.vue'

const props = withDefaults(
  defineProps<{
    /** 主导航项；`badge` 给数字徽标（如「任务」的未完成条数），没有就不渲染 */
    items: { to: string; label: string; icon: IconName; exact?: boolean; badge?: number }[]
    /** 折叠成图标条（2026-10-26）：只留图标与头像，宽度收到 76px */
    collapsed?: boolean
    brandTo: string
    /** 品牌后面的小徽章（演示模式 / 后台） */
    brandSuffix?: string
    /** 导航上方的分组小标题（2026-10-30）：前台是「工作台」，后台传「管理」 */
    sectionTitle?: string
  }>(),
  { sectionTitle: '工作台' },
)

const route = useRoute()

/** 路径归一：去掉末尾斜杠，根路径保持 `/` */
function normalize(path: string): string {
  const trimmed = path.replace(/\/+$/, '')
  return trimmed || '/'
}

/**
 * 当前激活项索引：与 RouterLink 的判定保持一致 ——
 * exact 项要求路径完全相等（`/demo` 不会在 `/demo/trash` 上高亮），其余允许前缀。
 */
const activeIndex = computed(() => {
  const path = normalize(route.path)
  return props.items.findIndex((item) => {
    const target = normalize(item.to)
    if (item.exact) return path === target
    return path === target || path.startsWith(`${target}/`)
  })
})

const navRef = ref<HTMLElement | null>(null)
/** 链接元素按渲染顺序收集；普通数组即可，不需要参与响应式 */
const linkEls: HTMLElement[] = []
/** 浮块位置（相对 nav 容器） */
const indicator = reactive({ top: 0, left: 0, width: 0, height: 0, visible: false })
/** 首帧先摆好位置再打开过渡，避免从 (0,0) 滑入 */
const indicatorReady = ref(false)

function setLinkRef(el: unknown, index: number) {
  // RouterLink 是组件，模板 ref 拿到的是组件实例，真正的 <a> 在 $el 上
  const node =
    el instanceof HTMLElement ? el : (el as { $el?: unknown } | null)?.$el
  if (node instanceof HTMLElement) linkEls[index] = node
}

async function updateIndicator() {
  // 等 active 类落到 DOM 上再量尺寸（字重变化会影响文字宽度）
  await nextTick()
  const link = linkEls[activeIndex.value]
  if (!link) {
    indicator.visible = false
    return
  }
  indicator.top = link.offsetTop
  indicator.left = link.offsetLeft
  indicator.width = link.offsetWidth
  indicator.height = link.offsetHeight
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

watch(activeIndex, () => void updateIndicator())

/** 横排 / 竖排切换时重置过渡：布局变了，别让浮块从旧坐标滑过去 */
let compactMedia: MediaQueryList | undefined
function handleLayoutChange() {
  indicatorReady.value = false
  void updateIndicator()
}

let navObserver: ResizeObserver | undefined

onMounted(() => {
  compactMedia = window.matchMedia('(max-width: 1024px)')
  compactMedia.addEventListener('change', handleLayoutChange)
  if (navRef.value) {
    navObserver = new ResizeObserver(() => void updateIndicator())
    navObserver.observe(navRef.value)
  }
  void updateIndicator()
})

onUnmounted(() => {
  compactMedia?.removeEventListener('change', handleLayoutChange)
  navObserver?.disconnect()
})
</script>

<template>
  <aside class="sidebar" :class="{ 'sidebar--collapsed': collapsed }">
    <div class="sidebar__top">
      <RouterLink class="sidebar__brand" :to="brandTo">
        <img class="sidebar__logo" src="/logo.svg" alt="" width="26" height="26" />
        <span class="sidebar__name">To_Done</span>
      </RouterLink>
      <span v-if="brandSuffix" class="sidebar__badge">{{ brandSuffix }}</span>
    </div>

    <p class="sidebar__section" aria-hidden="true">{{ sectionTitle }}</p>

    <nav ref="navRef" class="sidebar__nav" aria-label="主导航">
      <!-- 选中态的白色浮块：位置由 JS 量当前链接得出，切页时滑过去 -->
      <span
        class="sidebar__indicator"
        :class="{ 'sidebar__indicator--ready': indicatorReady }"
        :style="indicatorStyle"
        aria-hidden="true"
      />

      <RouterLink
        v-for="(item, index) in items"
        :key="item.to"
        :ref="(el) => setLinkRef(el, index)"
        class="sidebar__link"
        :class="{ 'sidebar__link--exact': item.exact }"
        :to="item.to"
      >
        <AppIcon class="sidebar__link-icon" :name="item.icon" :size="20" />
        <span class="sidebar__link-text">{{ item.label }}</span>
        <!-- 数字徽标：0 与「没有数据」都不渲染，避免挂一个空胶囊 -->
        <span v-if="item.badge" class="sidebar__count" aria-hidden="true">{{ item.badge }}</span>
      </RouterLink>
    </nav>

    <div class="sidebar__settings">
      <slot name="settings" />
    </div>
  </aside>
</template>

<style scoped>
/*
 * 悬浮的液态玻璃面板（2026-10-26）：半透明白 + 24px 模糊 + 24px 大圆角 + 一线白边 + 一层淡落影。
 * 它是外壳的 **flex 子项**（不再是 `position: fixed` 贴边）：四周留白由外壳的 padding 给，
 * 高度用 `align-self: stretch` 撑满外壳内容高（= 100vh − 2×24px，不用写死 calc），
 * 内容多了自己内部滚动，不带动整页。
 */
.sidebar {
  position: relative;
  align-self: stretch;
  flex: none;
  display: flex;
  flex-direction: column;
  width: var(--sidebar-width);
  /*
   * 折叠 / 展开（2026-10-26）：时长拉到 280ms 并用「先快后慢」的缓出曲线 ——
   * 原先是通用 200ms + 通用曲线，收尾太急，看起来像被掐断。
   * 2026-10-29：内边距（14 → 10）也跟着走同一条曲线，面板收窄时内容不会先跳一下。
   */
  transition:
    width 280ms cubic-bezier(0.22, 1, 0.36, 1),
    padding 280ms cubic-bezier(0.22, 1, 0.36, 1);
  overflow-y: auto;
  /* 内容过多时能滚，但别在玻璃面板上压一根系统灰滚动条（与内容区同一套做法） */
  scrollbar-width: none;
  padding: 18px 14px 14px;
  border: 1px solid var(--glass-panel-border);
  border-radius: var(--radius-panel);
  background-color: var(--glass-panel-bg);
  backdrop-filter: var(--glass-panel-blur);
  box-shadow: var(--glass-panel-shadow);
}

/* 折叠态：只留图标、宽度 76px，导航居中，白色选中浮块隐藏（位置靠 JS 量，收窄后不重算） */
.sidebar--collapsed {
  width: 76px;
  padding-left: 10px;
  padding-right: 10px;
}

/*
 * 折叠后不占位的：只有演示模式徽章还走 display: none（演示布局从不折叠，留着是兜底）。
 * 其余几块（分组标题 / 计数 / 文字 / 浮块）都改成可过渡的写法 —— 见下面的分块说明。
 */
.sidebar--collapsed .sidebar__badge {
  display: none;
}

/*
 * 文字类内容（2026-10-29 重做）：收的宽度用 **grid 轨道的 1fr → 0fr**，不用 `max-width`。
 * `max-width` 在展开态是 `none`，`none → 0` 不能插值（离散属性，落到一半才翻转），
 * 所以原来无论是收还是放，文字宽度都是「跳」的；`minmax(0, 0fr)` 能一路插值到 0，
 * 与侧栏 280ms 的宽度动画同一个节拍，图标也不会被突然出现的文字顶一下。
 */
.sidebar__name,
.sidebar__link-text {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  overflow: hidden;
  white-space: nowrap;
  transition:
    grid-template-columns 280ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 160ms var(--ease);
}

.sidebar--collapsed .sidebar__name,
.sidebar--collapsed .sidebar__link-text {
  grid-template-columns: minmax(0, 0fr);
  opacity: 0;
}

/*
 * 折叠态「图标落在中线」（2026-10-29 改法）：不再靠 `justify-content: center`（不能过渡，
 * 一换就跳 8px），改成**把左内边距推到 20** —— 内容宽 56、图标 16，20 + 16 + 20 正好居中。
 * 内边距本身可过渡（见下方 .sidebar__link 的 transition），图标就在 12 → 20 之间滑过去，
 * 与文字收窄同时发生；gap 也从 12 收到 0（文字宽度归零后那截缝隙会把图标顶偏，实测偏 6px）。
 */
.sidebar--collapsed .sidebar__link {
  gap: 0;
  /* 内容宽 54（76 − 2×10 内边距 − 2 描边），导航图标 20 → (54 − 20) / 2 = 17 才落在中线 */
  padding-left: 17px;
  padding-right: 0;
}

/*
 * 折叠态的 logo 也改成「滑到中线」，不再用 `width: 100% + justify-content: center`：
 * 那两个属性都是瞬切 —— 类名一换，品牌块当场变成整行宽、logo 被推到行中央（实测 25 → 94.5），
 * 再随着面板收窄滑回来，看着就是跳一下。
 * 现在只推 2px 左内边距：折叠态品牌区从 21 起、logo 30 宽、浮岛中线在 38 → 21 + 2 + 15 = 38。
 */
.sidebar--collapsed .sidebar__brand {
  gap: 0;
  padding-left: 2px;
}

/*
 * 分组标题「工作台」：`display: none` 会让导航整块瞬间上移 27px（这是最显眼的一跳）。
 * 改成 max-height + padding + opacity 三者一起收 —— 高度是连续下去的，导航跟着缓缓上移。
 */
.sidebar__section {
  overflow: hidden;
  /* 自然高 = 行高 18.4 + 下留白 8 = 26（量过），取 28 留 2px 余量，别把字裁掉 */
  max-height: 28px;
  transition:
    max-height 280ms cubic-bezier(0.22, 1, 0.36, 1),
    padding 280ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 160ms var(--ease);
}

.sidebar--collapsed .sidebar__section {
  max-height: 0;
  padding-bottom: 0;
  opacity: 0;
}

/* 计数徽标：宽度 / 内边距 / 透明度一起收，贴在右端的数字才是缩回去而不是凭空消失 */
.sidebar__count {
  overflow: hidden;
  max-width: 64px;
  transition:
    max-width 280ms cubic-bezier(0.22, 1, 0.36, 1),
    padding 280ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 160ms var(--ease);
}

.sidebar--collapsed .sidebar__count {
  min-width: 0;
  max-width: 0;
  padding-left: 0;
  padding-right: 0;
  opacity: 0;
}

/*
 * 选中浮块仍然是直接撤掉，不做淡出：它的 opacity 是 JS 写在行内样式上的（位置/尺寸一起给），
 * 外面压不过；而且它消失的那一刻，选中项自己铺的白玻璃正好在同一条矩形上，白对白看不出来。
 */
.sidebar--collapsed .sidebar__indicator {
  display: none;
}

/* 折叠态没有浮块可依赖：选中项自己铺一层白玻璃（特异性压过基础规则的 transparent） */
.sidebar--collapsed .sidebar__link.router-link-active:not(.sidebar__link--exact),
.sidebar--collapsed .sidebar__link--exact.router-link-exact-active {
  background-color: rgba(255, 255, 255, 0.72);
}

html.dark .sidebar--collapsed .sidebar__link.router-link-active:not(.sidebar__link--exact),
html.dark .sidebar--collapsed .sidebar__link--exact.router-link-exact-active {
  background-color: rgba(255, 255, 255, 0.12);
}

.sidebar::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.sidebar__top {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 10px 24px;
}

.sidebar__brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  /* 折叠时 gap 与文字一起收（10 → 0），logo 不会被那截缝隙顶偏；左内边距 0 → 2 让 logo 落到中线 */
  transition:
    gap 280ms cubic-bezier(0.22, 1, 0.36, 1),
    padding 280ms cubic-bezier(0.22, 1, 0.36, 1);
}

.sidebar__logo {
  display: block;
  width: 30px;
  height: 30px;
  /* 品牌圆在玻璃上会显得发灰，给它一层极淡的白光托一下 */
  filter: drop-shadow(0 2px 6px rgba(47, 75, 255, 0.18));
}

/* 品牌要压得住下面的导航：字号只比导航大一档，靠字重和收紧的字距拉层级 */
.sidebar__name {
  font-size: 18px;
  font-weight: 650;
  letter-spacing: -0.015em;
}

/* 分组小标题：Apple 侧栏的分区标签，11.5px / 600 / 拉开字距，只做分组不抢视线 */
.sidebar__section {
  padding: 0 12px 8px;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--color-text-3);
}

/* 演示模式徽章与优先级胶囊同属「胶囊」这一档 */
.sidebar__badge {
  padding: 1px 8px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-pill);
  font-size: 11px;
  color: var(--color-text-2);
}

/* 紧凑成一组：4px 间距让几个入口读成「一块控件」，而不是一条条列表 */
.sidebar__nav {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/*
 * 选中浮块（2026-10-27 三改）：不再染品牌色，改成一枚**白色玻璃小块** ——
 * 8% 白 + 一圈内高光 + 一层薄影，像一块被光擦过的塑料片浮在面板上；
 * 品牌色只留给图标和计数，选中态才不会糊成一片浅蓝。
 * 位置、宽高由 inline style 给出；首帧不加过渡（--ready 才打开）。
 */
.sidebar__indicator {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 0;
  border-radius: var(--radius-control);
  background-color: rgba(255, 255, 255, 0.78);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.95), inset 0 0 0 1px rgba(255, 255, 255, 0.5),
    0 6px 16px -10px rgba(24, 36, 74, 0.45);
  pointer-events: none;
}

html.dark .sidebar__indicator {
  background-color: rgba(255, 255, 255, 0.12);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18), inset 0 0 0 1px rgba(255, 255, 255, 0.08),
    0 6px 16px -10px rgba(0, 0, 0, 0.7);
}

.sidebar__indicator--ready {
  transition:
    transform 320ms var(--ease),
    width 320ms var(--ease),
    height 320ms var(--ease),
    opacity var(--dur-base) var(--ease);
}

/*
 * 主导航项（2026-10-28 放大）：定高 48px，16px 字号、20px 图标 ——
 * 与任务卡的 17px 标题同一视觉密度，整块侧栏才像 macOS 的 source list。
 * 按下即变色（pointer-down），不等 click。
 */
.sidebar__link {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  height: 48px;
  padding: 0 12px;
  border-radius: var(--radius-control);
  font-size: 16px;
  color: var(--color-text-2);
  /* 2026-10-29：gap 与左内边距跟折叠动画同一条曲线（见 .sidebar--collapsed .sidebar__link） */
  transition:
    color var(--dur-fast) var(--ease),
    background-color var(--dur-fast) var(--ease),
    gap 280ms cubic-bezier(0.22, 1, 0.36, 1),
    padding 280ms cubic-bezier(0.22, 1, 0.36, 1);
}

.sidebar__link:active {
  transform: scale(0.985);
}

.sidebar__link-icon {
  flex: none;
}

.sidebar__link-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 数字徽标：贴在链接右端，品牌浅蓝的极淡底 + 品牌墨色字；表格式数字不抖动 */
.sidebar__count {
  flex: none;
  min-width: 22px;
  margin-left: auto;
  padding: 1px 7px;
  border-radius: var(--radius-pill);
  background-color: color-mix(in srgb, var(--color-brand) 18%, transparent);
  color: var(--color-brand-ink);
  font-size: 12.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1.6;
  text-align: center;
}

/* 未选中项的悬停底：一层很淡的白光，不抢浮块的「已选中」视觉 */
.sidebar__link:hover {
  color: var(--color-text);
  background-color: rgba(255, 255, 255, 0.34);
}

html.dark .sidebar__link:hover {
  background-color: rgba(255, 255, 255, 0.06);
}

/*
 * 高亮当前页：底色交给白色浮块，文字回到正文色、图标转品牌色 ——
 * 选中项在整列里「更黑」而不是「更蓝」，与 Apple 侧栏的读法一致。
 * 演示模式的「任务」用 exact（/demo 是另外两个入口的前缀）。
 */
.sidebar__link.router-link-active:not(.sidebar__link--exact),
.sidebar__link--exact.router-link-exact-active {
  color: var(--color-text);
  font-weight: 650;
  background-color: transparent;
}

.sidebar__link.router-link-active .sidebar__link-icon,
.sidebar__link--exact.router-link-exact-active .sidebar__link-icon {
  color: var(--color-brand-ink);
}

.sidebar__link.router-link-active:hover:not(.sidebar__link--exact),
.sidebar__link--exact.router-link-exact-active:hover {
  background-color: transparent;
}

/*
 * 底部设置区：`margin-top: auto` 把它压到最底，与上面的导航之间用一条发丝分割线分开
 * （2026-10-26 明确成「一条线」而不是靠留白）—— 导航三项与「主题 / 退出」是两种东西，不该连成一片。
 * 玻璃上的分割线用墨色兑水（白色线在玻璃上看不见）。
 */
.sidebar__settings {
  display: grid;
  gap: 8px;
  margin-top: auto;
  padding-top: 14px;
  border-top: 1px solid var(--separator);
}

/* 窄屏：整条收回成顶部横条（品牌左、导航中、设置右） */
  /* 2026-10-26：移除「窄屏把侧栏改成顶部横条」的规则 —— 侧栏在任何宽度都留在左侧，窄屏靠自动折叠解决 */

</style>
