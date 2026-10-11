<script setup lang="ts">
/** 认证页外壳（登录 / 注册 / 找回密码共用）：品牌 + 主题切换 + 居中表单（8.7 覆盖全站含认证页） */
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

    <main class="auth-shell__main">
      <h1 class="page-title">{{ title }}</h1>
      <p v-if="subtitle" class="auth-shell__subtitle">{{ subtitle }}</p>
      <div class="auth-shell__form">
        <slot />
      </div>
    </main>
  </div>
</template>

<style scoped>
.auth-shell {
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

.auth-shell__main {
  width: 100%;
  max-width: 360px;
  margin: 0 auto;
  padding: 48px 24px 64px;
}

.auth-shell__subtitle {
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-text-2);
}

.auth-shell__form {
  margin-top: 24px;
}
</style>
