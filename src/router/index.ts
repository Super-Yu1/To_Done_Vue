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
      /*
       * 演示模式**没有个人中心入口**（左下角是「去登录」，不是用户菜单），所以不再提供这个页面：
       * 老链接或手输 /demo/profile 一律送回登录页，免得看到一个真实用户根本点不到的界面。
       */
      { path: 'profile', redirect: '/login' },
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
      {
        path: 'audit',
        name: 'admin-audit',
        component: () => import('@/views/admin/AdminAuditView.vue'),
        meta: { title: '登录审计' },
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

/**
 * 上一次导航从哪来（2026-11-01）：只给「演示模式的漫游」判断是不是**从演示区之外**进来的 ——
 * 站内在 `/demo` ↔ `/demo/trash` 之间来回切，不该每次都弹一遍漫游（见项目约定「新手漫游」）。
 *
 * 为什么在守卫里记、而不是组件里读 `history.state.back`：跟浏览器后退走的时候，
 * 那份 state 是**这条历史记录当初进来时**的旧值（可能是 `/`），会误判成「从站外进来」；
 * `from.path` 是这一次导航真实的来源。另外 `afterEach` 跑得比组件挂载晚，`onMounted` 时还拿不到。
 */
let lastFromPath = '/'

/** 本次导航的来源路径（组件在 `onMounted` 里读到的就是「刚刚那一步是从哪儿来的」） */
export function previousRoutePath(): string {
  return lastFromPath
}

router.beforeEach((to, from) => {
  lastFromPath = from.path
  return true
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

/**
 * 后台页不参与搜索引擎索引（2026-11-01）：给 `<head>` 挂/摘一条 `noindex, nofollow`。
 * 它只防「被收录后被人逛到」，**防不住扫描器** —— 真正的边界是后端 admin token，
 * 部署层还应限制 `/admin` 与 `/api/admin` 的来源（见 docs/前端修改说明.md「后台入口」）。
 */
function setNoIndex(noindex: boolean) {
  const existing = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')
  if (!noindex) {
    existing?.remove()
    return
  }
  const meta = existing ?? document.createElement('meta')
  if (!existing) {
    meta.setAttribute('name', 'robots')
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', 'noindex, nofollow')
}

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · ${APP_NAME}` : APP_NAME
  setNoIndex(to.path.startsWith('/admin'))
})

export default router
