<script setup lang="ts">
/**
 * 登录审计表格（2026-10-31）：时间 · 账号 · 结果 · IP · User-Agent。
 * 只读，没有操作列 —— 审计是「回看」，能做的动作只有筛选。
 *
 * 去掉「登录方」列（2026-11-02）：上方分段已经按登录方筛选，列里永远只有同一个值，
 * 留着占 90px 只是重复；要看「谁登的」直接切分段。
 *
 * User-Agent（2026-11-02 改）：整串 150~200 字符，排在表里永远放不下，改成「浏览器 · 系统」简写
 * （`utils/userAgent`），完整串进悬停气泡 —— 要排查时看一眼就够，也不用再横向滚动。
 */
import { computed } from 'vue'
import AppTooltip from '@/components/AppTooltip.vue'
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
      <el-table-column label="时间" width="150">
        <!-- 两行：上日期、下时刻（2026-11-05） -->
        <template #default="{ row }"><DateTimeCell :value="row.createdAt" /></template>
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

      <!--
        UA 列固定 180：简写最多「浏览器 版本 · 系统」这一档（约 130px），剩下的余量给账号列。
        列里不放整串、也不用 EP 的 show-overflow-tooltip —— 那个提示条只有一行、会被截断，
        这里要看的是完整串，走 AppTooltip（换行由非 scoped 的 .ua-popper 负责）。
      -->
      <el-table-column label="User-Agent" width="180">
        <template #default="{ row }">
          <AppTooltip v-if="row.userAgent" :content="row.userAgent" placement="top" popper-class="ua-popper">
            <span class="ua">{{ describeUserAgent(row.userAgent).label }}</span>
          </AppTooltip>
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

/* UA 简写单行省略：列宽固定 180，长一点的名字（Edge / python-requests）也不许撑破列 */
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

<style>
/*
 * 完整 UA 的气泡（teleport 到 body，scoped 够不到）：
 * UA 里的分号后面不一定有空格，长串必须强制断行，否则会被撑成一条横贯屏幕的黑条；
 * 420px 是「一屏能读完、又不至于压住半张表」的折中。
 */
.ua-popper.el-popper {
  max-width: 420px;
  word-break: break-all;
  line-height: 1.55;
}
</style>
