<script setup lang="ts">
/**
 * 前台布局（2026-10-16 改版）：**左侧边栏 + 主内容区**（原「极简顶栏 + 通栏内容」）。
 * 侧栏 = 品牌（logo + To_Done）、主导航（任务 / 回收站 / 个人中心）、底部设置区；
 * 主内容区上限 1720px 居中（2026-10-17 从 1280 放宽）—— 防「单行太长」靠行内布局，不靠这层硬卡。
 * 原来顶栏的账号下拉收进侧栏底部：身份一行（点进个人中心）+ 主题开关 + 退出登录。
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import AppTooltip from '@/components/AppTooltip.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import type { IconName } from '@/components/icons'
import { usePreferences } from '@/composables/usePreferences'
import { useAuthStore } from '@/stores/auth'
import { useTodoStore } from '@/stores/todo'

const auth = useAuthStore()
const todo = useTodoStore()
const router = useRouter()
/** 侧栏折叠（2026-10-26）：底部第三个按钮在「折叠 / 展开」之间切换，状态存本地 */
const { sidebarCollapsed, toggleSidebar, setSidebarCollapsed } = usePreferences()

/**
 * 窗口宽度跨过阈值时自动折叠 / 自动展开（2026-10-26，按反馈改为双向）。
 * 阈值 1100px：272px 侧栏 + 内容区最小可用宽度（约 800px）之和。
 *
 * 关键点：只有「系统自动收起的」才在变宽时自动展开 —— 用一个标记区分，
 * 否则用户在宽屏手动折叠后，随便拖一下窗口就会被强制展开。
 */
/*
 * 2026-10-26 调到 1150：侧栏展开时，窗口 1100 附近列表宽约 716px，正好落进行布局的 720px 断点，
 * 于是「侧栏还没折叠、任务先变高」。1150 能保证侧栏总是先收起来、列表始终 ≥ 720，
 * 变高的时机被推到约 910px（那时侧栏早就折叠好了），顺序因此变成「先折叠、后变高」。
 */
const NARROW_SIDEBAR_MAX = 1150
const autoCollapsed = ref(false)

function syncSidebarForWidth() {
  const narrow = window.innerWidth < NARROW_SIDEBAR_MAX
  if (narrow && !sidebarCollapsed.value) {
    setSidebarCollapsed(true)
    autoCollapsed.value = true
  } else if (!narrow && autoCollapsed.value) {
    setSidebarCollapsed(false)
    autoCollapsed.value = false
  }
}

/** 手动点折叠按钮：用户的选择优先，清掉「自动收起」标记，之后不再被宽度左右 */
function handleToggleSidebar() {
  autoCollapsed.value = false
  toggleSidebar()
}

/** 用户菜单（点头像 + 用户名向上弹出） */
const userMenuVisible = ref(false)

function goProfile() {
  userMenuVisible.value = false
  void router.push('/profile')
}

function handleHelp() {
  userMenuVisible.value = false
  // 帮助中心还没有页面（会记进前端清单），先给一条明确提示，不做假入口
  ElMessage.info('帮助中心正在建设中，稍后上线')
}

/**
 * 导航项：「任务」带一个未完成条数徽标（2026-10-26）。
 * 数字取自 store 的 `stats`（与统计卡同一份，任务一改就跟着变）；
 * 没有数据时是 `undefined`，AppSidebar 那边不渲染空胶囊。
 */
const navItems = computed<{ to: string; label: string; icon: IconName; badge?: number }[]>(() => [
  /*
   * 徽标 = **未完成**（TODO + IN_PROGRESS），不是 `stats.todo`（那只算 TODO）。
   * 2026-10-26 修：之前用 `stats.todo`，列表按「未完成 = 非 DONE」显示 2 条时，徽标还写着 1。
   */
  {
    to: '/tasks',
    label: '任务',
    icon: 'inbox',
    badge: todo.stats ? todo.stats.todo + todo.stats.inProgress : undefined,
  },
  { to: '/trash', label: '回收站', icon: 'trash' },
  // 2026-10-26：个人中心从侧栏移出，改由左下角用户菜单进入
])

