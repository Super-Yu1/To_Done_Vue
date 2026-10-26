/** 全局常量与字典（字典口径见系统设计说明书 6.5 ⑥ / ⑫，附录 D） */
import type { TaskPriority, TaskStatus, UserStatus } from '@/types'

/** localStorage 键：两套 token 互不通用（7.11），主题键见 8.7 */
export const TOKEN_KEY = 'todone_token'
export const ADMIN_TOKEN_KEY = 'todone_admin_token'
/**
 * 管理员展示信息（用户名 / 上次登录时间）的持久化键：后端没有「当前管理员」接口，
 * 刷新后要还原 8.9 顶栏就只能存这一份非凭证信息（不含密码、不含密钥）。
 */
export const ADMIN_INFO_KEY = 'todone_admin_info'
export const THEME_KEY = 'app-theme'
/**
 * 「删除前二次确认」偏好（2026-10-18）：本地开关，默认开启。
 * 只影响单条删除类操作（回收站的彻底删除）；清空回收站仍强制输入「清空」二字。
 */
export const CONFIRM_DELETE_KEY = 'todone_confirm_delete'
/** 侧边栏折叠状态（2026-10-26）：纯本地偏好，'1' = 收起成图标条 */
export const SIDEBAR_COLLAPSED_KEY = 'todone_sidebar_collapsed'

/** 分页与查询（6.6） */
export const PAGE_SIZE = 20
export const PAGE_SIZE_MAX = 100
export const SEARCH_DEBOUNCE_MS = 300

/** 文件与图片（附录 D） */
export const TASK_MAX_IMAGES = 9
export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024
export const UPLOAD_ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'webp', 'gif']
export const AVATAR_OUTPUT_SIZE = 512

/** 验证码（3.2） */
export const EMAIL_CODE_LENGTH = 6
export const EMAIL_CODE_RESEND_SECONDS = 60

/** 密码规则（6.5 ③）：最短 8 位，且必须同时包含字母与数字 */
export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/
export const PASSWORD_HINT = '至少 8 位，且同时包含字母与数字'

export interface Option<T> {
  value: T
  label: string
}

/** 任务状态字典（两态，见 types/TaskStatus） */
export const TASK_STATUS_OPTIONS: Option<TaskStatus>[] = [
  { value: 'TODO', label: '未完成' },
  { value: 'DONE', label: '已完成' },
]

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: '未完成',
  DONE: '已完成',
}

/** 优先级字典：只有低 / 中 / 高三档（2026-10-10 需求变更，去掉「紧急」） */
export const TASK_PRIORITY_OPTIONS: Option<TaskPriority>[] = [
  { value: 'LOW', label: '低' },
  { value: 'MEDIUM', label: '中' },
  { value: 'HIGH', label: '高' },
]

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
}

/**
 * 优先级胶囊的样式类（2026-10-15 改版）：样式在 main.css 的 .prio / .prio--* 里定义，
 * 这里只给出「三档 → 类名」的映射，组件用 :class 挂上去即可，避免各处再写一遍色值。
 */
export const TASK_PRIORITY_CLASS: Record<TaskPriority, string> = {
  LOW: 'prio--low',
  MEDIUM: 'prio--medium',
  HIGH: 'prio--high',
}

/*
 * 优先级权重与排序选项已移除：列表顺序改为固定规则（见 utils/task），
 * 前端不再按优先级排序，6.5 ⑥ 的「priority 按业务权重排」由后端实现。
 */

/** 后台用户状态（6.5 ⑫：不传 = 正常 + 已冻结，默认不含已注销） */
export const USER_STATUS_OPTIONS: Option<UserStatus>[] = [
  { value: 'NORMAL', label: '正常' },
  { value: 'FROZEN', label: '已冻结' },
  { value: 'DELETED', label: '已注销' },
]

export const USER_STATUS_LABEL: Record<UserStatus, string> = {
  NORMAL: '正常',
  FROZEN: '已冻结',
  DELETED: '已注销',
}
