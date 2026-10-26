/**
 * 本地偏好：**删除前二次确认**（2026-10-18 引入，2026-10-27 统一到所有删除动作）。
 *
 * 为什么存本地而不是跟后端要字段：它是个纯客户端的手感偏好，换设备不必同步；
 * 用模块级 ref 是为了让「个人中心里改」与各处删除动作共享同一份状态，切页不用重读。
 *
 * 覆盖范围（2026-10-27 明确）：只覆盖**可恢复**的删除 —— 任务列表的单条删除与批量删除
 * （移入回收站，随时能捞回来）。回收站的「彻底删除」与「清空回收站」不可逆，**始终**二次确认，
 * 不受此开关影响。
 */
import { ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { CONFIRM_DELETE_KEY, SIDEBAR_COLLAPSED_KEY } from '@/constants'

/** 默认开启：值是 '0' 才算关掉 */
const confirmDelete = ref(localStorage.getItem(CONFIRM_DELETE_KEY) !== '0')

/** 侧边栏是否折叠（2026-10-26）：默认展开 */
const sidebarCollapsed = ref(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1')

export function usePreferences() {
  function setConfirmDelete(value: boolean) {
    confirmDelete.value = value
    localStorage.setItem(CONFIRM_DELETE_KEY, value ? '1' : '0')
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed.value ? '1' : '0')
  }

  /** 显式设置（2026-10-26）：窗口宽度跨过阈值时由布局调用，自动收 / 自动展开 */
  function setSidebarCollapsed(value: boolean) {
    if (sidebarCollapsed.value === value) return
    sidebarCollapsed.value = value
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, value ? '1' : '0')
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
