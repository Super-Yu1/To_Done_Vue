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

const props = defineProps<{
  /** 主导航项；`badge` 给数字徽标（如「任务」的未完成条数），没有就不渲染 */
  items: { to: string; label: string; icon: IconName; exact?: boolean; badge?: number }[]
  brandTo: string
  /** 品牌后面的小徽章（演示模式） */
  brandSuffix?: string
}>()

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
  <aside class="sidebar">
    <div class="sidebar__top">
      <RouterLink class="sidebar__brand" :to="brandTo">
        <img class="sidebar__logo" src="/logo.svg" alt="" width="26" height="26" />
        <span class="sidebar__name">To_Done</span>
      </RouterLink>
      <span v-if="brandSuffix" class="sidebar__badge">{{ brandSuffix }}</span>
    </div>

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
  overflow-y: auto;
  /* 内容过多时能滚，但别在玻璃面板上压一根系统灰滚动条（与内容区同一套做法） */
  scrollbar-width: none;
  padding: 20px 14px 16px;
  border: 1px solid var(--glass-panel-border);
  border-radius: 24px;
  background-color: var(--glass-panel-bg);
  backdrop-filter: var(--glass-panel-blur);
  box-shadow: var(--glass-panel-shadow);
}

.sidebar::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.sidebar__top {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 8px 20px;
}

.sidebar__brand {
  display: inline-flex;
  align-items: center;
  gap: 9px;
}

.sidebar__logo {
  display: block;
  width: 26px;
  height: 26px;
}

/* 品牌要压得住下面的导航：导航 16px，这里 17px / 600 */
.sidebar__name {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.2px;
}

/* 演示模式徽章与优先级胶囊同属「胶囊」这一档 */
.sidebar__badge {
  padding: 1px 8px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-pill);
  font-size: 11px;
  color: var(--color-text-2);
}

/* space-y-2（8px）：三项之间留出呼吸，不像一排列表项那样挤成一条 */
.sidebar__nav {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/*
 * 浮块：选中项的半透明高亮，12px 圆角，与链接同形。
 * 位置、宽高由 inline style 给出；首帧不加过渡（--ready 才打开）。
 */
.sidebar__indicator {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 0;
  border-radius: 12px;
  background-color: color-mix(in srgb, var(--color-brand) 14%, transparent);
  pointer-events: none;
}

.sidebar__indicator--ready {
  transition:
    transform 320ms var(--ease),
    width 320ms var(--ease),
    height 320ms var(--ease),
    opacity var(--dur-base) var(--ease);
}

/*
 * 主导航项（2026-10-26 放大）：字号 16px（text-base）、图标 20px（w-5）、
 * 图标与文字 12px（gap-3）、上下 12px（py-3）—— 左侧不再显得空，点击区域也更从容。
 */
.sidebar__link {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: var(--radius-md);
  font-size: 16px;
  color: var(--color-text-2);
  transition: color var(--dur-fast) var(--ease), background-color var(--dur-fast) var(--ease);
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

/* 数字徽标：贴在链接右端，品牌色的极淡底 + 品牌色字；表格式数字不抖动 */
.sidebar__count {
  flex: none;
  min-width: 22px;
  margin-left: auto;
  padding: 1px 7px;
  border-radius: var(--radius-pill);
  background-color: color-mix(in srgb, var(--color-brand) 14%, transparent);
  color: var(--color-brand);
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1.6;
  text-align: center;
}

/* 未选中项的悬停底：品牌色的极淡一层，不抢浮块的「已选中」视觉 */
.sidebar__link:hover {
  color: var(--color-text);
  background-color: color-mix(in srgb, var(--color-brand) 6%, transparent);
}

/*
 * 高亮当前页：底色交给浮块（品牌浅蓝），文字转品牌色。
 * 演示模式的「任务」用 exact（/demo 是另外两个入口的前缀）。
 */
.sidebar__link.router-link-active:not(.sidebar__link--exact),
.sidebar__link--exact.router-link-exact-active {
  color: var(--color-brand);
  font-weight: 600;
  background-color: transparent;
}

.sidebar__link.router-link-active:hover:not(.sidebar__link--exact),
.sidebar__link--exact.router-link-exact-active:hover {
  background-color: transparent;
}

/*
 * 底部设置区：`margin-top: auto` 把它压到最底，与上面的导航之间用一条发丝分割线分开
 * （2026-10-26 明确成「一条线」而不是靠留白）—— 导航三项与「主题 / 退出」是两种东西，不该连成一片。
 */
.sidebar__settings {
  display: grid;
  gap: 8px;
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}

/* 窄屏：整条收回成顶部横条（品牌左、导航中、设置右） */
@media (max-width: 1024px) {
  /* 窄屏：同一条玻璃横过来；四周留白交给外壳，这里只补与下方内容的间距 */
  .sidebar {
    position: static;
    align-self: auto;
    flex-direction: row;
    align-items: center;
    gap: 14px;
    width: auto;
    height: auto;
    margin: 0 0 var(--sidebar-offset);
    overflow: visible;
    padding: 10px clamp(16px, 2.5vw, 40px);
    border-radius: 20px;
  }

  .sidebar__top {
    padding: 0;
  }

  .sidebar__nav {
    flex-direction: row;
    gap: 6px;
  }

  /* 横排没有「上下滑动」这回事：浮块隐藏，选中项回到链接自身白底 */
  .sidebar__indicator {
    display: none;
  }

  /* 横条里收一档：字号 15px、图标 18px、内边距 8×10，避免一行塞不下 */
  .sidebar__link {
    gap: 9px;
    padding: 8px 10px;
    font-size: 15px;
  }

  .sidebar__link-icon {
    width: 18px;
    height: 18px;
  }

  .sidebar__name {
    font-size: 16px;
  }

  .sidebar__link.router-link-active:not(.sidebar__link--exact),
  .sidebar__link--exact.router-link-exact-active {
    background-color: color-mix(in srgb, var(--color-brand) 14%, transparent);
  }

  .sidebar__settings {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 0 auto;
    padding: 0;
    border-top: none;
  }
}
</style>
