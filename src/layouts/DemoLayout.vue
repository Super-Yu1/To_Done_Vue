<script setup lang="ts">
/**
 * 演示模式布局（2026-10-16 改版，2026-11-01 与前台对齐左下角）：
 * 与前台同一套侧边栏骨架（见 DefaultLayout），差别只在品牌旁多一个「演示模式」徽章、
 * 底部身份位给的是单枚「去登录」而不是账号菜单。
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
        <SideBottomBar :collapsed="sidebarCollapsed" @toggle="toggleSidebar">
          <div class="side-auth">
            <RouterLink class="side-auth__link" to="/login">
              <el-button type="primary" class="side-auth__login">去登录</el-button>
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
 * 身份位（2026-11-04 改）：演示模式只留一枚「去登录」，尺寸与前台「头像 + 用户名」那一格一致
 * —— 70% 宽 × 40 高、top 0 贴齐行顶，中线 20 与右侧 32×32 的主题 / 折叠同线。
 * 按钮铺满这一格做成横条，文字由按钮自己居中。
 */
.side-auth {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  width: 70%;
  height: 40px;
}

/* 链接铺满身份位，按钮才会跟着拉成一条 */
.side-auth__link {
  display: flex;
  width: 100%;
}

.side-auth__login {
  width: 100%;
  height: 40px;
  padding: 0;
  border-radius: var(--radius-control);
  font-size: 14px;
}

/* 折叠态（76px 宽，内容只有 54）：占满整行宽，高度收一档，居中于身份位 */
.side-row--stacked .side-auth {
  width: 100%;
  height: 40px;
}

.side-row--stacked .side-auth__login {
  height: 32px;
  padding: 0;
  font-size: 12px;
}
</style>
