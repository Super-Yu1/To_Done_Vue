/**
 * 演示模式的示范数据（8.6）：约 24 条，覆盖两种状态（未完成 / 已完成，含已逾期若干）、
 * 四档优先级、有/无截止时间、有/无配图。**不落库**：库里没有任何演示账号，本文件就是全部数据来源。
 *
 * 时间一律用「相对今天」生成（见 utils/date 的 isoDaysFromNow），
 * 否则写死绝对日期后，「逾期若干」会随时间推移而失效。
 */
import { placeholderImage } from './placeholder'
import { TASK_PRIORITY_LABEL, TASK_STATUS_LABEL } from '@/constants'
import { isoDaysFromNow } from '@/utils/date'
import type { Task, TaskImage, TaskPriority, TaskStatus } from '@/types'

interface DemoSeed {
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  /** 截止时间：相对今天的天数；null 表示不设截止时间 */
  dueInDays?: number | null
  dueHour?: number
  /** 记录时间：几天前（越小越新） */
  recordedDaysAgo: number
  /** 已完成的任务：几天前完成的 */
  completedDaysAgo?: number
  /** 配图数量（0 表示无配图） */
  images?: number
}

const SEEDS: DemoSeed[] = [
  {
    title: '完成系统设计说明书终稿',
    description: '把评审意见回写进文档，版本号进位并同步修订记录。',
    status: 'TODO',
    priority: 'HIGH',
    dueInDays: 0,
    dueHour: 20,
    recordedDaysAgo: 0,
    images: 2,
  },
  {
    title: '把建表脚本在本地跑一遍',
    description: 'todone.sql 全量执行，确认五张表与索引都建出来。',
    status: 'TODO',
    priority: 'HIGH',
    dueInDays: 1,
    recordedDaysAgo: 0,
  },
  {
    title: '核对错误码表与后端实现',
    description: '附录 A 共 30 余条，逐条确认 HTTP 状态码与业务码的组合关系。',
    status: 'TODO',
    priority: 'MEDIUM',
    dueInDays: 3,
    recordedDaysAgo: 1,
  },
  {
    title: '整理图片压缩方案',
    description: '长边压到 1920、质量 0.85，GIF 不压；确认 WebP 的兼容边界。',
    status: 'DONE',
    priority: 'MEDIUM',
    dueInDays: -2,
    recordedDaysAgo: 6,
    completedDaysAgo: 2,
  },
  {
    title: '给回收站加「剩余天数」文案',
    description: '天数来自 stats 接口下发的 trashRetentionDays，前端不写死 90。',
    status: 'DONE',
    priority: 'HIGH',
    dueInDays: -4,
    recordedDaysAgo: 9,
    completedDaysAgo: 4,
  },
  {
    title: '排查登录偶发失败',
    description: '怀疑是 iat 与 password_updated_at 的比较精度问题，需截断到秒。',
    status: 'TODO',
    priority: 'HIGH',
    dueInDays: -1,
    recordedDaysAgo: 2,
    images: 1,
  },
  {
    title: '梳理瀑布流的列数断点',
    description: '断点按容器宽度而不是设备类型，宽屏 3 列 / 中等 2 列 / 窄屏 1 列。',
    status: 'TODO',
    priority: 'LOW',
    recordedDaysAgo: 3,
  },
  {
    title: '写 Nginx 限流配置说明',
    description: '/api/auth/** 与 /api/admin/auth/login 同策略；画 PNG 是 CPU 密集操作，验证码接口也要限。',
    status: 'TODO',
    priority: 'HIGH',
    dueInDays: 5,
    recordedDaysAgo: 3,
  },
  {
    title: '确认两套 JWT 密钥互不通用',
    description: '用户 token 进不了后台，管理员 token 也写不了任务。',
    status: 'DONE',
    priority: 'MEDIUM',
    dueInDays: -6,
    recordedDaysAgo: 12,
    completedDaysAgo: 6,
  },
  {
    title: '补充个人中心的头像裁剪交互',
    description: '选图后弹 1:1 取景框，可拖动缩放，确认才上传；取消保持原头像。',
    status: 'TODO',
    priority: 'MEDIUM',
    dueInDays: 8,
    recordedDaysAgo: 4,
    images: 3,
  },
  {
    title: '给任务卡片加勾选完成动效',
    description: '对勾描边 + 标题删除线自左向右展开，200ms，只动 opacity 与 transform。',
    status: 'TODO',
    priority: 'LOW',
    dueInDays: 6,
    recordedDaysAgo: 4,
  },
  {
    title: '检查深色模式下的对比度',
    description: '两套主题都要满足 WCAG AA，尤其是次要文字与分隔线。',
    status: 'TODO',
    priority: 'MEDIUM',
    dueInDays: 2,
    recordedDaysAgo: 5,
  },
  {
    title: '整理邮箱验证码的三个场景',
    description: 'REGISTER / RESET_PASSWORD / CHANGE_EMAIL 的附加校验各不相同，别写成一套。',
    status: 'DONE',
    priority: 'MEDIUM',
    dueInDays: -8,
    recordedDaysAgo: 14,
    completedDaysAgo: 8,
  },
  {
    title: '确认后台看不到用户任务',
    description: '隐私边界：管理员只管账号，后台接口不读 task 与 task_image，头像属账号资料可见。',
    status: 'DONE',
    priority: 'HIGH',
    dueInDays: -3,
    recordedDaysAgo: 11,
    completedDaysAgo: 3,
  },
  {
    title: '把「90 天可恢复」改成跟配置走',
    description: '前端文案取 stats 的 trashRetentionDays，配置改了文案自动跟。',
    status: 'TODO',
    priority: 'MEDIUM',
    dueInDays: 0,
    dueHour: 23,
    recordedDaysAgo: 1,
  },
  {
    title: '整理部署与回滚步骤',
    description: '五个容器直接 docker run；回滚要能在十分钟内完成并写进检查清单。',
    status: 'TODO',
    priority: 'HIGH',
    dueInDays: 12,
    recordedDaysAgo: 6,
  },
  {
    title: '给日期工具补边界用例',
    description: '空值、非法格式、跨年跨月都要覆盖，逾期判断还要排除已完成的任务。',
    status: 'TODO',
    priority: 'MEDIUM',
    dueInDays: 9,
    recordedDaysAgo: 7,
  },
  {
    title: '确认任务排序的优先级口径',
    description: '按业务权重排（低 → 中 → 高），不能按 VARCHAR 字典序，否则「高」会掉到最后。',
    status: 'DONE',
    priority: 'HIGH',
    dueInDays: -10,
    recordedDaysAgo: 16,
    completedDaysAgo: 10,
  },
  {
    title: '整理接口清单的 33 条',
    description: '标注哪 6 条免登录、哪 9 条走管理员 token，避免联调时对不上。',
    status: 'TODO',
    priority: 'MEDIUM',
    dueInDays: 4,
    recordedDaysAgo: 8,
  },
  {
    title: '确认单用户图片总量上限',
    description: '5000 张超限返回 2006；单任务 9 张用的是同一个错误码，提示文案要区分。',
    status: 'DONE',
    priority: 'LOW',
    dueInDays: -12,
    recordedDaysAgo: 18,
    completedDaysAgo: 12,
  },
  {
    title: '准备首次部署的检查清单',
    description: '包括证书申请、备份策略、容器重启顺序与上线后的观察项。',
    status: 'TODO',
    priority: 'MEDIUM',
    dueInDays: 15,
    recordedDaysAgo: 10,
    images: 4,
  },
  {
    title: '清理无用的脚手架文件',
    description: '把 create-vue 的示例组件与样式删掉，避免和实际实现混在一起。',
    status: 'DONE',
    priority: 'LOW',
    dueInDays: -5,
    recordedDaysAgo: 13,
    completedDaysAgo: 5,
  },
  {
    title: '给空状态补引导文案与按钮',
    description: '列表为空时要有说明和主操作，不留白。',
    status: 'TODO',
    priority: 'LOW',
    dueInDays: 7,
    recordedDaysAgo: 11,
  },
  {
    title: '回顾本周的决策记录',
    description: '把撤销条件再确认一遍：哪些假定一旦被推翻要回头改文档。',
    status: 'TODO',
    priority: 'MEDIUM',
    dueInDays: -1,
    recordedDaysAgo: 12,
  },
]

