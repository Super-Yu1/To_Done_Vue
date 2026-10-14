/**
 * 后台：管理员登录态 + 用户列表 + 管理员列表（见 8.3、6.5 ⑫）。
 * 与用户端完全隔离：只读写 todone_admin_token（8.2 的另一套守卫）。
 */
import { reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import * as adminApi from '@/api/admin'
import { ADMIN_INFO_KEY, ADMIN_TOKEN_KEY, PAGE_SIZE } from '@/constants'
import { readTokenState } from '@/utils/token'
import type {
  AdminInfo,
  AdminLoginPayload,
  AdminUser,
  AdminUserQuery,
  AdminUserUpdatePayload,
  CreateAdminPayload,
  UserStatus,
} from '@/types'

/** 读回持久化的管理员展示信息；内容损坏时按未知处理，不阻塞后台使用 */
function readStoredAdmin(): AdminInfo | null {
  const raw = localStorage.getItem(ADMIN_INFO_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AdminInfo
  } catch {
    localStorage.removeItem(ADMIN_INFO_KEY)
    return null
  }
}

export const useAdminStore = defineStore('admin', () => {
  const token = ref(
    readTokenState(ADMIN_TOKEN_KEY) === 'valid' ? (localStorage.getItem(ADMIN_TOKEN_KEY) ?? '') : '',
  )
  const admin = ref<AdminInfo | null>(readStoredAdmin())

  const query = reactive<AdminUserQuery>({
    page: 1,
    size: PAGE_SIZE,
    keyword: '',
    /** 不传 = 正常 + 已冻结，默认不含已注销（6.5 ⑫） */
    status: undefined,
  })

  const users = ref<AdminUser[]>([])
  const total = ref(0)
  const admins = ref<AdminInfo[]>([])
  const loading = ref(false)

  async function login(payload: AdminLoginPayload) {
    const result = await adminApi.adminLogin(payload)
    token.value = result.token
    localStorage.setItem(ADMIN_TOKEN_KEY, result.token)
    admin.value = result.admin
    localStorage.setItem(ADMIN_INFO_KEY, JSON.stringify(result.admin))
  }

  function logout() {
    token.value = ''
    admin.value = null
    users.value = []
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    localStorage.removeItem(ADMIN_INFO_KEY)
  }

  function buildParams(): AdminUserQuery {
    const params: AdminUserQuery = { ...query }
    if (!params.keyword) delete params.keyword
    if (!params.status) delete params.status
    return params
  }

  async function fetchUsers(page = 1) {
    loading.value = true
    query.page = page
    try {
      const result = await adminApi.fetchAdminUsers(buildParams())
      users.value = result.records
      total.value = result.total
    } finally {
      loading.value = false
    }
  }

  function fetchUser(id: string) {
    return adminApi.fetchAdminUser(id)
  }

  /** 改资料（名字 / 邮箱）；改了邮箱该用户会被强制重新登录（6.5 ⑫） */
  async function updateUser(id: string, payload: AdminUserUpdatePayload) {
    await adminApi.updateAdminUser(id, payload)
    await fetchUsers(query.page)
  }

  async function setFrozen(id: string, frozen: boolean, reason?: string) {
    await adminApi.setUserFrozen(id, { frozen, reason })
    await fetchUsers(query.page)
  }

  /** 注销（软删除、不可恢复） */
  async function setDeleted(id: string) {
    await adminApi.deleteUser(id)
    await fetchUsers(query.page)
  }

  async function resetPassword(id: string, newPassword: string) {
    await adminApi.resetUserPassword(id, newPassword)
  }

  async function fetchAdmins() {
    admins.value = await adminApi.fetchAdmins()
  }

  async function createAdmin(payload: CreateAdminPayload) {
    await adminApi.createAdmin(payload)
    await fetchAdmins()
  }

  /** 状态筛选（含「全部」= undefined） */
  function setStatusFilter(status?: UserStatus) {
    query.status = status
    return fetchUsers(1)
  }

  return {
    token,
    admin,
    query,
    users,
    total,
    admins,
    loading,
    login,
    logout,
    fetchUsers,
    fetchUser,
    updateUser,
    setFrozen,
    setDeleted,
    resetPassword,
    fetchAdmins,
    createAdmin,
    setStatusFilter,
  }
})
