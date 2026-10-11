<script setup lang="ts">
/**
 * 演示模式布局：顶栏是「演示模式」标识 + 前台三个入口（任务 / 回收站 / 个人中心）+ 注册 / 登录按钮，
 * 不给后台入口——后台不参与演示模式（见 8.6）。
 */
import { RouterLink, RouterView } from 'vue-router'
import ThemeToggle from '@/components/ThemeToggle.vue'
</script>

<template>
  <div class="layout">
    <header class="topbar">
      <div class="topbar__inner">
        <RouterLink class="brand" to="/demo">To_Done</RouterLink>
        <span class="badge">演示模式</span>
        <nav class="nav" aria-label="演示模式导航">
          <RouterLink class="nav__link" to="/demo">任务</RouterLink>
          <RouterLink class="nav__link" to="/demo/trash">回收站</RouterLink>
          <RouterLink class="nav__link" to="/demo/profile">个人中心</RouterLink>
        </nav>
        <span class="spacer"></span>
        <ThemeToggle />
        <RouterLink to="/register">
          <el-button size="small">注册</el-button>
        </RouterLink>
        <RouterLink to="/login">
          <el-button size="small" type="primary">登录</el-button>
        </RouterLink>
      </div>
    </header>
    <main class="layout__main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  background-color: var(--color-bg);
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
}

.topbar__inner {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: var(--content-width);
  height: 56px;
  margin: 0 auto;
  /* 与 .page 的左右内边距一致，顶栏文字才和内容左边缘对齐 */
  padding: 0 clamp(16px, 2.5vw, 40px);
}

.brand {
  font-size: 15px;
  font-weight: 600;
}

/* 演示模式徽章与优先级标签同属「胶囊」这一档 */
.badge {
  padding: 2px 10px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-pill);
  font-size: 12px;
  color: var(--color-text-2);
}

.nav {
  display: flex;
  gap: 16px;
  margin-left: 8px;
}

.nav__link {
  font-size: 14px;
  color: var(--color-text-2);
  transition: color var(--dur-fast) var(--ease);
}

.nav__link:hover {
  color: var(--color-text);
}

/* /demo 是另外两个入口的前缀，所以这里用 exact-active，避免「任务」在任何演示页都高亮 */
.nav__link.router-link-exact-active {
  color: var(--color-text);
  font-weight: 500;
}

.spacer {
  flex: 1;
}

@media (max-width: 720px) {
  .topbar__inner {
    padding: 0 16px;
  }

  .badge {
    display: none;
  }
}
</style>
