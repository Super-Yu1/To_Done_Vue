<script setup lang="ts">
/**
 * 用户管理（8.9）：工具条 + 表格 + 分页 + 五个弹窗（创建 / 编辑 / 重置密码 / 冻结 / 注销）
 * + 「密码回显」一次性弹窗（建号的初始密码、重置生成的新密码共用）。
 */
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import AdminUserTable from '@/components/admin/AdminUserTable.vue'
import AdminUserToolbar from '@/components/admin/AdminUserToolbar.vue'
import CreateUserDialog from '@/components/admin/CreateUserDialog.vue'
import DeleteUserDialog from '@/components/admin/DeleteUserDialog.vue'
import FreezeDialog from '@/components/admin/FreezeDialog.vue'
import PasswordRevealDialog from '@/components/admin/PasswordRevealDialog.vue'
import ResetPasswordDialog from '@/components/admin/ResetPasswordDialog.vue'
import UserEditDialog from '@/components/admin/UserEditDialog.vue'
import { PAGE_SIZE } from '@/constants'
import { useAdminStore } from '@/stores/admin'
import { formatDateTime } from '@/utils/date'
import type { AdminUser, AdminUserCreatePayload, AdminUserUpdatePayload, FreezePayload } from '@/types'

const adminStore = useAdminStore()

const editVisible = ref(false)
const resetVisible = ref(false)
const freezeVisible = ref(false)
const deleteVisible = ref(false)
const activeUser = ref<AdminUser | null>(null)
const submitting = ref(false)
const editError = ref('')

const createVisible = ref(false)
const revealVisible = ref(false)
const createError = ref('')
/** 密码回显弹窗的内容：刚建号的初始密码，或重置后生成的新密码（都只显示一次） */
const revealUser = ref<AdminUser | null>(null)
const revealPassword = ref('')
const revealMode = ref<'create' | 'reset'>('create')
/** 重置成功后，等「重置密码」弹窗关掉再亮新密码 —— 两层弹窗不叠在一起 */
const pendingReveal = ref<{ user: AdminUser; password: string } | null>(null)

function openDialog(target: 'edit' | 'reset' | 'freeze' | 'delete', user: AdminUser) {
  activeUser.value = user
  editError.value = ''
  if (target === 'edit') editVisible.value = true
  if (target === 'reset') resetVisible.value = true
  if (target === 'freeze') freezeVisible.value = true
  if (target === 'delete') deleteVisible.value = true
}

async function guard(action: () => Promise<unknown>) {
  try {
    await action()
  } catch {
    // 提示已由 http 层给出
  }
}

onMounted(() => guard(() => adminStore.fetchUsers(1)))

function openCreate() {
  createError.value = ''
  createVisible.value = true
}

async function handleCreateUser(payload: AdminUserCreatePayload) {
  submitting.value = true
  createError.value = ''
  try {
    const result = await adminStore.createUser(payload)
    // 关掉表单、立刻亮出初始密码——它是唯一一次明文机会，中间不插任何提示或刷新
    createVisible.value = false
    revealUser.value = result.user
    revealPassword.value = result.initialPassword
    revealMode.value = 'create'
    revealVisible.value = true
  } catch (error) {
    // 1002 邮箱已被活跃账号占用：弹窗保持打开并就地提示（8.9）
    createError.value = error instanceof Error ? error.message : '创建失败'
  } finally {
    submitting.value = false
  }
}

/** 密码弹窗关闭（动画结束）后：清掉明文；建号那一路顺手刷新第一页看到新用户（列表按注册时间倒序） */
function handleRevealClosed() {
  const wasCreate = revealMode.value === 'create'
  revealPassword.value = ''
  revealUser.value = null
  if (wasCreate) void guard(() => adminStore.fetchUsers(1))
}

async function handleUpdateUser(payload: AdminUserUpdatePayload) {
  const target = activeUser.value
  if (!target) return
  submitting.value = true
  editError.value = ''
  try {
    await adminStore.updateUser(target.id, payload)
    editVisible.value = false
    ElMessage.success('已保存')
  } catch (error) {
    // 1002 邮箱被占用：弹窗保持打开并就地提示（8.9）
    editError.value = error instanceof Error ? error.message : '保存失败'
  } finally {
    submitting.value = false
  }
}

/**
 * 重置密码（2026-11-03 改）：不再让管理员手输 —— 口令由**服务端生成**并在响应里回一次
 * （与建号同一个生成器）。成功后关掉本弹窗，等它动画结束（`handleResetClosed`）
 * 再弹「新密码」，只显示一次、可复制。
 */
async function handleResetPassword() {
  const target = activeUser.value
  if (!target) return
  submitting.value = true
  try {
    const password = await adminStore.resetPassword(target.id)
    pendingReveal.value = { user: target, password }
    resetVisible.value = false
  } catch {
    // 提示已由 http 层给出
  } finally {
    submitting.value = false
  }
}

/** 「重置密码」弹窗关掉之后才亮新密码，避免两层的遮罩叠在一起闪一下 */
function handleResetClosed() {
  const pending = pendingReveal.value
  if (!pending) return
  pendingReveal.value = null
  revealUser.value = pending.user
  revealPassword.value = pending.password
  revealMode.value = 'reset'
  revealVisible.value = true
}

/**
 * 解禁登录锁定（2026-10-31）：接口幂等，走一次二次确认就够 ——
 * 解禁会清掉连续失败计数与 Redis 里的图形码计数，之后该用户用原密码即可登录。
 */
