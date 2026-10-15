<script setup lang="ts">
/**
 * 个人中心（UC-09）：一行一项——左侧项名、中间当前值、右侧动作，表单都在弹窗里。
 * 页面只回答两件事：我现在是什么（身份行 + 各行当前值）、我能改什么（右侧动作）。
 * 页面默认态不出现任何输入框，改才点开——这也是与「低频操作别常驻」对齐的做法。
 *
 * 登录态相关：邮箱是登录凭证，换成功即退出登录并提示用新邮箱登录；改密同样强制重新登录；
 * 退出登录走二次确认。
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import EmptyState from '@/components/EmptyState.vue'
import AppearanceSettings from '@/components/profile/AppearanceSettings.vue'
import AvatarCropDialog from '@/components/profile/AvatarCropDialog.vue'
import BasicInfoDialog from '@/components/profile/BasicInfoDialog.vue'
import EmailChangeDialog from '@/components/profile/EmailChangeDialog.vue'
import IdentityRow from '@/components/profile/IdentityRow.vue'
import PasswordChangeDialog from '@/components/profile/PasswordChangeDialog.vue'
import SettingRow from '@/components/profile/SettingRow.vue'
import { useAuthStore } from '@/stores/auth'
import { formatDate } from '@/utils/date'
import type { ChangeEmailPayload, ChangePasswordPayload, UpdateProfilePayload } from '@/types'

const auth = useAuthStore()
const router = useRouter()

const loading = ref(false)
const loadFailed = ref(false)

const basicVisible = ref(false)
const emailVisible = ref(false)
const passwordVisible = ref(false)
const cropVisible = ref(false)

const savingBasic = ref(false)
const savingEmail = ref(false)
const savingPassword = ref(false)
const savingAvatar = ref(false)

/** 选中的原图：交给裁剪弹窗，确认后才有 File 上传 */
const pickedFile = ref<File | null>(null)

const user = computed(() => auth.user)

async function load() {
  loading.value = true
  loadFailed.value = false
  try {
    await auth.fetchProfile()
  } catch {
    // 具体原因由 http 层提示；这里只负责让页面给出「重新加载」的出口
    loadFailed.value = true
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (!auth.user) void load()
})

async function handleEditBasic(payload: UpdateProfilePayload) {
  // 弹窗只提交改动过的字段；一个都没改就直接关，不发这次请求
  if (Object.keys(payload).length === 0) {
    basicVisible.value = false
    return
  }
  savingBasic.value = true
  try {
    await auth.updateProfile(payload)
    ElMessage.success('资料已更新')
    basicVisible.value = false
  } catch {
    // 1008 手机号被占用等由 http 层提示；弹窗保持打开，用户在原地改
  } finally {
    savingBasic.value = false
  }
}

async function handleChangeEmail(payload: ChangeEmailPayload) {
  savingEmail.value = true
  try {
    await auth.changeEmail(payload)
    emailVisible.value = false
    ElMessage.success('邮箱已更换，请用新邮箱重新登录')
    auth.logout()
    await router.push('/login')
  } catch {
    // 1002 邮箱被占用等由 http 层提示；弹窗保持打开，用户在原地改
  } finally {
    savingEmail.value = false
  }
}

async function handleChangePassword(payload: ChangePasswordPayload) {
  savingPassword.value = true
  try {
    await auth.changePassword(payload)
    passwordVisible.value = false
    ElMessage.success('密码已修改，请用新密码重新登录')
    auth.logout()
    await router.push('/login')
  } catch {
    // 1005 原密码不正确等由 http 层提示
  } finally {
    savingPassword.value = false
  }
}

function handlePickAvatar(file: File) {
  pickedFile.value = file
  cropVisible.value = true
}

