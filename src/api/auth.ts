/**
 * 认证与账号接口（6.4 #3~#11、6.5 ③④⑤⑨）。
 * 用户资料接口（/users/me）归这里，因为它们的调用点都在登录态与个人中心。
 */
import { request, upload } from './http'
import type {
  AuthResult,
  AvatarVO,
  ChangeEmailPayload,
  ChangePasswordPayload,
  EmailCodeResult,
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

/**
 * 给当前登录邮箱发验证码（2026-10-18 后端新增）：
 * 无请求体、免图形码，收件人由服务端取；换邮箱时「验证当前邮箱」走这个端点。
 */
export function sendCurrentEmailCode(): Promise<EmailCodeResult> {
  return request<EmailCodeResult>({ url: '/users/me/email-code', method: 'POST' })
}

/** 更换邮箱（旧邮箱码 + 新邮箱码，两个都校验通过才生效） */
export function changeEmail(payload: ChangeEmailPayload): Promise<void> {
  return request<void>({ url: '/users/me/email', method: 'PUT', data: payload })
}

/** 修改密码（需原密码，改完须重新登录） */
export function changePassword(payload: ChangePasswordPayload): Promise<void> {
  return request<void>({ url: '/users/me/password', method: 'PUT', data: payload })
}

/** 上传 / 替换头像（multipart，字段名 file；前端裁成 1:1 后上传）→ 返回新的预签名直链 */
export function uploadAvatar(file: File): Promise<AvatarVO> {
  const form = new FormData()
  form.append('file', file)
  return upload<AvatarVO>('/users/me/avatar', form)
}

/** 移除头像（本来就没有头像时也返回成功） */
export function removeAvatar(): Promise<void> {
  return request<void>({ url: '/users/me/avatar', method: 'DELETE' })
}

/**
 * 注销账号（不可恢复，2026-10-18 后端新增）：
 * 后端只校验密码这一道闸；成功后任务与回收站被物理清空（含配图），账号行保留但无法再登录
 * （唯一键是 `deleted_at IS NULL` 的部分索引，同一邮箱可当场重新注册）。
 * 返回清掉的任务数 / 配图数，可直接用在提示里。
 */
export function deleteAccount(
  password: string,
): Promise<{ purgedTasks: number; purgedImages: number }> {
  return request<{ purgedTasks: number; purgedImages: number }>({
    url: '/users/me',
    method: 'DELETE',
    data: { password },
  })
}
