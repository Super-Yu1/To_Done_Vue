/**
 * 后台：管理员登录态 + 用户列表 + 管理员列表 + 登录审计（见 8.3、6.5 ⑫）。
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
  AdminUserCreatePayload,
  AdminUserQuery,
  AdminUserUpdatePayload,
  CreateAdminPayload,
  LoginAudit,
  LoginAuditQuery,
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

  /** 登录审计（2026-10-31）：与用户列表同一套分页口径，筛选条件各自独立 */
  const auditQuery = reactive<LoginAuditQuery>({
    page: 1,
    size: PAGE_SIZE,
    actorType: undefined,
    result: undefined,
    account: '',
    from: undefined,
    to: undefined,
  })
  const audits = ref<LoginAudit[]>([])
  const auditTotal = ref(0)
  const auditLoading = ref(false)

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
    audits.value = []
    auditTotal.value = 0
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

  /**
   * 建号（8.9 新增）：只填邮箱 + 用户名，密码由服务端生成。
   * 结果原样返回、不缓存——initialPassword 只该出现在调用方手里那一次；
   * 列表刷新由调用方在「初始密码」弹窗关闭后触发。
   */
  function createUser(payload: AdminUserCreatePayload) {
    return adminApi.createAdminUser(payload)
  }

  /** 改资料（用户名 / 邮箱）；改了邮箱该用户会被强制重新登录（6.5 ⑫） */
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

  /**
   * 解禁登录锁定（2026-10-31）：接口幂等，没锁也成功。
   * 锁定的依据是列表里的 `lockedUntil`，所以必须回查当前页 —— 解禁后那一行要立刻变回正常。
   */
  async function unlock(id: string) {
    await adminApi.unlockUser(id)
    await fetchUsers(query.page)
  }

  /** 审计查询：空串 / 未选一律不发送（后端把空字符串当筛选条件会筛出空结果） */
  function buildAuditParams(): LoginAuditQuery {
    const params: LoginAuditQuery = { ...auditQuery }
    if (!params.account) delete params.account
    if (!params.actorType) delete params.actorType
    if (!params.result) delete params.result
    if (!params.from) delete params.from
    if (!params.to) delete params.to
    return params
  }

  async function fetchAudits(page = auditQuery.page) {
    auditLoading.value = true
    auditQuery.page = page
    try {
      const result = await adminApi.fetchLoginAudits(buildAuditParams())
      audits.value = result.records
      auditTotal.value = result.total
    } finally {
      auditLoading.value = false
    }
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
    auditQuery,
    audits,
    auditTotal,
    auditLoading,
    login,
    logout,
    fetchUsers,
    fetchUser,
    createUser,
    updateUser,
    setFrozen,
    setDeleted,
    resetPassword,
    unlock,
    fetchAudits,
    fetchAdmins,
    createAdmin,
    setStatusFilter,
  }
})
