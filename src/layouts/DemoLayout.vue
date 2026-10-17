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
      <!--
        演示环境通栏提示（2026-10-17）：这条以前只写在页面里的一段灰字里，用户改了半天、一刷新全没了才发现。
        放在布局层，演示模式的三个页面都带，且不依赖各页自己记得写。
      -->
      <p class="demo-banner" role="status">
        <span>
          当前为演示环境 —— 新建、修改只存在内存里，<strong>刷新页面就会重置</strong>。
        </span>
        <RouterLink class="demo-banner__link" to="/register">注册账号后就能保存</RouterLink>
      </p>
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
/*
 * 演示环境通栏：用「高优先级」那组暖色令牌（它们本来就是为「需要注意」准备的），
 * 一行读完，不抢任务列表的注意力、但绝不会被当成正文忽略。
 */
.demo-banner {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px 16px;
  /* 与各页 .page 的左右内边距对齐，不要贴着侧栏；上边距给顶栏一点呼吸 */
  margin: 16px clamp(16px, 2.5vw, 40px) 0;
  padding: 10px 14px;
  border: 1px solid var(--color-priority-high-border);
  border-radius: var(--radius-md);
  background-color: var(--color-priority-high-bg);
  color: var(--color-priority-high-fg);
  font-size: 13px;
  line-height: 1.6;
}

.demo-banner__link {
  color: inherit;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 2px;
}

html.dark .demo-banner {
  border-color: var(--color-priority-high-border);
}

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
