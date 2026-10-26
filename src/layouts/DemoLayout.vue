<script setup lang="ts">
/**
 * 演示模式布局（2026-10-16 改版）：与前台同一套侧边栏骨架（见 DefaultLayout），
 * 差别只在品牌旁多一个「演示模式」徽章、底部设置区给的是主题开关 + 注册 / 登录按钮。
 * 不给后台入口 —— 后台不参与演示模式（见 8.6）。
 */
import { computed } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import AppSidebar from '@/components/AppSidebar.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import type { IconName } from '@/components/icons'
import { demoTasks } from '@/mock/demoState'

/**
 * 「任务」用 exact：/demo 是另外两个入口的前缀，否则它在任何演示页都会高亮。
 * 徽标取演示数据里未完成的条数（`demoTasks` 是模块级共享内存态，与演示页是同一份，
 * 在页面上勾掉一条，这里的数字会立刻跟着变）。
 */
const navItems = computed<{ to: string; label: string; icon: IconName; exact?: boolean; badge?: number }[]>(
  () => [
    {
      to: '/demo',
      label: '任务',
      icon: 'inbox',
      exact: true,
      badge: demoTasks.value.filter((task) => task.status !== 'DONE').length,
    },
    { to: '/demo/trash', label: '回收站', icon: 'trash' },
    // 2026-10-26：与真实布局一致，个人中心不再占导航位
  ],
)
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
