<script setup lang="ts">
/**
 * 登录审计表格（2026-10-31）：时间 · 登录方 · 账号 · 结果 · IP · User-Agent。
 * 只读，没有操作列 —— 审计是「回看」，能做的动作只有筛选。
 */
import { computed } from 'vue'
import {
  LOGIN_AUDIT_ACTOR_LABEL,
  LOGIN_AUDIT_RESULT_LABEL,
} from '@/constants'
import { formatDateTime } from '@/utils/date'
import type { LoginAudit, LoginAuditActorType, LoginAuditResult } from '@/types'

const props = defineProps<{ audits: LoginAudit[]; loading?: boolean }>()

/**
 * 结果配色分三档：通过是绿；账号状态挡住（冻结 / 锁定）是琥珀 —— 那不算密码错，
 * 到点或解禁自己就好了；其余（密码错 / 查无此人 / 图形码错）一律红。
 */
const STATE_RESULTS: LoginAuditResult[] = ['FROZEN', 'LOCKED']

function resultClass(result: LoginAuditResult): string {
  if (result === 'SUCCESS') return 'result--ok'
  return STATE_RESULTS.includes(result) ? 'result--state' : 'result--fail'
}

const isEmpty = computed(() => !props.loading && props.audits.length === 0)
</script>

<template>
  <div class="audit-table">
    <el-table :data="audits" v-loading="loading">
      <el-table-column label="时间" width="150">
        <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
      </el-table-column>

      <el-table-column label="登录方" width="90">
        <template #default="{ row }">
          <span :class="{ 'actor--admin': row.actorType === 'ADMIN' }">
            {{ LOGIN_AUDIT_ACTOR_LABEL[row.actorType as LoginAuditActorType] }}
          </span>
        </template>
      </el-table-column>

      <el-table-column label="账号" min-width="200" prop="account" show-overflow-tooltip />

      <el-table-column label="结果" width="120">
        <template #default="{ row }">
          <span class="result" :class="resultClass(row.result)">{{ LOGIN_AUDIT_RESULT_LABEL[row.result as LoginAuditResult] }}</span>
        </template>
      </el-table-column>

      <el-table-column label="IP" width="140">
        <template #default="{ row }">{{ row.ip || '—' }}</template>
      </el-table-column>

      <!-- UA 一行放不下，悬停看全（show-overflow-tooltip 是 EP 自己的省略提示，不是动作气泡） -->
      <el-table-column label="User-Agent" min-width="240" prop="userAgent" show-overflow-tooltip>
        <template #default="{ row }">{{ row.userAgent || '—' }}</template>
      </el-table-column>
    </el-table>

    <p v-if="isEmpty" class="audit-table__empty">没有匹配的登录记录</p>
  </div>
</template>

<style scoped>
.result--ok {
  color: var(--color-status-done);
}

.result--state {
  color: var(--color-priority-medium-fg);
}

.result--fail {
  color: var(--color-danger-text);
}

/* 管理员登录比用户登录更值得一眼看到：同一列里加深一档字重 */
.actor--admin {
  font-weight: 600;
  color: var(--color-text);
}

.audit-table__empty {
  padding: 32px 0;
  font-size: 12px;
  color: var(--color-text-2);
  text-align: center;
}
</style>
