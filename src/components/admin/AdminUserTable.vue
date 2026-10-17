<script setup lang="ts">
/** 用户表格（8.9）：头像 · 邮箱 · 手机号 · 用户名 · 任务数 · 图片数 · 状态 · 注册时间 · 操作 */
import { computed } from 'vue'
import { formatDateTime } from '@/utils/date'
import type { AdminUser, UserStatus } from '@/types'

const props = defineProps<{ users: AdminUser[]; loading?: boolean }>()
const emit = defineEmits<{
  edit: [AdminUser]
  'reset-password': [AdminUser]
  'toggle-freeze': [AdminUser]
  remove: [AdminUser]
}>()

const STATUS_LABEL: Record<UserStatus, string> = {
  NORMAL: '正常',
  FROZEN: '已冻结',
  DELETED: '已注销',
}

function statusOf(user: AdminUser): UserStatus {
  if (user.deletedAt) return 'DELETED'
  if (user.frozenAt) return 'FROZEN'
  return 'NORMAL'
}

/** 状态悬停说明：冻结看原因与时间，注销看时间 */
function statusDetail(user: AdminUser): string {
  if (user.deletedAt) return `注销于 ${formatDateTime(user.deletedAt)}（不可恢复）`
  if (user.frozenAt) {
    const reason = user.frozenReason ? `，原因：${user.frozenReason}` : ''
    return `冻结于 ${formatDateTime(user.frozenAt)}${reason}`
  }
  return '账号正常'
}

const isEmpty = computed(() => !props.loading && props.users.length === 0)
</script>

<template>
  <div class="user-table">
    <el-table :data="users" v-loading="loading" stripe>
      <el-table-column label="头像" width="64">
        <template #default="{ row }">
          <img v-if="row.avatarUrl" class="avatar" :src="row.avatarUrl" alt="头像" />
          <span v-else class="avatar avatar--text">{{ (row.name || '?').slice(0, 1) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="邮箱" min-width="200" prop="email" show-overflow-tooltip />
      <el-table-column label="手机号" width="140">
        <template #default="{ row }">{{ row.phone || '—' }}</template>
      </el-table-column>
      <el-table-column label="用户名" width="140" prop="name" show-overflow-tooltip />

      <el-table-column label="任务数" width="110">
        <template #default="{ row }">{{ row.taskCount }} + {{ row.taskCountInTrash }}</template>
      </el-table-column>
      <el-table-column label="图片数" width="110">
        <template #default="{ row }">{{ row.imageCount }} + {{ row.imageCountInTrash }}</template>
      </el-table-column>

      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tooltip :content="statusDetail(row)" placement="top">
            <span
              class="status"
              :class="{
                'status--frozen': statusOf(row) === 'FROZEN',
                'status--deleted': statusOf(row) === 'DELETED',
              }"
            >
              {{ STATUS_LABEL[statusOf(row)] }}
            </span>
          </el-tooltip>
        </template>
      </el-table-column>

      <el-table-column label="注册时间" width="170">
        <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
      </el-table-column>

      <el-table-column label="操作" width="260" fixed="right">
        <template #default="{ row }">
          <!-- 已注销是终态，不再显示任何操作（8.9） -->
          <template v-if="statusOf(row) !== 'DELETED'">
            <el-button link @click="emit('edit', row)">编辑</el-button>
            <el-button link @click="emit('reset-password', row)">重置密码</el-button>
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
