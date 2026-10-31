<script setup lang="ts">
/**
 * 后台布局（2026-10-30 改成与前台同一套浮岛）：
 * 原来是「贴边的固定侧栏 200px + 顶栏 + 白底表格」，和前台完全是两套语言；
 * 现在直接复用 `.app-layout` + `AppSidebar` —— 左侧玻璃浮岛、主内容区内滚、四周留白，
 * 后台与前台看起来是同一个应用。差别只有：导航是「用户 / 管理员管理 / 登录审计」，
 * 底部没有主题开关与折叠（后台不提供这两件，见 8.9）。
 */
import { computed, ref } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import type { IconName } from '@/components/icons'
import { useAdminStore } from '@/stores/admin'
import { formatDateTime } from '@/utils/date'

const adminStore = useAdminStore()
const router = useRouter()

/** 后台三个入口（登录审计 2026-10-31 新增），都不设数字徽标 */
const navItems: { to: string; label: string; icon: IconName }[] = [
  { to: '/admin/users', label: '用户管理', icon: 'user' },
  { to: '/admin/admins', label: '管理员管理', icon: 'key' },
  { to: '/admin/audit', label: '登录审计', icon: 'clock' },
]

const adminName = computed(() => adminStore.admin?.name ?? '管理员')
const avatarText = computed(() => adminName.value.slice(0, 1))
const lastLoginAt = computed(() =>
  adminStore.admin?.lastLoginAt ? `上次登录 ${formatDateTime(adminStore.admin.lastLoginAt)}` : '首次登录',
)

/** 账号菜单（向上弹出），外观复用 main.css 里的 `.user-menu` */
const menuVisible = ref(false)

/** 退出后台：清 todone_admin_token 并跳 /admin/login，不需要二次确认（8.8） */
async function handleLogout() {
  menuVisible.value = false
  adminStore.logout()
  await router.push('/admin/login')
}
</script>

<template>
  <div class="app-layout">
    <AppSidebar :items="navItems" brand-to="/admin/users" brand-suffix="后台" section-title="管理">
      <template #settings>
        <p class="admin-side__meta">{{ lastLoginAt }}</p>

        <el-popover
          v-model:visible="menuVisible"
          placement="top"
          trigger="click"
          transition="el-zoom-in-top"
          popper-class="user-menu"
        >
          <template #reference>
            <button class="admin-side__user" type="button">
              <span class="admin-side__avatar">{{ avatarText }}</span>
              <span class="admin-side__name">{{ adminName }}</span>
            </button>
          </template>

          <div class="user-menu__list" role="menu">
            <button
              class="user-menu__item user-menu__item--danger"
              type="button"
              role="menuitem"
              @click="handleLogout"
            >
              <AppIcon name="logout" :size="15" />
              <span>退出后台</span>
            </button>
          </div>
        </el-popover>
      </template>
    </AppSidebar>

    <main class="app-layout__main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
/* 上次登录：比正文小一档，压在账号按钮上方，只做「交代」 */
.admin-side__meta {
  padding: 0 10px 2px;
  font-size: 11.5px;
  letter-spacing: 0.02em;
  color: var(--color-text-3);
}

.admin-side__user {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  height: 40px;
  padding: 6px 8px;
  border: none;
  border-radius: var(--radius-control);
  background-color: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease), transform 120ms var(--ease);
}

.admin-side__user:hover {
  background-color: var(--control-hover);
}

/* 按下就缩一下：反馈发生在 pointer-down，不等 click */
.admin-side__user:active {
  transform: scale(0.97);
}

.admin-side__avatar {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: var(--color-brand-soft);
  color: var(--color-brand-ink);
  font-size: 12px;
  font-weight: 600;
}

.admin-side__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
