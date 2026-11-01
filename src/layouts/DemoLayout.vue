<script setup lang="ts">
/**
 * 演示模式布局（2026-10-16 改版，2026-11-01 与前台对齐左下角）：
 * 与前台同一套侧边栏骨架（见 DefaultLayout），差别只在品牌旁多一个「演示模式」徽章、
 * 底部身份位给的是「注册 / 登录」而不是账号菜单。
 * 不给后台入口 —— 后台不参与演示模式（见 8.6）。
 */
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import AppSidebar from '@/components/AppSidebar.vue'
import SideBottomBar from '@/components/SideBottomBar.vue'
import type { IconName } from '@/components/icons'
import { useSidebarCollapse } from '@/composables/useSidebarCollapse'
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

/** 侧栏折叠：与前台同一套（含窄窗自动收起），状态也共用同一份本地偏好 */
const { sidebarCollapsed, toggleSidebar } = useSidebarCollapse()
</script>

<template>
  <div class="app-layout" :class="{ 'app-layout--collapsed': sidebarCollapsed }">
    <AppSidebar :items="navItems" brand-to="/demo" :collapsed="sidebarCollapsed">
      <template #settings>
        <!--
          左下角与前台**同一套**（2026-11-01）：底部那一行由 `SideBottomBar` 摆
          （身份位 + 主题 + 折叠），演示模式只往身份位里放「注册 / 登录」。
          折叠按钮从此在演示模式里也有 —— 以前两边不是一套。
        -->
        <SideBottomBar
          class="side-row--demo"
          :collapsed="sidebarCollapsed"
          @toggle="toggleSidebar"
        >
          <div class="side-auth">
            <RouterLink to="/register">
              <el-button size="small">注册</el-button>
            </RouterLink>
            <RouterLink to="/login">
              <el-button size="small" type="primary">登录</el-button>
            </RouterLink>
          </div>
        </SideBottomBar>
      </template>
    </AppSidebar>

    <main class="app-layout__main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
/*
 * 身份位（2026-11-01）：两枚按钮占住前台「头像 + 用户名」那一格（70%），
 * 主题与折叠按钮由 `SideBottomBar` 摆在右侧的两格 —— 与前台同一个骨架。
 */
.side-auth {
  position: absolute;
  top: 4px;
  left: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

/*
 * 折叠态（76px 宽）：横排放不下两枚按钮，改成竖排；身份位因此比前台高，
 * 主题 / 折叠两枚按钮跟着往下挪 —— 三个数用 CSS 变量覆盖
 * （`SideBottomBar` 里只给默认值：行高 120、主题 48、折叠 88）。
 */
.side-row--demo {
  --stacked-row-height: 150px;
  --stacked-theme-top: 70px;
  --stacked-collapse-top: 110px;
}

.side-row--stacked .side-auth {
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  /* 左右各让 8px：按钮自身的内边距约 38px 宽，让出的 38 正好放得下、居中 */
  left: 8px;
  right: 8px;
  top: 2px;
}

.side-row--stacked .side-auth :deep(.el-button) {
  height: 28px;
  padding: 0 6px;
  font-size: 12px;
}
</style>
