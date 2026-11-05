/**
 * 本地偏好：**删除前二次确认**（2026-10-18 引入，2026-10-27 统一到所有删除动作）+ **侧栏折叠**。
 *
 * 为什么存本地而不是跟后端要字段：它们都是纯客户端的手感偏好，换设备不必同步；
 * 用模块级 ref 是为了让「个人中心里改」与各处删除动作共享同一份状态，切页不用重读。
 *
 * **按账号隔离**（2026-11-05）：原来两个键是全局的，同一台机器上换账号会继承上一个人的设置 ——
 * 新账号一登录就是「删除不确认 + 侧栏收着」，与「新账号一切从默认开始」相悖。
 * 现在键是 `{基础键}:{userId}`，没有记录即默认值：**确认开、侧栏展开**。
 * 当前作用域由 `setPreferenceScope()` 维护（登录 / 注册 / 拉资料 / 退出时调用），
 * 并把 userId 记在 `todone_pref_scope`，刷新页面时首帧就能读到正确的那一份，不会先展开再收起。
 * 未登录（演示模式）走 `anon` 这一份。
 *
 * 覆盖范围（2026-10-27 明确）：确认开关只覆盖**可恢复**的删除 —— 任务列表的单条删除与批量删除
 * （移入回收站，随时能捞回来）。回收站的「彻底删除」与「清空回收站」不可逆，**始终**二次确认，
 * 不受此开关影响。
 */
import { ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { CONFIRM_DELETE_KEY, SIDEBAR_COLLAPSED_KEY, TOKEN_KEY } from '@/constants'
import { readTokenState } from '@/utils/token'

/** 未登录（演示模式）用的作用域 */
const ANON_SCOPE = 'anon'
/** 记住「上一次是谁」，让刷新后的首帧就落在他的那份偏好上 */
const SCOPE_KEY = 'todone_pref_scope'

function resolveInitialScope(): string {
  // 没有有效登录票时一律用 anon：demo 不该读写某个真实账号的偏好
  if (readTokenState(TOKEN_KEY) !== 'valid') return ANON_SCOPE
  return localStorage.getItem(SCOPE_KEY) || ANON_SCOPE
}

let scope = resolveInitialScope()

function storageKey(base: string, id: string): string {
  return `${base}:${id}`
}

function readFlag(base: string, fallback: boolean): boolean {
  const raw = localStorage.getItem(storageKey(base, scope))
  return raw === null ? fallback : raw === '1'
}

function writeFlag(base: string, value: boolean): void {
  localStorage.setItem(storageKey(base, scope), value ? '1' : '0')
}

/** 默认开启：没有记录（新账号 / 新设备）就是开 */
const confirmDelete = ref(readFlag(CONFIRM_DELETE_KEY, true))

/** 侧边栏是否折叠：默认展开 */
const sidebarCollapsed = ref(readFlag(SIDEBAR_COLLAPSED_KEY, false))

/**
 * 切换偏好作用域（登录 / 注册 / 拉到资料 / 退出时调用）。
 * 换到某个账号时重新读它的那份；没有记录即回到默认值（确认开、侧栏展开）。
 */
export function setPreferenceScope(userId: string | null): void {
  const next = userId || ANON_SCOPE
  if (next === scope) return
  scope = next
  if (next === ANON_SCOPE) localStorage.removeItem(SCOPE_KEY)
  else localStorage.setItem(SCOPE_KEY, next)
  confirmDelete.value = readFlag(CONFIRM_DELETE_KEY, true)
  sidebarCollapsed.value = readFlag(SIDEBAR_COLLAPSED_KEY, false)
}

export function usePreferences() {
  function setConfirmDelete(value: boolean) {
    confirmDelete.value = value
    writeFlag(CONFIRM_DELETE_KEY, value)
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
    writeFlag(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed.value)
  }

  /** 显式设置（2026-10-26）：窗口宽度跨过阈值时由布局调用，自动收 / 自动展开 */
  function setSidebarCollapsed(value: boolean) {
    if (sidebarCollapsed.value === value) return
    sidebarCollapsed.value = value
    writeFlag(SIDEBAR_COLLAPSED_KEY, value)
  }

  /** 单向下压：窗口缩到阈值以下时自动折叠，已折叠则什么都不做 */
  function collapseSidebar() {
    setSidebarCollapsed(true)
  }

  return {
    confirmDelete,
    setConfirmDelete,
    sidebarCollapsed,
    toggleSidebar,
    setSidebarCollapsed,
    collapseSidebar,
  }
}

/**
 * 单条删除类操作统一的二次确认入口。
 * 偏好关掉时直接放行（返回 true）；用户点取消或按 Esc 返回 false。
 */
export async function confirmDestructive(
  message: string,
  title: string,
  confirmText = '删除',
): Promise<boolean> {
  if (!confirmDelete.value) return true
  try {
    await ElMessageBox.confirm(message, title, {
      confirmButtonText: confirmText,
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger',
    })
    return true
  } catch {
    return false
  }
}
