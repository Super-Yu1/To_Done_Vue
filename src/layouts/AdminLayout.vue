<script setup lang="ts">
/**
 * 后台布局（2026-10-30 改成与前台同一套浮岛；2026-11-02 补齐折叠与主题）：
 * 复用 `.app-layout` + `AppSidebar` —— 左侧玻璃浮岛、主内容区内滚、四周留白。
 *
 * 2026-11-02 起左下角与前台完全同源：`SideBottomBar`（身份位 + 主题 + 折叠）三格，
 * 折叠状态走同一份 `useSidebarCollapse`（存本地、窄屏自动收起）。
 * 唯一的差别是身份位多一行「上次登录」，所以给 `SideBottomBar` 传 `--row-height: 60px`。
 */
import { computed, ref } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import SideBottomBar from '@/components/SideBottomBar.vue'
import type { IconName } from '@/components/icons'
import { useSidebarCollapse } from '@/composables/useSidebarCollapse'
import { useAdminStore } from '@/stores/admin'
import { formatDateTime } from '@/utils/date'

const adminStore = useAdminStore()
const router = useRouter()

/** 侧栏折叠（2026-11-02）：与前台同一份 composable，状态互通、窄屏自动收起 */
const { sidebarCollapsed, toggleSidebar: handleToggleSidebar } = useSidebarCollapse()

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
  <div class="app-layout" :class="{ 'app-layout--collapsed': sidebarCollapsed }">
    <AppSidebar
      :items="navItems"
      brand-to="/admin/users"
      brand-suffix="后台"
      section-title="管理"
      :collapsed="sidebarCollapsed"
    >
      <!--
        「上次登录」放脚注位（2026-11-02 二改）：横线**上方**、居中。
        放在身份位下方会贴着侧栏底边，太靠外、也太突兀。
        折叠时整条侧栏只剩 54px 宽，日期放不下就不渲染。
      -->
      <template #footnote>
        <p v-if="!sidebarCollapsed" class="admin-side__meta">{{ lastLoginAt }}</p>
      </template>

      <template #settings>
        <SideBottomBar :collapsed="sidebarCollapsed" @toggle="handleToggleSidebar">
          <div class="admin-side__id">
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
 * 身份位容器（2026-11-02）：绝对定位 + 位置过渡，和前台的身份位同一套节奏。
 * 折叠时收到 40×40（只放得下头像），`left: 7px` 是 (54 − 40) / 2 的居中量，
 * 写死像素而不是百分比 —— 百分比会在过渡中跟着容器宽度重算，头像会先甩出去再滑回来。
 */
.admin-side__id {
  position: absolute;
  top: 0;
  left: 0;
  width: 70%;
  transition:
    left 280ms cubic-bezier(0.22, 1, 0.36, 1),
    width 280ms cubic-bezier(0.22, 1, 0.36, 1);
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
  transition:
    background-color var(--dur-fast) var(--ease),
    transform 120ms var(--ease),
    padding 280ms cubic-bezier(0.22, 1, 0.36, 1),
    gap 280ms cubic-bezier(0.22, 1, 0.36, 1);
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

/*
 * 「上次登录」：居中压在底部横线上方（由 AppSidebar 的 `footnote` 插槽定位）。
 * 宽度是整条侧栏的内容宽，所以「上次登录 2026-11-02 00:53」不会被截断。
 */
.admin-side__meta {
  margin: 0;
  overflow: hidden;
  font-size: 11.5px;
  letter-spacing: 0.02em;
  line-height: 18px;
  color: var(--color-text-3);
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 折叠态：只剩头像，日期放不下就收掉（宽度只有 54，硬塞会截成半截数字） */
.side-row--stacked .admin-side__id {
  left: 7px;
  width: 40px;
}

.side-row--stacked .admin-side__user {
  gap: 0;
  padding: 6px;
}
</style>
