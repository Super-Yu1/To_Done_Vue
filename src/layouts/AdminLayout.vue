<script setup lang="ts">
/** 后台布局：左侧固定侧边栏 200px + 顶栏（管理员名字、上次登录时间、退出）；后台不提供主题切换（见 8.9） */
import { computed } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import { useAdminStore } from '@/stores/admin'
import { formatDateTime } from '@/utils/date'

const adminStore = useAdminStore()
const router = useRouter()

const adminName = computed(() => adminStore.admin?.name ?? '管理员')
const lastLoginAt = computed(() =>
  adminStore.admin?.lastLoginAt ? `上次登录 ${formatDateTime(adminStore.admin.lastLoginAt)}` : '首次登录',
)

/** 退出后台：清 todone_admin_token 并跳 /admin/login，不需要二次确认（8.8） */
async function handleLogout() {
  adminStore.logout()
  await router.push('/admin/login')
}
</script>

<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="sidebar__brand">To_Done 后台</div>
      <nav class="sidebar__nav" aria-label="后台导航">
        <RouterLink class="sidebar__link" to="/admin/users">用户管理</RouterLink>
        <RouterLink class="sidebar__link" to="/admin/admins">管理员管理</RouterLink>
      </nav>
    </aside>

    <div class="admin-layout__body">
      <header class="topbar">
        <el-dropdown trigger="click">
          <button class="account" type="button">
            <AppIcon name="user" />
            <span class="account__name">{{ adminName }}</span>
            <span class="account__meta">{{ lastLoginAt }}</span>
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="handleLogout">
                <AppIcon name="logout" />
                <span class="menu-text">退出</span>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </header>

      <main class="admin-layout__main">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background-color: var(--color-bg);
}

.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 200px;
  padding: 20px 12px;
  border-right: 1px solid var(--color-border);
}

.sidebar__brand {
  padding: 0 12px 20px;
  font-size: 15px;
  font-weight: 600;
}

.sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sidebar__link {
  padding: 8px 12px;
  border-radius: var(--radius-md);
  font-size: 14px;
  color: var(--color-text-2);
  transition: color var(--dur-fast) var(--ease), background-color var(--dur-fast) var(--ease);
}

.sidebar__link:hover {
  color: var(--color-text);
  background-color: var(--color-hover);
}

.sidebar__link.router-link-active {
  color: var(--color-text);
  font-weight: 500;
  background-color: var(--color-hover);
}

.admin-layout__body {
  flex: 1;
  min-width: 0;
  margin-left: 200px;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 56px;
  padding: 0 clamp(16px, 2.5vw, 40px);
  border-bottom: 1px solid var(--color-border);
}

.account {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 6px 8px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
}

.account:hover {
  background-color: var(--color-hover);
}

.account__name {
  font-size: 14px;
}

.account__meta {
  font-size: 12px;
  color: var(--color-text-2);
}

.menu-text {
  margin-left: 8px;
}

.admin-layout__main {
  padding: 24px clamp(16px, 2.5vw, 40px);
}
</style>
