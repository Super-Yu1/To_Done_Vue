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
  items: { to: string; label: string; icon: IconName; exact?: boolean }[]
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
        <AppIcon :name="item.icon" :size="16" />
        {{ item.label }}
      </RouterLink>
    </nav>

    <div class="sidebar__settings">
      <slot name="settings" />
    </div>
  </aside>
</template>

<style scoped>
/*
 * 悬浮的液态玻璃面板（2026-10-26）：
 * 不再贴着视口左边与上下沿，而是四周各让 16px 浮起来 ——
 * 半透明白 + 24px 模糊 + 24px 大圆角 + 一线白边 + 一层几乎看不见的落影。
 */
.sidebar {
  position: fixed;
  top: var(--sidebar-offset);
  left: var(--sidebar-offset);
  bottom: var(--sidebar-offset);
  z-index: 20;
  display: flex;
  flex-direction: column;
  width: var(--sidebar-width);
  padding: 20px 14px 16px;
  border: 1px solid var(--glass-panel-border);
  border-radius: 24px;
  background-color: var(--glass-panel-bg);
  backdrop-filter: var(--glass-panel-blur);
  box-shadow: var(--glass-panel-shadow);
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

.sidebar__name {
  font-size: 15px;
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

.sidebar__nav {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 3px;
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

.sidebar__link {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  font-size: 14px;
  color: var(--color-text-2);
  transition: color var(--dur-fast) var(--ease), background-color var(--dur-fast) var(--ease);
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

/* 底部设置区：贴底、与导航用一条发丝线隔开 */
.sidebar__settings {
  display: grid;
  gap: 8px;
  margin-top: auto;
  padding-top: 14px;
  border-top: 1px solid var(--color-border);
}

/* 窄屏：整条收回成顶部横条（品牌左、导航中、设置右） */
@media (max-width: 1024px) {
  /* 窄屏：同一条玻璃只横过来，四周留出同样的 16px 悬浮间隙 */
  .sidebar {
    position: static;
    flex-direction: row;
    align-items: center;
    gap: 14px;
    width: auto;
    height: auto;
    margin: var(--sidebar-offset);
    padding: 10px clamp(16px, 2.5vw, 40px);
    border-radius: 20px;
  }

  .sidebar__top {
    padding: 0;
  }

  .sidebar__nav {
    flex-direction: row;
    gap: 4px;
  }

  /* 横排没有「上下滑动」这回事：浮块隐藏，选中项回到链接自身白底 */
  .sidebar__indicator {
    display: none;
  }

  .sidebar__link {
    padding: 7px 10px;
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