async function handleAvatarConfirm(file: File) {
  savingAvatar.value = true
  try {
    await auth.uploadAvatar(file)
    ElMessage.success('头像已更新')
  } catch {
    // 3002 过大 / 3003 类型不符等由 http 层提示
  } finally {
    savingAvatar.value = false
    pickedFile.value = null
  }
}

async function handleRemoveAvatar() {
  try {
    await ElMessageBox.confirm('移除后头像会变回默认样式。', '移除头像', {
      confirmButtonText: '移除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  savingAvatar.value = true
  try {
    await auth.removeAvatar()
    ElMessage.success('头像已移除')
  } catch {
    // 提示已由 http 层给出
  } finally {
    savingAvatar.value = false
  }
}

async function handleLogout() {
  try {
    await ElMessageBox.confirm('退出后需要重新登录。', '退出登录', {
      confirmButtonText: '退出',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  auth.logout()
  await router.push('/login')
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">个人中心</h1>

    <!-- 读取中：与真实行同壳，避免内容出现后又位移 -->
    <div v-if="loading && !user" class="settings-group profile-block">
      <div v-for="index in 2" :key="index" class="skeleton-row">
        <span class="skeleton-bar skeleton-bar--label"></span>
        <span class="skeleton-bar skeleton-bar--value"></span>
      </div>
    </div>

    <EmptyState
      v-else-if="loadFailed && !user"
      title="没能读取账号信息"
      description="网络或服务端出了点问题，稍后再试一次。"
      action-text="重新加载"
      @action="load"
    />

    <template v-else-if="user">
      <div class="profile-block">
        <IdentityRow
          :name="user.name"
          :meta="`注册于 ${formatDate(user.createdAt)}`"
          :avatar-url="user.avatarUrl"
          :uploading="savingAvatar"
          @pick="handlePickAvatar"
          @remove="handleRemoveAvatar"
        />
      </div>

      <h2 class="settings-group-title">账号</h2>
      <div class="settings-group">
        <SettingRow label="名字" :value="user.name" action-text="编辑" @action="basicVisible = true" />
        <SettingRow
          label="手机号"
          :value="user.phone || '未绑定'"
          :muted="!user.phone"
          action-text="编辑"
          @action="basicVisible = true"
        />
        <SettingRow
          label="登录邮箱"
          :value="user.email"
          action-text="更换"
          @action="emailVisible = true"
        />
        <SettingRow
          label="登录密码"
          value="已设置；修改后需要重新登录"
          action-text="修改"
          @action="passwordVisible = true"
        />
      </div>

      <h2 class="settings-group-title">偏好</h2>
      <div class="settings-group">
        <AppearanceSettings />
      </div>

      <h2 class="settings-group-title">会话</h2>
      <div class="settings-group">
        <SettingRow
          label="退出登录"
          value="退出后需要重新登录"
          action-text="退出"
          danger
          @action="handleLogout"
        />
      </div>
    </template>

    <BasicInfoDialog
      v-model:visible="basicVisible"
      :user="user"
      :saving="savingBasic"
      @submit="handleEditBasic"
    />
    <EmailChangeDialog
      v-model:visible="emailVisible"
      :saving="savingEmail"
      @submit="handleChangeEmail"
    />
    <PasswordChangeDialog
      v-model:visible="passwordVisible"
      :saving="savingPassword"
      @submit="handleChangePassword"
    />
    <AvatarCropDialog v-model:visible="cropVisible" :file="pickedFile" @confirm="handleAvatarConfirm" />
  </div>
</template>

<style scoped>
.profile-block {
  margin-top: 20px;
}

.skeleton-row {
  display: grid;
  grid-template-columns: 88px 1fr;
  align-items: center;
  gap: 16px;
  min-height: 56px;
  padding: 12px 20px;
}

.skeleton-bar {
  height: 12px;
  border-radius: var(--radius-sm);
  background-color: var(--color-hover);
}

.skeleton-bar--label {
  width: 48px;
}

.skeleton-bar--value {
  width: 180px;
}
</style>
