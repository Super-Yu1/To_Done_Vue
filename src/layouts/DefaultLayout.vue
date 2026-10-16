<script setup lang="ts">
/**
 * 前台布局（2026-10-16 改版）：**左侧边栏 + 主内容区**（原「极简顶栏 + 通栏内容」）。
 * 侧栏 = 品牌（logo + To_Done）、主导航（任务 / 回收站 / 个人中心）、底部设置区；
 * 主内容区上限 1280px 居中 —— 超宽屏上列表不再被拉成超长横条（原 A② 待办，本次一并落地）。
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

const auth = useAuthStore()
const router = useRouter()

const navItems: { to: string; label: string; icon: IconName }[] = [
  { to: '/tasks', label: '任务', icon: 'inbox' },
  { to: '/trash', label: '回收站', icon: 'trash' },
  { to: '/profile', label: '个人中心', icon: 'user' },
]

const displayName = computed(() => auth.user?.name ?? '我的账号')
const avatarText = computed(() => (auth.user?.name ?? '我').slice(0, 1))

onMounted(async () => {
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

        <div class="side-tools">
          <ThemeToggle />
          <button
            class="side-tool"
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
/* 底部设置区：身份一行（点头像/名字进个人中心）+ 主题与退出 */
.side-user {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 6px 8px;
  border-radius: var(--radius-md);
  transition: background-color var(--dur-fast) var(--ease);
}

.side-user:hover {
  background-color: var(--color-hover);
}

.side-user__avatar {
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
  max-width: 118px;
  overflow: hidden;
  font-size: 13px;
  color: var(--color-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.side-tools {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
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
  background-color: var(--color-hover);
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