const unlocking = ref(false)

async function handleUnlock(user: AdminUser) {
  if (unlocking.value) return
  const name = user.name || user.email
  try {
    await ElMessageBox.confirm(
      `「${name}」连续密码错误 ${user.failedLoginCount} 次，锁定至 ${formatDateTime(user.lockedUntil)}。` +
        '解禁后计数清零，可立即用原密码登录，也不再要求图形码。',
      '确认解禁',
      { confirmButtonText: '解禁', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  unlocking.value = true
  try {
    await adminStore.unlock(user.id)
    ElMessage.success('已解禁，该用户可立即登录')
  } catch {
    // 提示已由 http 层给出
  } finally {
    unlocking.value = false
  }
}

/**
 * 行内「冻结 / 解冻」的两个出口（2026-11-02）：冻结要填原因，开弹窗；
 * 解冻没有可填的东西，一次确认就够 —— 以前两个都开 `FreezeDialog`，
 * 解冻还要在弹窗里再弹一次 MessageBox，同一件事要关两遍。
 */
const unfreezing = ref(false)

async function handleToggleFreeze(user: AdminUser) {
  if (!user.frozenAt) {
    openDialog('freeze', user)
    return
  }
  if (unfreezing.value) return
  const name = user.name || user.email
  try {
    await ElMessageBox.confirm(
      `「${name}」将恢复登录，任务、配图与回收站原样保留。`,
      '确认解冻',
      { confirmButtonText: '解冻', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  unfreezing.value = true
  try {
    await adminStore.setFrozen(user.id, false)
    ElMessage.success('已解冻，该用户可立即登录')
  } catch {
    // 提示已由 http 层给出
  } finally {
    unfreezing.value = false
  }
}

async function handleFreeze(payload: FreezePayload) {
  const target = activeUser.value
  if (!target) return
  submitting.value = true
  try {
    await adminStore.setFrozen(target.id, payload.frozen, payload.reason)
    freezeVisible.value = false
    ElMessage.success(payload.frozen ? '已冻结，该用户已被强制退出登录' : '已解冻')
  } catch {
    // 提示已由 http 层给出
  } finally {
    submitting.value = false
  }
}

async function handleDelete() {
  const target = activeUser.value
  if (!target) return
  submitting.value = true
  try {
    await adminStore.setDeleted(target.id)
    deleteVisible.value = false
    ElMessage.success('已注销，该账号无法再登录')
  } catch {
    // 提示已由 http 层给出
  } finally {
    submitting.value = false
  }
}

function handlePageChange(page: number) {
  void guard(() => adminStore.fetchUsers(page))
}
</script>

<template>
  <div class="page admin-page">
    <header class="admin-hero">
      <div>
        <h1 class="admin-hero__title">用户管理</h1>
        <p class="admin-hero__hint">管理员只看账号状态，看不到任何人的任务与配图。</p>
      </div>
      <el-button type="primary" @click="openCreate">
        <AppIcon name="plus" />
        <span class="btn-text">创建用户</span>
      </el-button>
    </header>

    <!-- 工具条 / 表格 / 分页整块住在一块玻璃里：后台是浏览与检索，不做「一行一卡」 -->
    <section class="admin-panel">
      <AdminUserToolbar
        :query="adminStore.query"
        @change="guard(() => adminStore.fetchUsers(1))"
        @refresh="guard(() => adminStore.fetchUsers(adminStore.query.page))"
      />

      <AdminUserTable
        :users="adminStore.users"
        :loading="adminStore.loading"
        @edit="openDialog('edit', $event)"
        @reset-password="openDialog('reset', $event)"
        @toggle-freeze="handleToggleFreeze"
        @unlock="handleUnlock"
        @remove="openDialog('delete', $event)"
      />

      <div class="admin-panel__foot">
        <el-pagination
          layout="total, prev, pager, next"
          :total="adminStore.total"
          :page-size="PAGE_SIZE"
          :current-page="adminStore.query.page"
          @current-change="handlePageChange"
        />
      </div>
    </section>

    <CreateUserDialog
      v-model:visible="createVisible"
      :submitting="submitting"
      :server-error="createError"
      @confirm="handleCreateUser"
    />
    <PasswordRevealDialog
      v-model:visible="revealVisible"
      :user="revealUser"
      :password="revealPassword"
      :mode="revealMode"
      @closed="handleRevealClosed"
    />
    <UserEditDialog
      v-model:visible="editVisible"
      :user="activeUser"
      :submitting="submitting"
      :server-error="editError"
      @confirm="handleUpdateUser"
    />
    <ResetPasswordDialog
      v-model:visible="resetVisible"
      :user="activeUser"
      :submitting="submitting"
      @confirm="handleResetPassword"
      @closed="handleResetClosed"
    />
    <FreezeDialog
      v-model:visible="freezeVisible"
      :user="activeUser"
      :submitting="submitting"
      @confirm="handleFreeze"
    />
    <DeleteUserDialog
      v-model:visible="deleteVisible"
      :user="activeUser"
      :submitting="submitting"
      @confirm="handleDelete"
    />
  </div>
</template>

<style scoped>
/*
 * 版式全在 main.css 的 `.admin-page` / `.admin-hero` / `.admin-panel` 里 ——
 * 与「管理员管理」共用同一套，两个页面不再各写一份页头样式。
 */
</style>
