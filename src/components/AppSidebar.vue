<script setup lang="ts">
/**
 * 前台侧边栏（2026-10-16 起替代原顶栏，前台与演示模式共用）：
 * 顶部品牌（logo + 名字 [+ 演示模式徽章]）、中部主导航、底部设置区（插槽给）。
 *
 * 响应式只有两态，不做抽屉：>1024px 固定 224px 贴左满高；≤1024px 收回成一条顶部横条
 * （品牌在左、导航横排、设置靠右）—— 窄屏上横排比抽屉更好用，也省掉遮罩 / Esc / 焦点那一套。
 * 宽度走全局变量 `--sidebar-width`，布局骨架（`.app-layout`）用它让位，改宽度只改一处。
 */
import { RouterLink } from 'vue-router'
import type { IconName } from './icons'
import AppIcon from './AppIcon.vue'

defineProps<{
  items: { to: string; label: string; icon: IconName; exact?: boolean }[]
  brandTo: string
  /** 品牌后面的小徽章（演示模式） */
  brandSuffix?: string
}>()
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

    <nav class="sidebar__nav" aria-label="主导航">
      <RouterLink
        v-for="item in items"
        :key="item.to"
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
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  width: var(--sidebar-width);
  padding: 20px 14px 14px;
  border-right: 1px solid var(--color-border);
  background-color: var(--color-bg);
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
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar__link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: var(--radius-md);
  font-size: 14px;
  color: var(--color-text-2);
  transition: color var(--dur-fast) var(--ease), background-color var(--dur-fast) var(--ease);
}

.sidebar__link:hover {
  color: var(--color-text);
  background-color: var(--color-hover);
}

/* 高亮当前页；演示模式的「任务」用 exact（/demo 是另外两个入口的前缀，否则它会一直高亮） */
.sidebar__link.router-link-active:not(.sidebar__link--exact),
.sidebar__link--exact.router-link-exact-active {
  color: var(--color-text);
  font-weight: 500;
  background-color: var(--color-hover);
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
  .sidebar {
    position: static;
    flex-direction: row;
    align-items: center;
    gap: 14px;
    width: auto;
    height: auto;
    padding: 10px clamp(16px, 2.5vw, 40px);
    border-right: none;
    border-bottom: 1px solid var(--color-border);
  }

  .sidebar__top {
    padding: 0;
  }

  .sidebar__nav {
    flex-direction: row;
    gap: 4px;
  }

  .sidebar__link {
    padding: 7px 10px;
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
