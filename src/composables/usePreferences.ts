/**
 * 本地偏好（2026-10-18）：目前只有「删除前二次确认」。
 *
 * 为什么存本地而不是跟后端要字段：它是个纯客户端的手感偏好，换设备不必同步；
 * 用模块级 ref 是为了让「个人中心里改」与「回收站里用」共享同一份状态，切页不用重读。
 */
import { ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { CONFIRM_DELETE_KEY } from '@/constants'

/** 默认开启：值是 '0' 才算关掉 */
const confirmDelete = ref(localStorage.getItem(CONFIRM_DELETE_KEY) !== '0')

export function usePreferences() {
  function setConfirmDelete(value: boolean) {
    confirmDelete.value = value
    localStorage.setItem(CONFIRM_DELETE_KEY, value ? '1' : '0')
  }

  return { confirmDelete, setConfirmDelete }
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
