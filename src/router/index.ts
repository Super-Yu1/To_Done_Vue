/**
 * 路由表 + 两套守卫 + 标题设置（见 8.2）。
 * 用户与管理员登录态各自独立、互不干扰：/admin/** 只看 todone_admin_token，
 * 其余需登录页只看 todone_token；刷新不掉线（登录态由 localStorage 推导）。
 */
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { ADMIN_TOKEN_KEY, TOKEN_KEY } from '@/constants'
import { readTokenState } from '@/utils/token'

const APP_NAME = 'To_Done'

declare module 'vue-router' {
  interface RouteMeta {
    /** 页面标题 */
    title?: string
    /** 公开页：不需要登录 */
    isPublic?: boolean
  }
}

/**
 * 站点根路径落到哪（2026-10-14 需求）：
 * - 有可用 token → 任务页
 * - token 过期（登录过期）→ 登录页
 * - 没有 token（从没登录过 / 已登出）→ 演示模式首页
 * 直接读 localStorage 而不是走 store：redirect 在导航解析时就要出结果，那时不该依赖 store 是否已初始化。
 */
function resolveEntry(): string {
  const state = readTokenState(TOKEN_KEY)
  if (state === 'valid') return '/tasks'
  return state === 'expired' ? '/login' : '/demo'
}

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: '登录', isPublic: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { title: '注册', isPublic: true },
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('@/views/ForgotPasswordView.vue'),
    meta: { title: '找回密码', isPublic: true },
  },
  {
    path: '/demo',
    component: () => import('@/layouts/DemoLayout.vue'),
    children: [
      {
        path: '',
        name: 'demo',
        component: () => import('@/views/DemoView.vue'),
        meta: { title: '演示模式', isPublic: true },
      },
      // 演示模式覆盖前台全部功能（不含后台，见 8.6），任务 / 回收站 / 个人中心三个入口
      {
        path: 'trash',
        name: 'demo-trash',
        component: () => import('@/views/DemoTrashView.vue'),
        meta: { title: '演示模式 · 回收站', isPublic: true },
      },
      {
        path: 'profile',
        name: 'demo-profile',
        component: () => import('@/views/DemoProfileView.vue'),
        meta: { title: '演示模式 · 个人中心', isPublic: true },
      },
    ],
  },
  {
    path: '/',
    component: () => import('@/layouts/DefaultLayout.vue'),
    children: [
      { path: '', redirect: () => resolveEntry() },
      {
        path: 'tasks',
        name: 'tasks',
        component: () => import('@/views/TaskListView.vue'),
        meta: { title: '任务' },
      },
      {
        path: 'trash',
        name: 'trash',
        component: () => import('@/views/TrashView.vue'),
        meta: { title: '回收站' },
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/views/ProfileView.vue'),
        meta: { title: '个人中心' },
      },
    ],
  },
  {
    path: '/admin/login',
    name: 'admin-login',
    component: () => import('@/views/admin/AdminLoginView.vue'),
    meta: { title: '管理员登录', isPublic: true },
  },
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    children: [
      { path: '', redirect: '/admin/users' },
      {
        path: 'users',
        name: 'admin-users',
        component: () => import('@/views/admin/AdminUsersView.vue'),
        meta: { title: '用户管理' },
      },
      {
        path: 'admins',
        name: 'admin-admins',
        component: () => import('@/views/admin/AdminAdminsView.vue'),
        meta: { title: '管理员管理' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: '页面不存在', isPublic: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  /**
   * 切页归零。桌面骨架改成了「整页不滚、内容区自己滚」（`.app-layout__main` 上 overflow-y: auto），
   * 光返回 `{ top: 0 }` 只滚窗口，内层容器会停在上一页的位置 —— 这里顺手把它也归零。
   */
  scrollBehavior: () => {
    document.querySelector<HTMLElement>('.app-layout__main')?.scrollTo({ top: 0 })
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  // 后台是另一套守卫：/admin/** 不参与演示模式，没有管理员 token 一律按未登录处理
  if (to.path.startsWith('/admin')) {
    const hasAdminToken = readTokenState(ADMIN_TOKEN_KEY) === 'valid'
    if (to.meta.isPublic) {
      return to.name === 'admin-login' && hasAdminToken ? { path: '/admin/users' } : true
    }
    return hasAdminToken ? true : { path: '/admin/login', query: { redirect: to.fullPath } }
  }

  const tokenState = readTokenState(TOKEN_KEY)
  if (to.meta.isPublic) {
    const isAuthPage = to.name === 'login' || to.name === 'register'
    // 已登录的人不必停在登录/注册页；过期票允许停着，否则会在登录页与任务页之间来回跳
    return isAuthPage && tokenState === 'valid' ? { path: '/tasks' } : true
  }
  if (tokenState === 'valid') return true
  // 登录过期 → 回登录页（带上回跳地址）；从没登录过或已登出 → 演示模式
  return tokenState === 'expired'
    ? { path: '/login', query: { redirect: to.fullPath } }
    : { path: '/demo' }
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · ${APP_NAME}` : APP_NAME
})

export default router