const displayName = computed(() => auth.user?.name ?? '我的账号')
const avatarText = computed(() => (auth.user?.name ?? '我').slice(0, 1))

onMounted(() => {
  syncSidebarForWidth()
  window.addEventListener('resize', syncSidebarForWidth)
})

onUnmounted(() => {
  window.removeEventListener('resize', syncSidebarForWidth)
})

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
  userMenuVisible.value = false
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
  <div class="app-layout" :class="{ 'app-layout--collapsed': sidebarCollapsed }">
    <AppSidebar :items="navItems" brand-to="/tasks" :collapsed="sidebarCollapsed">
      <template #settings>
        <!-- 2026-10-26：身份 / 主题 / 折叠并成一行；点头像用户名向上弹出用户菜单 -->
        <div class="side-row">
          <el-popover
            v-model:visible="userMenuVisible"
            placement="top"
            trigger="click"
            transition="el-zoom-in-top"
            popper-class="user-menu"
          >
            <template #reference>
              <!--
                2026-10-27：**不再挂任何悬浮提示** —— 名字本来就在按钮里写着，
                再弹一次是重复；而且这枚按钮点开就是用户菜单，不需要靠气泡解释。
              -->
              <button class="side-user" type="button">
                <img
                  v-if="auth.user?.avatarUrl"
                  class="side-user__avatar"
                  :src="auth.user.avatarUrl"
                  alt=""
                />
                <span v-else class="side-user__avatar side-user__avatar--text">{{ avatarText }}</span>
                <span class="side-user__name">{{ displayName }}</span>
              </button>
            </template>

            <div class="user-menu__list" role="menu">
              <button class="user-menu__item" type="button" role="menuitem" @click="goProfile">
                <AppIcon name="user" :size="15" />
                <span>个人中心</span>
              </button>
              <button class="user-menu__item" type="button" role="menuitem" @click="handleHelp">
                <AppIcon name="help" :size="15" />
                <span>帮助中心</span>
              </button>
              <div class="user-menu__divider" role="separator"></div>
              <button
                class="user-menu__item user-menu__item--danger"
                type="button"
                role="menuitem"
                @click="handleLogout"
              >
                <AppIcon name="logout" :size="15" />
                <span>退出登录</span>
              </button>
            </div>
          </el-popover>

          <ThemeToggle class="side-row__tool" />
          <!-- 2026-10-27：悬浮说明用 EP 气泡（全局白卡样式，见 main.css 的 `.el-popper.is-dark`） -->
          <AppTooltip :content="sidebarCollapsed ? '展开' : '折叠'" placement="top">
            <button
              class="side-tool side-row__tool"
              type="button"
              :aria-label="sidebarCollapsed ? '展开侧栏' : '折叠侧栏'"
              :aria-expanded="!sidebarCollapsed"
              @click="handleToggleSidebar"
            >
              <AppIcon :name="sidebarCollapsed ? 'expand' : 'collapse'" :size="16" />
            </button>
          </AppTooltip>
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
/* 2026-10-26：从 RouterLink 改成按钮（点它弹用户菜单），顺带做按钮样式重置 */
.side-user {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
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

/* 折叠态：底部从三列改成竖排（76px 放不下三列），只留头像与两个图标 */
.app-layout--collapsed .side-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.app-layout--collapsed .side-user {
  justify-content: center;
  padding: 6px;
}

.app-layout--collapsed .side-user__name {
  display: none;
}

.side-user:hover {
  background-color: var(--control-hover);
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
  border-radius: var(--radius-control);
  background-color: transparent;
  color: var(--color-text-2);
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease), background-color var(--dur-fast) var(--ease),
    transform 120ms var(--ease);
}

.side-tool:hover {
  color: var(--color-text);
  background-color: var(--control-hover);
}

/* 按下就缩一下：反馈发生在 pointer-down，不等 click（2026-10-27 三改） */
.side-tool:active,
.side-user:active {
  transform: scale(0.97);
}

/* 2026-10-26：移除「窄屏隐藏用户名」的规则 —— 窄屏统一走侧栏自动折叠，折叠态本来就不显示名字 */

</style>
