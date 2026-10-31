<script setup lang="ts">
/** 用户表格（8.9）：头像 · 邮箱 · 手机号 · 用户名 · 任务数 · 图片数 · 状态 · 注册时间 · 操作 */
import { computed } from 'vue'
import AppTooltip from '@/components/AppTooltip.vue'
import { formatDateTime, parseDate } from '@/utils/date'
import type { AdminUser, UserStatus } from '@/types'

const props = defineProps<{ users: AdminUser[]; loading?: boolean }>()
const emit = defineEmits<{
  edit: [AdminUser]
  'reset-password': [AdminUser]
  'toggle-freeze': [AdminUser]
  unlock: [AdminUser]
  remove: [AdminUser]
}>()

const STATUS_LABEL: Record<UserStatus, string> = {
  NORMAL: '正常',
  FROZEN: '已冻结',
  LOCKED: '已锁定',
  DELETED: '已注销',
}

/**
 * 是否处于登录锁定期（2026-10-31）：`lockedUntil` 晚于此刻才算锁定 ——
 * 后端到期不需要定时任务，前端也照这个口径判，过期的截止时间一律当没锁。
 */
function isLocked(user: AdminUser): boolean {
  const until = parseDate(user.lockedUntil)
  return !!until && until.getTime() > Date.now()
}

/**
 * 注销 > 冻结 > 锁定 > 正常：冻结是管理员动作，锁定期内登录先撞冻结（后端 1006 在 1009 之前）。
 * 后端 2026-10-31 把 `LOCKED` 放宽到「不排除已冻结」，所以筛「已锁定」时也会出现状态为「已冻结」的行 ——
 * 显示口径不变，锁定截止时间写在气泡里，「解禁」按钮仍按 `isLocked` 独立判断。
 */
function statusOf(user: AdminUser): UserStatus {
  if (user.deletedAt) return 'DELETED'
  if (user.frozenAt) return 'FROZEN'
  if (isLocked(user)) return 'LOCKED'
  return 'NORMAL'
}

/** 锁定说明：只交代「错了几次、锁到什么时候」，解禁在行内的按钮里 */
function lockDetail(user: AdminUser): string {
  return `连续密码错误 ${user.failedLoginCount} 次，锁定至 ${formatDateTime(user.lockedUntil)}`
}

/** 状态悬停说明：冻结看原因与时间，锁定看次数与截止，注销看时间 */
function statusDetail(user: AdminUser): string {
  if (user.deletedAt) return `注销于 ${formatDateTime(user.deletedAt)}（不可恢复）`
  if (user.frozenAt) {
    const reason = user.frozenReason ? `，原因：${user.frozenReason}` : ''
    // 冻结与锁定可能同时成立（冻结优先展示，但锁定信息不能就此藏起来 —— 行内还有「解禁」按钮）
    const lock = isLocked(user) ? `；另被锁定至 ${formatDateTime(user.lockedUntil)}` : ''
    return `冻结于 ${formatDateTime(user.frozenAt)}${reason}${lock}`
  }
  if (isLocked(user)) return lockDetail(user)
  return '账号正常'
}

const isEmpty = computed(() => !props.loading && props.users.length === 0)
</script>

<template>
  <div class="user-table">
    <!--
      2026-10-30：
      · 去掉 stripe —— 表格铺在玻璃面板上，斑马纹会和行悬停抢同一层底色；
      · 去掉「操作」列的 fixed —— 固定列需要一层不透明底才遮得住滚过去的内容，
        而这块底在玻璃上是块死白；侧栏加宽后列宽也收窄了，1600 宽下不再溢出。
    -->
    <el-table :data="users" v-loading="loading">
      <el-table-column label="头像" width="56">
        <template #default="{ row }">
          <img v-if="row.avatarUrl" class="avatar" :src="row.avatarUrl" alt="头像" />
          <span v-else class="avatar avatar--text">{{ (row.name || '?').slice(0, 1) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="邮箱" min-width="180" prop="email" show-overflow-tooltip />
      <el-table-column label="手机号" width="130">
        <template #default="{ row }">{{ row.phone || '—' }}</template>
      </el-table-column>
      <el-table-column label="用户名" width="120" prop="name" show-overflow-tooltip />

      <el-table-column label="任务数" width="100">
        <template #default="{ row }">{{ row.taskCount }} + {{ row.taskCountInTrash }}</template>
      </el-table-column>
      <el-table-column label="图片数" width="100">
        <template #default="{ row }">{{ row.imageCount }} + {{ row.imageCountInTrash }}</template>
      </el-table-column>

      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <AppTooltip :content="statusDetail(row)" placement="top">
            <span
              class="status"
              :class="{
                'status--frozen': statusOf(row) === 'FROZEN',
                'status--locked': statusOf(row) === 'LOCKED',
                'status--deleted': statusOf(row) === 'DELETED',
              }"
            >
              {{ STATUS_LABEL[statusOf(row)] }}
            </span>
          </AppTooltip>
        </template>
      </el-table-column>

      <el-table-column label="注册时间" width="150">
        <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
      </el-table-column>

      <el-table-column label="操作" width="240">
        <template #default="{ row }">
          <!-- 已注销是终态，不再显示任何操作（8.9） -->
          <template v-if="statusOf(row) !== 'DELETED'">
            <el-button link @click="emit('edit', row)">编辑</el-button>
            <el-button link @click="emit('reset-password', row)">重置密码</el-button>
            <!-- 只有真的在锁定期才给「解禁」：没锁的人点了也是幂等成功，但按钮不该凭空出现 -->
            <el-button v-if="isLocked(row)" link @click="emit('unlock', row)">解禁</el-button>
            <el-button link @click="emit('toggle-freeze', row)">
              {{ statusOf(row) === 'FROZEN' ? '解冻' : '冻结' }}
            </el-button>
            <el-button link @click="emit('remove', row)">注销</el-button>
          </template>
          <span v-else class="text-3">—</span>
        </template>
      </el-table-column>
    </el-table>

    <p v-if="isEmpty" class="user-table__empty">没有匹配的用户</p>
  </div>
</template>

<style scoped>
/*
 * 行内操作（2026-10-30）：EP 的 link 按钮默认带 12px 左外边距，4 个并排时把「注销」挤到第二行。
 * 这里压到 8px、左右内边距归零 —— 一行放得下，行高才不会被按钮撑高。
 */
.user-table :deep(.el-button.is-link) {
  margin-left: 0;
  padding: 0 2px;
  font-size: 13px;
}

.user-table :deep(.el-button.is-link + .el-button) {
  margin-left: 8px;
}

.avatar {
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  object-fit: cover;
}

.avatar--text {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--color-text-2);
  background-color: var(--color-hover);
}

.status--frozen {
  color: var(--color-danger);
}

/*
 * 已锁定（2026-10-31）用中优先级那支琥珀色，别和冻结的红撞车：
 * 冻结只能由管理员解冻，锁定到点会自己解 —— 两件事不该看起来一样重。
 */
.status--locked {
  color: var(--color-priority-medium-fg);
}

.status--deleted {
  color: var(--color-text-3);
}

.user-table__empty {
  padding: 32px 0;
  font-size: 12px;
  color: var(--color-text-2);
  text-align: center;
}
</style>
