<script setup lang="ts">
/** 前台布局：极简顶栏 + 内容区（内容宽度由各页 .page 控制，见 8.7） */
import { computed, onMounted } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

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
  <div class="layout">
    <header class="topbar">
      <div class="topbar__inner">
        <RouterLink class="brand" to="/tasks">To_Done</RouterLink>
        <nav class="nav" aria-label="主导航">
          <RouterLink class="nav__link" to="/tasks">任务</RouterLink>
          <RouterLink class="nav__link" to="/trash">回收站</RouterLink>
        </nav>
        <div class="topbar__actions">
          <ThemeToggle />
          <el-dropdown trigger="click">
            <button class="account" type="button">
              <img v-if="auth.user?.avatarUrl" class="avatar" :src="auth.user.avatarUrl" alt="头像" />
              <span v-else class="avatar avatar--text">{{ avatarText }}</span>
              <span class="account__name">{{ displayName }}</span>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="router.push('/profile')">
                  <AppIcon name="user" />
                  <span class="menu-text">个人中心</span>
                </el-dropdown-item>
                <el-dropdown-item divided @click="handleLogout">
                  <AppIcon name="logout" />
                  <span class="menu-text">退出登录</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
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
  gap: 24px;
  width: 100%;
  max-width: var(--content-width);
  height: 56px;
  margin: 0 auto;
  padding: 0 24px;
}

.brand {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.2px;
}

.nav {
  display: flex;
  gap: 16px;
  flex: 1;
}

.nav__link {
  font-size: 14px;
  color: var(--color-text-2);
  transition: color var(--dur-fast) var(--ease);
}

.nav__link:hover {
  color: var(--color-text);
}

.nav__link.router-link-active {
  color: var(--color-text);
  font-weight: 500;
}

.topbar__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.account {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
}

.account:hover {
  background-color: var(--color-hover);
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--color-border);
}

.avatar--text {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: var(--color-text-2);
  background-color: var(--color-hover);
}

.account__name {
  max-width: 120px;
  overflow: hidden;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-text {
  margin-left: 8px;
}

@media (max-width: 640px) {
  .topbar__inner {
    gap: 12px;
    padding: 0 16px;
  }

  .account__name {
    display: none;
  }
}
</style>
