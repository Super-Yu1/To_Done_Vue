<script setup lang="ts">
/**
 * 演示模式布局（2026-10-16 改版）：与前台同一套侧边栏骨架（见 DefaultLayout），
 * 差别只在品牌旁多一个「演示模式」徽章、底部设置区给的是主题开关 + 注册 / 登录按钮。
 * 不给后台入口 —— 后台不参与演示模式（见 8.6）。
 */
import { RouterLink, RouterView } from 'vue-router'
import AppSidebar from '@/components/AppSidebar.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import type { IconName } from '@/components/icons'

/** 「任务」用 exact：/demo 是另外两个入口的前缀，否则它在任何演示页都会高亮 */
const navItems: { to: string; label: string; icon: IconName; exact?: boolean }[] = [
  { to: '/demo', label: '任务', icon: 'inbox', exact: true },
  { to: '/demo/trash', label: '回收站', icon: 'trash' },
  { to: '/demo/profile', label: '个人中心', icon: 'user' },
]
</script>

<template>
  <div class="app-layout">
    <AppSidebar :items="navItems" brand-to="/demo">
      <template #settings>
        <div class="side-tools">
          <ThemeToggle />
          <div class="side-tools__auth">
            <RouterLink to="/register">
              <el-button size="small">注册</el-button>
            </RouterLink>
            <RouterLink to="/login">
              <el-button size="small" type="primary">登录</el-button>
            </RouterLink>
          </div>
        </div>
      </template>
    </AppSidebar>

    <main class="app-layout__main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
/* 底部设置区：主题开关在左、注册 / 登录在右；窄屏时整排横过来 */
.side-tools {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 4px;
}

.side-tools__auth {
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>
