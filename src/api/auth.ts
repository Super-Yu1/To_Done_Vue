/**
 * 认证与账号接口（6.4 #3~#11、6.5 ③④⑤⑨）。
 * 用户资料接口（/users/me）归这里，因为它们的调用点都在登录态与个人中心。
 */
import { request, upload } from './http'
import type {
  AuthResult,
  ChangeEmailPayload,
  ChangePasswordPayload,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
  UpdateProfilePayload,
  User,
} from '@/types'

/** 注册（邮箱验证码 + 图形验证码） */
export function register(payload: RegisterPayload): Promise<AuthResult> {
  return request<AuthResult>({ url: '/auth/register', method: 'POST', data: payload })
}

/** 登录（只认邮箱 + 图形验证码） */
export function login(payload: LoginPayload): Promise<AuthResult> {
  return request<AuthResult>({ url: '/auth/login', method: 'POST', data: payload })
}

/** 找回密码：邮箱不存在时后端也返回成功（防枚举） */
export function resetPassword(payload: ResetPasswordPayload): Promise<void> {
  return request<void>({ url: '/auth/password/reset', method: 'POST', data: payload })
}

/** 当前用户信息 */
export function getProfile(): Promise<User> {
  return request<User>({ url: '/users/me', method: 'GET' })
}

/** 修改资料：只改传了的字段，phone 传空串即解绑 */
export function updateProfile(payload: UpdateProfilePayload): Promise<User> {
  return request<User>({ url: '/users/me', method: 'PUT', data: payload })
}

/** 更换邮箱（须带新邮箱验证码） */
export function changeEmail(payload: ChangeEmailPayload): Promise<void> {
  return request<void>({ url: '/users/me/email', method: 'PUT', data: payload })
}

/** 修改密码（需原密码，改完须重新登录） */
export function changePassword(payload: ChangePasswordPayload): Promise<void> {
  return request<void>({ url: '/users/me/password', method: 'PUT', data: payload })
}

/** 上传 / 替换头像（multipart，字段名 file；前端裁成 1:1 后上传） */
export function uploadAvatar(file: File): Promise<void> {
  const form = new FormData()
  form.append('file', file)
  return upload<void>('/users/me/avatar', form)
}

/** 移除头像（本来就没有头像时也返回成功） */
export function removeAvatar(): Promise<void> {
  return request<void>({ url: '/users/me/avatar', method: 'DELETE' })
}
