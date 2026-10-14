<script setup lang="ts">
/**
 * 认证页外壳（登录 / 注册 / 找回密码共用）：品牌 + 主题切换 + 表单（8.7 覆盖全站含认证页）。
 * 2026-10-14：新增可选的 `aside` 插槽 —— 提供了就排成左右两栏（注册页用它放「产品本体」那一列），
 * 没提供就维持原来的居中窄表单，登录 / 找回密码完全不受影响。
 */
import { RouterLink } from 'vue-router'
import ThemeToggle from './ThemeToggle.vue'

defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <div class="auth-shell">
    <header class="auth-shell__header">
      <RouterLink class="auth-shell__brand" to="/login">To_Done</RouterLink>
      <ThemeToggle />
    </header>

    <main class="auth-shell__main" :class="{ 'auth-shell__main--split': !!$slots.aside }">
      <div v-if="$slots.aside" class="auth-shell__aside">
        <slot name="aside" />
      </div>

      <section class="auth-shell__panel">
        <h1 class="page-title">{{ title }}</h1>
        <p v-if="subtitle" class="auth-shell__subtitle">{{ subtitle }}</p>
        <div class="auth-shell__form">
          <slot />
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.auth-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--color-bg);
}

.auth-shell__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: var(--content-width);
  height: 56px;
  margin: 0 auto;
  padding: 0 clamp(16px, 2.5vw, 40px);
}

.auth-shell__brand {
  font-size: 15px;
  font-weight: 600;
}

/* 默认（登录 / 找回密码）：单栏窄表单居中 */
.auth-shell__main {
  width: 100%;
  max-width: 360px;
  margin: 0 auto;
  padding: 48px 24px 64px;
}

/* 注册页：左「产品本体」+ 右表单。两栏只用留白分隔，不加分隔线 */
.auth-shell__main--split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 400px;
  gap: clamp(32px, 6vw, 88px);
  /* 两栏顶部对齐（左栏标题与「注册」同一水平线），整块靠 align-content 落在视口中间 */
  align-items: start;
  flex: 1 1 auto;
  align-content: center;
  max-width: 1000px;
  padding-top: 40px;
  padding-bottom: 72px;
}

.auth-shell__panel {
  min-width: 0;
}

.auth-shell__subtitle {
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-text-2);
}

.auth-shell__form {
  margin-top: 24px;
}

/* 窄屏：示例清单折到表单上方，不再左右分栏 */
@media (max-width: 880px) {
  .auth-shell__main--split {
    grid-template-columns: minmax(0, 1fr);
    gap: 36px;
    max-width: 420px;
    align-items: start;
    padding-top: 28px;
  }
}
</style>
