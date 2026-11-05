/**
 * 新手漫游的「该不该自动弹」判定（2026-11-01）。
 *
 * 只回答一个问题：**这个账号是不是还没开始用**。不碰 UI、不碰路由 ——
 * 漫游本身在 `components/OnboardingTour.vue`，步骤文案也在这里（`taskTourSteps`）。
 *
 * 判定用两条（用户口径，2026-11-01 定稿）：
 *   ① 账号创建不到 `FRESH_ACCOUNT_DAYS` 天；
 *   ② 该账号下**一条任务都没有**（含回收站，由 `todo.stats` 的 `total + trashCount` 给出）。
 * 不用 localStorage 记「看过了」：那是**按设备**记的，旧账号换台电脑登录时本机没有记录，
 * 会把这个已经用过很久的账号当成新人（2026-11-01 修掉的 Bug）。
 * 现在这两条都由**账号本身**的状态决定，换什么设备结论都一样；而且「建了第一条任务」
 * 之后条件 ② 永久不成立，引导自然退役，不需要再记别的状态。
 *
 * ⚠ 代价：只满足①②时每进一次任务页都会放一遍（没有「看过了」这层记忆）。
 *   这是刻意的取舍 —— 有任务就不再打扰，比「猜他看没看过」更可靠。
 */

/** 一个漫游步骤：`target` 留空 = 居中卡片（开场 / 收尾用） */
export interface OnboardingStep {
  /** CSS 选择器：指向要高亮的那块界面；空字符串表示不指向任何元素 */
  target: string
  title: string
  description: string
  /** 卡片相对目标的位置，默认 bottom */
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end' | 'left-start' | 'left-end' | 'right-start' | 'right-end'
}

/**
 * 任务页的漫游步骤。**两处入口共用这一套**，只有「侧栏底部是什么」那句不同：
 *   · `'app'`  —— 登录后的任务页：底部是主题、折叠侧栏、账号菜单；
 *   · `'demo'` —— 演示模式：底部是主题、「去登录」与折叠。
 * 目标是 CSS 选择器，**目标不存在的那一步会被 `OnboardingTour` 自动跳过**
 * （空列表就没有「一张卡」那步，接口没回来可能连概览卡都没有），所以这里按「理想页面」写。
 */
export type OnboardingVariant = 'app' | 'demo'

export function taskTourSteps(variant: OnboardingVariant): OnboardingStep[] {
  const sidebarTips =
    variant === 'demo'
      ? '「任务 / 回收站」在这里切换；底部那一排是「去登录」、主题与折叠。'
      : '「任务 / 回收站」在这里切换；底部那一排是主题、折叠侧栏和账号菜单。'

  return [
    {
      target: '',
      title: '先花 20 秒熟悉一下',
      description:
        '这一屏就四块：左边的导航、上面的进度、中间的工具栏、下面的一列任务。随时可以按 Esc 或右上角 × 跳过。',
      placement: 'bottom',
    },
    { target: '.sidebar', title: '侧栏：切换与设置', description: sidebarTips, placement: 'right-start' },
    {
      target: '.summary',
      title: '今天还剩多少',
      description:
        '这行写的是今天的进度。右边三枚胶囊可以只看「逾期 / 今日到期 / 高优先级」，再点一次取消。',
      placement: 'bottom',
    },
    {
      target: '.filter-bar',
      title: '找得到，也建得了',
      description:
        '左边搜标题或描述，中间切页签与排序，右边「新建任务」打开完整表单（标题 / 描述 / 配图 / 优先级 / 截止时间）。',
      placement: 'bottom',
    },
    {
      target: '.task-row',
      title: '一张卡就是一件事',
      description: '点整行编辑，点左边的圆圈直接完成，有配图的点缩略图看大图；悬停行尾还能删除。',
      placement: 'bottom',
    },
    {
      target: '.quick-add',
      title: '随手记一条',
      description: '最后这张虚线卡是快速录入：写一句回车就存下来，细节以后再补。',
      placement: 'top',
    },
  ]
}

/** 条件①：账号创建不到这么多天算「新人」（用户口径：7 天） */
export const FRESH_ACCOUNT_DAYS = 7

/**
 * 账号算不算「新的」。`createdAt` 是后端给的 `yyyy-MM-dd'T'HH:mm:ss`（无时区），
 * `Date.parse` 按本地时间解析，与全站 `formatDateTime` 的口径一致。
 * **解析不出来就当「不是新账号」**：判不了就别打扰（这也是修那个误弹 Bug 的方向）。
 */
export function isFreshAccount(createdAt: string | null | undefined): boolean {
  if (!createdAt) return false
  const created = Date.parse(createdAt)
  if (!Number.isFinite(created)) return false
  return Date.now() - created < FRESH_ACCOUNT_DAYS * 24 * 60 * 60 * 1000
}

/**
 * 条件②：账号下一条任务都没有（回收站里的也算）。
 * 数据来自 `/tasks/stats` 的 `total`（任务总数，不含回收站）与 `trashCount` —— 页面首屏
 * 本来就会拉一次统计，不用为此多发请求。**统计还没回来（null）时返回 false**：
 * 判不了就不弹，宁可少讲一遍。
 */
export function isAccountUntouched(stats: { total: number; trashCount: number } | null): boolean {
  if (!stats) return false
  return stats.total === 0 && stats.trashCount === 0
}
