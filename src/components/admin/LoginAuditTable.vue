<script setup lang="ts">
/**
 * 登录审计表格（2026-10-31）：时间 · 邮箱 · 结果 · IP · User-Agent。
 * 只读，没有操作列 —— 审计是「回看」，能做的动作只有筛选。
 *
 * 去掉「登录方」列（2026-11-02）：上方分段已经按登录方筛选，列里永远只有同一个值，
 * 留着占 90px 只是重复；要看「谁登的」直接切分段。
 *
 * User-Agent（2026-11-02 改）：整串 150~200 字符，排在表里永远放不下，改成「浏览器 · 系统」简写
 * （`utils/userAgent`），完整串进悬停气泡 —— 要排查时看一眼就够，也不用再横向滚动。
 *
 * 邮箱与 UA 的悬停气泡（2026-11-06）：和用户管理的邮箱列一样带复制按钮，共用 `CopyPopover`。
 */
import { computed } from 'vue'
import CopyPopover from './CopyPopover.vue'
import DateTimeCell from './DateTimeCell.vue'
import { LOGIN_AUDIT_RESULT_LABEL } from '@/constants'
import { describeUserAgent } from '@/utils/userAgent'
import type { LoginAudit, LoginAuditResult } from '@/types'

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
    <el-table :data="audits" v-loading="loading && !audits.length"
    element-loading-background="transparent">
      <el-table-column label="时间" width="140">
        <!-- 两行：上日期、下时刻（2026-11-05） -->
        <template #default="{ row }"><DateTimeCell :value="row.createdAt" /></template>
      </el-table-column>

      <!--
        邮箱（2026-11-06 改名 + 收窄）：固定 240 —— 原来用 `min-width` 会把表格剩余宽度全吞掉，
        短邮箱周围空出一大片；现在长串靠单行省略 + 气泡看全，列宽不再跟着窗口膨胀。
      -->
      <el-table-column label="邮箱" width="240">
        <template #default="{ row }">
          <CopyPopover :text="row.account" copy-label="复制邮箱">
            <span class="email">{{ row.account }}</span>
          </CopyPopover>
        </template>
      </el-table-column>

      <el-table-column label="结果" width="120">
        <template #default="{ row }">
          <span class="result" :class="resultClass(row.result)">{{ LOGIN_AUDIT_RESULT_LABEL[row.result as LoginAuditResult] }}</span>
        </template>
      </el-table-column>

      <el-table-column label="IP" width="130">
        <template #default="{ row }">{{ row.ip || '—' }}</template>
      </el-table-column>

      <!--
        简写最多「浏览器 版本 · 系统」这一档（约 130px）。2026-11-06：邮箱列收成固定宽后，
        剩余宽度交给 UA 列吸收（`min-width` 是唯一会伸缩的列），表格仍铺满整块面板；
        列里不放整串、也不用 EP 的 show-overflow-tooltip —— 那个提示条只有一行、会被截断，
        这里要看的是完整串，走 CopyPopover（长串断行与复制由气泡组件负责）。
      -->
      <el-table-column label="User-Agent" min-width="180">
        <template #default="{ row }">
          <CopyPopover
            v-if="row.userAgent"
            :text="row.userAgent"
            copy-label="复制 User-Agent"
            :width="420"
          >
            <span class="ua">{{ describeUserAgent(row.userAgent).label }}</span>
          </CopyPopover>
          <span v-else class="text-3">—</span>
        </template>
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

/* 邮箱单行省略：完整串在气泡里看，别把列撑开（列宽已固定 240） */
.email {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* UA 简写单行省略：列宽最小 180（窗口富裕时先长这一列），长名字也不许撑破列 */
.ua {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.audit-table__empty {
  padding: 32px 0;
  font-size: 12px;
  color: var(--color-text-2);
  text-align: center;
}
</style>
