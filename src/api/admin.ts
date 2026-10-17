/** 后台管理接口（6.4 #25~#33、6.5 ⑫）——全部走管理员 token */
import { request } from './http'
import type {
  AdminAuthResult,
  AdminInfo,
  AdminLoginPayload,
  AdminUser,
  AdminUserCreatePayload,
  AdminUserCreateResult,
  AdminUserQuery,
  AdminUserUpdatePayload,
  CreateAdminPayload,
  FreezePayload,
  PageResult,
} from '@/types'

/** 管理员登录（须过图形验证码） */
export function adminLogin(payload: AdminLoginPayload): Promise<AdminAuthResult> {
  return request<AdminAuthResult>({ url: '/admin/auth/login', method: 'POST', data: payload })
}

/** 用户列表（分页 + 按邮箱/用户名/手机号搜索 + 状态筛选；不传 status = 正常 + 已冻结） */
export function fetchAdminUsers(params: AdminUserQuery): Promise<PageResult<AdminUser>> {
  return request<PageResult<AdminUser>>({ url: '/admin/users', method: 'GET', params })
}

/**
 * 创建用户（管理员直接建号，不需要邮箱验证码与图形码）。
 * 响应里的 initialPassword 是唯一一次明文：服务端只存 BCrypt、不写日志，必须立刻展示并复制。
 * 邮箱已被活跃账号占用 → 1002；已注销账号占用的邮箱可复用。
 */
export function createAdminUser(payload: AdminUserCreatePayload): Promise<AdminUserCreateResult> {
  return request<AdminUserCreateResult>({ url: '/admin/users', method: 'POST', data: payload })
}

/** 用户详情（含任务数、图片数、冻结信息） */
export function fetchAdminUser(id: string): Promise<AdminUser> {
  return request<AdminUser>({ url: `/admin/users/${id}`, method: 'GET' })
}

/** 修改用户资料（用户名 / 邮箱；手机号不在此接口内） */
export function updateAdminUser(id: string, payload: AdminUserUpdatePayload): Promise<void> {
  return request<void>({ url: `/admin/users/${id}`, method: 'PUT', data: payload })
}

/** 冻结 / 解冻 */
export function setUserFrozen(id: string, payload: FreezePayload): Promise<void> {
  return request<void>({ url: `/admin/users/${id}/status`, method: 'PATCH', data: payload })
}

/** 重置用户密码（旧密码立即失效，响应不回显密码） */
export function resetUserPassword(id: string, newPassword: string): Promise<void> {
  return request<void>({
    url: `/admin/users/${id}/password`,
    method: 'PUT',
    data: { newPassword },
  })
}

/** 注销用户（软删除，不可恢复） */
export function deleteUser(id: string): Promise<void> {
  return request<void>({ url: `/admin/users/${id}`, method: 'DELETE' })
}

/** 管理员列表（只读，不含任何凭证字段） */
export function fetchAdmins(): Promise<AdminInfo[]> {
  return request<AdminInfo[]>({ url: '/admin/admins', method: 'GET' })
}

/** 新增管理员（已有管理员不可改、不可删） */
export function createAdmin(payload: CreateAdminPayload): Promise<void> {
  return request<void>({ url: '/admin/admins', method: 'POST', data: payload })
}
