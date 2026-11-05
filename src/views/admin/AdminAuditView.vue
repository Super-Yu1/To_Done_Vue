<script setup lang="ts">
/**
 * 登录审计（2026-10-31 后端新增，只读）：每次登录尝试一行，按时间倒序。
 * 筛选口径与服务端一致：登录方 / 结果 / 账号（模糊）+ 时间区间（含端点），
 * 前端不做任何本地过滤 —— 分页数字要和服务端返回的 total 对得上。
 *
 * 时间区间（2026-10-31 与后端对齐）：
 * - 后端按**服务端时区**解释 `from` / `to`（部署口径 Asia/Shanghai），前端发的就是控件里的
 *   本地钟面时间，不做任何换算 —— 管理员与本服务同区时严格对应；
 * - 上界**含整秒**由后端负责（`< to + 1 秒`），前端**不要**自己加 1 秒，否则会多算一秒；
 * - 接口固定时间倒序，不传 `sortBy` / `sortDirection`（后端已把这两个参数从文档里隐藏）。
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import LoginAuditTable from '@/components/admin/LoginAuditTable.vue'
import SegmentedControl from '@/components/SegmentedControl.vue'
import {
  LOGIN_AUDIT_ACTOR_LABEL,
  LOGIN_AUDIT_RESULT_OPTIONS,
  PAGE_SIZE,
  SEARCH_DEBOUNCE_MS,
} from '@/constants'
import { useAdminStore } from '@/stores/admin'
import type { LoginAuditActorType, LoginAuditResult } from '@/types'

const adminStore = useAdminStore()

/**
 * 时间区间（2026-11-05 改）：原来一个 `datetimerange` 控件会展开**两个月**的面板，
 * 用户要求单面板 —— 拆成「起始时间 / 结束时间」两个 `datetime` 控件，各自只展开一个月。
 * 两个值分别对应查询参数 `from` / `to`，清空即撤掉该端（后端两端都可选）。
 */
const from = ref<string | null>(null)
const to = ref<string | null>(null)

/** 起始时间不能晚于已选的结束时间（只按“天”禁用，具体的时分仍由用户决定） */
function disabledFromDate(date: Date): boolean {
  return to.value ? date.getTime() > new Date(to.value).getTime() : false
}

/** 结束时间不能早于已选的起始时间（按起始那天的 00:00 比较，当天仍可选） */
function disabledToDate(date: Date): boolean {
  if (!from.value) return false
  const startOfDay = new Date(from.value)
  startOfDay.setHours(0, 0, 0, 0)
  return date.getTime() < startOfDay.getTime()
}

async function guard(action: () => Promise<unknown>) {
  try {
    await action()
  } catch {
    // 提示已由 http 层给出
  }
}

/** 改任一筛选条件都回到第 1 页：停在第 3 页上筛一个只有 1 页的条件会看到空表 */
function reload() {
  void guard(() => adminStore.fetchAudits(1))
}

let debounceTimer: number | undefined
watch(
  () => adminStore.auditQuery.account,
  () => {
    window.clearTimeout(debounceTimer)
    debounceTimer = window.setTimeout(reload, SEARCH_DEBOUNCE_MS)
  },
)

/** 任一端变化（含 clearable 清成 null）→ 写回查询参数并重取；两端同时变也只发一次 */
watch([from, to], () => {
  adminStore.auditQuery.from = from.value ?? undefined
  adminStore.auditQuery.to = to.value ?? undefined
  reload()
})

onUnmounted(() => window.clearTimeout(debounceTimer))

onMounted(() => {
  // 两段没有「全不选」，首次进入把默认值落到 store 上，第一发请求就带 actorType
  // 默认「用户」（2026-11-05 用户口径）：进后台先看普通用户的登录情况
  if (!adminStore.auditQuery.actorType) adminStore.auditQuery.actorType = 'USER'
  void guard(() => adminStore.fetchAudits(1))
})

/**
 * 登录方（2026-11-02 二改，2026-11-05 翻转顺序）：复用前台筛选栏的 `SegmentedControl`，只留两段。
 * 去掉了「全部」—— 两段恒有一个选中，界面不会出现「谁都没亮」的空档；
 * 代价是看不到两种混排，但审计页的两类记录本来就不该混在一起读（管理员只有几个人）。
 * 顺序按用户要求改成**左「用户」、右「管理员」**；默认也选「用户」（左侧第一段）——
 * 进后台先看普通用户的登录情况。
 */
