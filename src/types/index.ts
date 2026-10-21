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
 * 不含 onlyUnfinished：状态筛选已由两态状态取代。
 * 排序参数直接透传后端，前端不做本地重排 —— 顺序完全以服务端为准。
 */
/** 统计栏上的快捷筛选（2026-10-18）：逾期 / 今日到期 / 高优先级，三选一 */
export type TaskQuickFilter = 'overdue' | 'dueToday' | 'high'

export interface TaskQuery {
  page: number
  size: number
  keyword?: string
  status?: TaskStatus
  priority?: TaskPriority
  /**
   * 快捷筛选（2026-10-18 后端新增，口径与 `/tasks/stats` 一致）：
   * `overdue` = 未完成且截止早于现在；`dueToday` = 未完成且截止落在今天。
   * 不传 = 不筛；前端只传 true，取消筛选时直接删掉字段。
   */
  /**
   * 只看未完成（2026-10-21 修复）：= `status != DONE`，即 **TODO + IN_PROGRESS**。
   * 快捷筛选（逾期 / 今日到期 / 高优先级）都用它，**不要再用 `status=TODO`** ——
   * 那会把 IN_PROGRESS 的任务排除掉，与 stats 的数字对不上。
   */
  onlyUnfinished?: boolean
  overdue?: boolean
  dueToday?: boolean
  /**
   * 排序（2026-10-18 接入）：两者都不传 = 沿用后端固定规则（未完成在前、按创建时间）。
   * 后端允许 `recordedAt / dueDate / priority / completedAt`，方向 pattern 是 **小写** `asc|desc`
   * （历史上发大写 `DESC` 被判过 400，别再用大写）。
   * 稳定规则由后端保证：无截止时间的恒排最后、优先级排序内按截止时间升序、同分按 id 倒序。
   */
  sortBy?: 'recordedAt' | 'dueDate' | 'priority' | 'completedAt'
  sortDirection?: 'asc' | 'desc'
}



/** 回收站查询条件（6.5 ⑩，按 deletedAt DESC） */
export interface TrashQuery {
  page: number
  size: number
  /** 标题或描述模糊匹配（忽略大小写）；空串不发送（2026-10-18 后端新增该参数） */
  keyword?: string
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
  /**
   * 图形码（2026-10-14 定稿）：只在「获取验证码」时用一次，注册提交不再带。
   * 后端已把注册接口的这两个字段改为可选并忽略（2026-10-15 确认），保留为可选仅为兼容。
   */
  captchaId?: string
  captchaCode?: string
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

/**
 * 头像上传响应（6.5 ⑨）：返回新的预签名直链。
 * 换头像后旧 URL 立即失效（后端已删旧对象），所以必须用这里的值替换本地缓存的那个。
 */
export interface AvatarVO {
  avatarUrl: string
}

/** 修改资料：phone 传空串即解绑（6.5 ⑤） */
export interface UpdateProfilePayload {
  name?: string
  phone?: string
}

export interface ChangeEmailPayload {
  /** 新邮箱 */
  email: string
  /** 新邮箱收到的验证码 */
  emailCode: string
  /**
   * 当前（旧）邮箱收到的验证码（2026-10-18）。
   * 换邮箱必须两个码都校验通过；后端需在 `PUT /users/me/email` 里消费并校验它。
   */
  oldEmailCode: string
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

/**
 * 验证码场景（2026-10-18 新增 `CHANGE_EMAIL_OLD`）：
 * 换邮箱要先把码发到当前邮箱，再发到新邮箱；旧邮箱场景由后端校验「收件邮箱 = 当前登录邮箱」。
 */
export type EmailCodeScene = 'REGISTER' | 'RESET_PASSWORD' | 'CHANGE_EMAIL' | 'CHANGE_EMAIL_OLD'

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

/** 后台创建用户（8.9 新增）：只填邮箱 + 用户名，密码由服务端随机生成 */
export interface AdminUserCreatePayload {
  email: string
  name: string
}

/** 后台创建用户的结果：initialPassword 只在本次响应里返回一次（服务端不存明文） */
export interface AdminUserCreateResult {
  user: AdminUser
  initialPassword: string
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
