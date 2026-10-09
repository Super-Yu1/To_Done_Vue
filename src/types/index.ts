/**
 * 与后端 DTO 一一对应的 TS 类型（见系统设计说明书 6.2 / 6.5 / 8.9）。
 * 命名与字段严格照文档，后端 Swagger 是最终权威；不一致时先改这里再改文档。
 */

/** 统一响应（6.2） */
export interface ApiResult<T> {
  code: number
  message: string
  data: T
  timestamp: number
}

/** 分页数据（6.2） */
export interface PageResult<T> {
  records: T[]
  total: number
  page: number
  size: number
  totalPages: number
}

/**
 * 任务状态只有两种（2026-10-09 需求变更，原三态 TODO / IN_PROGRESS / DONE 收敛为两态）。
 * 后端 TaskStatus 枚举需同步收敛；数据库 status 列无 CHECK，改枚举不必动 DDL。
 */
export type TaskStatus = 'TODO' | 'DONE'
/** 优先级只有低 / 中 / 高三档（2026-10-10 需求变更，去掉「紧急」） */
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH'

/** 配图（6.5 ⑥）：id 是更新任务时构造 imageOrder 的依据，必须保留 */
export interface TaskImage {
  id: string
  sortOrder: number
  objectKey: string
  url: string
}

/** 任务列表 / 详情元素（6.5 ⑥⑦），数组已按 sortOrder 升序 */
export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  statusLabel: string
  priority: TaskPriority
  priorityLabel: string
  dueDate: string | null
  completedAt: string | null
  recordedAt: string
  images: TaskImage[]
}

/** 回收站元素 = 任务 + 删除时间与剩余天数（6.5 ⑩） */
export interface TrashTask extends Task {
  deletedAt: string
  remainingDays: number
}

/** 统计概览（6.5 ⑪），trashRetentionDays 用于渲染「{N} 天内可恢复」文案 */
export interface TaskStats {
  total: number
  todo: number
  inProgress: number
  done: number
  overdue: number
  dueToday: number
  completionRate: number
  trashCount: number
  trashRetentionDays: number
}

/**
 * 任务列表查询条件（6.5 ⑥ + 6.6）。
 * 说明：界面不再发送 onlyUnfinished（被两态状态筛选取代）与 sortBy / sortDirection
 * （顺序改为固定规则，见 utils/task），这两个字段保留是因为后端接口仍接受它们。
 */
export interface TaskQuery {
  page: number
  size: number
  keyword?: string
  status?: TaskStatus
  priority?: TaskPriority
  sortBy?: TaskSortField
  sortDirection?: 'ASC' | 'DESC'
}

export type TaskSortField = 'recordedAt' | 'dueDate' | 'priority'

/** 回收站查询条件（6.5 ⑩，按 deletedAt DESC） */
export interface TrashQuery {
  page: number
  size: number
}

/** 用户（6.5 ⑤） */
export interface User {
  id: string
  email: string
  name: string
  phone: string | null
  avatarUrl: string | null
  createdAt: string
}

/** 注册 / 登录响应（6.5 ③④） */
export interface AuthResult {
  token: string
  tokenType: string
  expiresInMinutes: number
  user: User
}

export interface RegisterPayload {
  email: string
  password: string
  name: string
  emailCode: string
  captchaId: string
  captchaCode: string
}

export interface LoginPayload {
  email: string
  password: string
  captchaId: string
  captchaCode: string
}

export interface ResetPasswordPayload {
  email: string
  emailCode: string
  newPassword: string
}

/** 修改资料：phone 传空串即解绑（6.5 ⑤） */
export interface UpdateProfilePayload {
  name?: string
  phone?: string
}

export interface ChangeEmailPayload {
  email: string
  emailCode: string
}

export interface ChangePasswordPayload {
  oldPassword: string
  newPassword: string
}

/** 任务新建 / 更新的 data 段（6.5 ⑦） */
export interface TaskPayload {
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  dueDate?: string | null
  refreshRecordedAt?: boolean
  /** 有序数组：已有图 ID 或占位符 'NEW'（按出现次序对应 images 段文件） */
  imageOrder?: string[]
}

/** 验证码（6.5 ①②） */
export interface CaptchaResult {
  captchaId: string
  image: string
  expiresInSeconds: number
}

export type EmailCodeScene = 'REGISTER' | 'RESET_PASSWORD' | 'CHANGE_EMAIL'

export interface EmailCodePayload {
  email: string
  scene: EmailCodeScene
  captchaId: string
  captchaCode: string
}

export interface EmailCodeResult {
  expiresInSeconds: number
  resendAfterSeconds: number
}

/** 后台：用户状态筛选（6.5 ⑫） */
export type UserStatus = 'NORMAL' | 'FROZEN' | 'DELETED'

/** 后台用户列表元素（6.5 ⑫） */
export interface AdminUser {
  id: string
  email: string
  phone: string | null
  name: string
  avatarUrl: string | null
  frozenAt: string | null
  frozenReason: string | null
  deletedAt: string | null
  taskCount: number
  taskCountInTrash: number
  imageCount: number
  imageCountInTrash: number
  createdAt: string
}

export interface AdminUserQuery {
  page: number
  size: number
  keyword?: string
  status?: UserStatus
}

export interface AdminUserUpdatePayload {
  name?: string
  email?: string
}

export interface FreezePayload {
  frozen: boolean
  reason?: string
}

/** 管理员（6.5 ⑫，列表不含任何凭证字段） */
export interface AdminInfo {
  id: string
  name: string
  lastLoginAt: string | null
  createdAt: string
}

export interface AdminLoginPayload {
  name: string
  password: string
  captchaId: string
  captchaCode: string
}

export interface AdminAuthResult {
  token: string
  tokenType: string
  expiresInMinutes: number
  admin: AdminInfo
}

export interface CreateAdminPayload {
  name: string
  password: string
}
