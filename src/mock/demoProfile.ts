/**
 * 演示模式的账号资料（8.6）：不落库，只用于个人中心的展示与交互演示。
 * 结构照 6.5 ⑤ 的 User，让演示页与真实页共用同一套渲染与校验。
 */
import { placeholderAvatar } from './placeholder'
import { isoDaysFromNow } from '@/utils/date'
import type { User } from '@/types'

export const DEMO_USER: User = {
  id: 'demo-user',
  email: 'zhilin@example.com',
  name: '林知远',
  phone: '13912345678',
  avatarUrl: placeholderAvatar('林'),
  createdAt: isoDaysFromNow(-46, 10),
}