const ACTOR_TABS: { value: LoginAuditActorType; label: string }[] = [
  { value: 'USER', label: LOGIN_AUDIT_ACTOR_LABEL.USER },
  { value: 'ADMIN', label: LOGIN_AUDIT_ACTOR_LABEL.ADMIN },
]

/** 两段里恒有一个选中，所以这里不再接受空值 */
const actorTab = computed<LoginAuditActorType>({
  get: () => adminStore.auditQuery.actorType ?? 'USER',
  set: (value: LoginAuditActorType) => {
    adminStore.auditQuery.actorType = value
    reload()
  },
})

function handleResult(value: LoginAuditResult | '' | undefined) {
  adminStore.auditQuery.result = value || undefined
  reload()
}

function handlePageChange(page: number) {
  void guard(() => adminStore.fetchAudits(page))
}
</script>

<template>
  <div class="page admin-page">
    <header class="admin-hero">
      <div>
        <h1 class="admin-hero__title">登录审计</h1>
        <p class="admin-hero__hint">
          每次登录尝试都留一行：谁、从哪来、结果如何。只记结果与来源，看不到密码与验证码。时间按服务端时区（Asia/Shanghai）显示与筛选。
        </p>
      </div>
      <el-button @click="reload">
        <AppIcon name="refresh" />
        <span class="btn-text">刷新</span>
      </el-button>
    </header>

    <section class="admin-panel">
      <div class="audit-toolbar">
        <el-input
          v-model="adminStore.auditQuery.account"
          class="audit-toolbar__search"
          placeholder="搜索账号（邮箱 / 管理员名）"
          clearable
        >
          <template #prefix>
            <AppIcon name="search" />
          </template>
        </el-input>

        <SegmentedControl
          v-model="actorTab"
          class="audit-toolbar__seg"
          :items="ACTOR_TABS"
          aria-label="登录方"
          size="small"
        />

        <el-select
          class="audit-toolbar__select"
          :model-value="adminStore.auditQuery.result"
          placeholder="全部结果"
          clearable
          @change="handleResult"
        >
          <el-option
            v-for="item in LOGIN_AUDIT_RESULT_OPTIONS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>

        <!--
          后端要的格式就是 yyyy-MM-ddTHH:mm:ss，与 value-format 一致，不做二次转换；
          后端按服务端时区（Asia/Shanghai）解释，上界含整秒（后端 < to + 1s），前端不加 1 秒。
          两个独立控件（2026-11-05）：各自展开一个月，不再一次铺两个月。
        -->
        <div class="audit-toolbar__range">
          <el-date-picker
            v-model="from"
            class="audit-toolbar__time"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ss"
            placeholder="起始时间"
            :disabled-date="disabledFromDate"
            clearable
          />
          <span class="audit-toolbar__dash" aria-hidden="true">—</span>
          <el-date-picker
            v-model="to"
            class="audit-toolbar__time"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ss"
            placeholder="结束时间"
            :disabled-date="disabledToDate"
            clearable
          />
        </div>
      </div>

      <LoginAuditTable :audits="adminStore.audits" :loading="adminStore.auditLoading" />

      <div class="admin-panel__foot">
        <el-pagination
          layout="total, prev, pager, next"
          :total="adminStore.auditTotal"
          :page-size="PAGE_SIZE"
          :current-page="adminStore.auditQuery.page"
          @current-change="handlePageChange"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
/* 与用户管理工具条同一套排布：换行、8px 间距、底部 16px 收口 */
.audit-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 16px;
}

.audit-toolbar__search {
  width: 240px;
}

.audit-toolbar__seg {
  /* 与搜索井、下拉同一基线：分段自带 4px 槽内边距，这里不再补 */
  margin-bottom: 0;
}

.audit-toolbar__select {
  width: 150px;
}

.audit-toolbar__range {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 6px;
  min-width: 360px;
  max-width: 460px;
}

.audit-toolbar__time {
  flex: 1;
  min-width: 0;
}

/* EP 的日期编辑器默认写死宽度，这里让它跟着 flex 走 */
.audit-toolbar__time:deep(.el-input) {
  width: 100%;
}

.audit-toolbar__dash {
  flex: none;
  color: var(--color-text-3);
}
</style>
