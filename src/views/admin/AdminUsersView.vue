<script setup lang="ts">
/**
 * 用户管理（8.9）：工具条 + 表格 + 分页 + 五个弹窗（创建 / 编辑 / 重置密码 / 冻结解冻 / 注销）
 * + 「初始密码」一次性展示弹窗。
 */
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import AdminUserTable from '@/components/admin/AdminUserTable.vue'
import AdminUserToolbar from '@/components/admin/AdminUserToolbar.vue'
import CreateUserDialog from '@/components/admin/CreateUserDialog.vue'
import DeleteUserDialog from '@/components/admin/DeleteUserDialog.vue'
import FreezeDialog from '@/components/admin/FreezeDialog.vue'
import InitialPasswordDialog from '@/components/admin/InitialPasswordDialog.vue'
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
/** 刚创建的用户 + 只展示一次的初始密码；关掉弹窗即清空，不留在内存里 */
const createdUser = ref<AdminUser | null>(null)
const initialPassword = ref('')

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
    createdUser.value = result.user
    initialPassword.value = result.initialPassword
    revealVisible.value = true
  } catch (error) {
    // 1002 邮箱已被活跃账号占用：弹窗保持打开并就地提示（8.9）
    createError.value = error instanceof Error ? error.message : '创建失败'
  } finally {
    submitting.value = false
  }
}

/** 「初始密码」弹窗关闭（动画结束）后：清掉密码，并刷新第一页看到新用户（列表按注册时间倒序） */
function handleRevealClosed() {
  initialPassword.value = ''
  createdUser.value = null
  void guard(() => adminStore.fetchUsers(1))
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

async function handleResetPassword(newPassword: string) {
  const target = activeUser.value
  if (!target) return
  submitting.value = true
  try {
    await adminStore.resetPassword(target.id, newPassword)
    resetVisible.value = false
    ElMessage.success('新密码已生效，该用户需重新登录')
  } catch {
    // 提示已由 http 层给出
  } finally {
    submitting.value = false
  }
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
        @toggle-freeze="openDialog('freeze', $event)"
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
    <InitialPasswordDialog
      v-model:visible="revealVisible"
      :user="createdUser"
      :password="initialPassword"
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
