<script setup lang="ts">
/**
 * 前台布局（2026-10-16 改版）：**左侧边栏 + 主内容区**（原「极简顶栏 + 通栏内容」）。
 * 侧栏 = 品牌（logo + To_Done）、主导航（任务 / 回收站 / 个人中心）、底部设置区；
 * 主内容区上限 1720px 居中（2026-10-17 从 1280 放宽）—— 防「单行太长」靠行内布局，不靠这层硬卡。
 * 原来顶栏的账号下拉收进侧栏底部：身份一行（点进个人中心）+ 主题开关 + 退出登录。
 */
import { computed, onMounted } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import type { IconName } from '@/components/icons'
import { useAuthStore } from '@/stores/auth'
import { useTodoStore } from '@/stores/todo'

const auth = useAuthStore()
const todo = useTodoStore()
const router = useRouter()

/**
 * 导航项：「任务」带一个未完成条数徽标（2026-10-26）。
 * 数字取自 store 的 `stats`（与统计卡同一份，任务一改就跟着变）；
 * 没有数据时是 `undefined`，AppSidebar 那边不渲染空胶囊。
 */
const navItems = computed<{ to: string; label: string; icon: IconName; badge?: number }[]>(() => [
  { to: '/tasks', label: '任务', icon: 'inbox', badge: todo.stats?.todo },
  { to: '/trash', label: '回收站', icon: 'trash' },
  { to: '/profile', label: '个人中心', icon: 'user' },
])

const displayName = computed(() => auth.user?.name ?? '我的账号')
const avatarText = computed(() => (auth.user?.name ?? '我').slice(0, 1))

onMounted(async () => {
  // 侧栏徽标要有数：进站时取一次统计（之后随任务操作自动刷新，见 stores/todo 的 refresh）
  if (!todo.stats) {
    try {
      await todo.fetchStats()
    } catch {
      // 取不到就不显示徽标，失败提示由 http 层统一给出
    }
  }
  if (!auth.isLoggedIn || auth.user) return
  try {
    await auth.fetchProfile()
  } catch {
    // 失败提示由 http 层统一给出，这里不重复弹窗
  }
})

async function handleLogout() {
  try {
    await ElMessageBox.confirm('退出后需要重新登录。', '退出登录', {
      confirmButtonText: '退出',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  auth.logout()
  await router.push('/login')
}
</script>

<template>
  <div class="app-layout">
    <AppSidebar :items="navItems" brand-to="/tasks">
      <template #settings>
        <!-- 2026-10-17：用户 / 主题 / 退出并成一行 —— 用户占 50%，主题与退出各 25% -->
        <div class="side-row">
          <RouterLink class="side-user" to="/profile">
            <img
              v-if="auth.user?.avatarUrl"
              class="side-user__avatar"
              :src="auth.user.avatarUrl"
              alt=""
            />
            <span v-else class="side-user__avatar side-user__avatar--text">{{ avatarText }}</span>
            <span class="side-user__name">{{ displayName }}</span>
          </RouterLink>

          <ThemeToggle class="side-row__tool" />
          <button
            class="side-tool side-row__tool"
            type="button"
            title="退出登录"
            aria-label="退出登录"
            @click="handleLogout"
          >
            <AppIcon name="logout" :size="16" />
          </button>
        </div>
      </template>
    </AppSidebar>

    <main class="app-layout__main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
/* 底部设置区：身份一行（点头像/用户名进个人中心）+ 主题与退出 */
.side-user {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 6px 8px;
  border-radius: var(--radius-md);
  transition: background-color var(--dur-fast) var(--ease);
}

.side-user:hover {
  background-color: var(--color-surface);
}

.side-user__avatar {
  flex: none;
  width: 26px;
  height: 26px;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  object-fit: cover;
}

.side-user__avatar--text {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--color-text-2);
  background-color: var(--color-hover);
}

.side-user__name {
  /* 占满 60% 那一格剩下的宽度，超长时省略号收尾（原来写死 118px，反而用不满） */
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 13px;
  color: var(--color-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 一行三格：用户 70%、主题 15%、退出 15%（2026-10-18 按反馈逐步调整，给用户名留更多宽度） */
.side-row {
  display: grid;
  grid-template-columns: 70% 15% 15%;
  align-items: center;
}

.side-row__tool {
  justify-self: center;
}

.side-tool {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: var(--radius-md);
  background-color: transparent;
  color: var(--color-text-2);
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease), background-color var(--dur-fast) var(--ease);
}

.side-tool:hover {
  color: var(--color-danger);
  background-color: var(--color-surface);
}

/* 窄屏：设置区横排，身份与两个图标按钮挤在一行 */
@media (max-width: 1024px) {
  .side-user {
    padding: 4px 6px;
  }

  .side-user__name {
    display: none;
  }

  .side-tools {
    gap: 4px;
    padding: 0;
  }
}
</style>