function buildImages(taskIndex: number, count: number): TaskImage[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `demo-image-${taskIndex + 1}-${index + 1}`,
    sortOrder: index + 1,
    objectKey: `task/demo/202610/demo-${taskIndex + 1}-${index + 1}.svg`,
    url: placeholderImage(index),
  }))
}

export const DEMO_TASKS: Task[] = SEEDS.map((seed, index) => ({
  id: `demo-${String(index + 1).padStart(2, '0')}`,
  title: seed.title,
  description: seed.description ?? null,
  status: seed.status,
  statusLabel: TASK_STATUS_LABEL[seed.status],
  priority: seed.priority,
  priorityLabel: TASK_PRIORITY_LABEL[seed.priority],
  dueDate: seed.dueInDays === null || seed.dueInDays === undefined ? null : isoDaysFromNow(seed.dueInDays, seed.dueHour ?? 18),
  completedAt:
    seed.status === 'DONE' ? isoDaysFromNow(-(seed.completedDaysAgo ?? 1), 15) : null,
  /*
   * 「今天记录」的取当前时刻之前一刻：演示模式里新建的任务用的是真实当前时间，
   * 若种子固定写 09:00，在凌晨打开时新建的任务反而会掉到它们下面，看着像没生效。
   */
  recordedAt:
    seed.recordedDaysAgo === 0
      ? isoDaysFromNow(0, Math.max(0, new Date().getHours() - 1))
      : isoDaysFromNow(-seed.recordedDaysAgo, 9),
  images: buildImages(index, seed.images ?? 0),
}))
// 不在这里排序：展示顺序由 utils/task 的 groupTasksByState 统一决定，避免两处排序规则打架
