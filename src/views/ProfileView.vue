<script setup lang="ts">
/**
 * 个人中心（UC-09）：由 5 个分区组件拼成——头像 / 基本资料 / 更换邮箱 / 修改密码 / 外观。
 * 分区组件只负责收集与校验，落库在这里；演示页复用同一套组件，只把动作换成提示（8.6）。
 */
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import AppearanceSettings from '@/components/profile/AppearanceSettings.vue'
import AvatarSection from '@/components/profile/AvatarSection.vue'
import BasicInfoForm from '@/components/profile/BasicInfoForm.vue'
import ChangeEmailForm from '@/components/profile/ChangeEmailForm.vue'
import ChangePasswordForm from '@/components/profile/ChangePasswordForm.vue'
import { useAuthStore } from '@/stores/auth'
import type { ChangeEmailPayload, ChangePasswordPayload, UpdateProfilePayload } from '@/types'

const auth = useAuthStore()
const router = useRouter()

const emailFormRef = ref<InstanceType<typeof ChangeEmailForm>>()
const savingProfile = ref(false)
const savingEmail = ref(false)
const savingPassword = ref(false)

onMounted(async () => {
  if (auth.user) return
  try {
    await auth.fetchProfile()
  } catch {
    // 提示已由 http 层给出
  }
})

async function handleSaveProfile(payload: UpdateProfilePayload) {
  savingProfile.value = true
  try {
    await auth.updateProfile(payload)
    ElMessage.success('资料已更新')
  } catch {
    // 1008 手机号被占用等提示由 http 层给出
  } finally {
    savingProfile.value = false
  }
}

async function handleChangeEmail(payload: ChangeEmailPayload) {
  savingEmail.value = true
  try {
    await auth.changeEmail(payload)
    ElMessage.success('邮箱已更换')
    await emailFormRef.value?.reset()
  } catch {
    // 1002 邮箱被占用等提示由 http 层给出；图形码一次性，失败后换一张
    await emailFormRef.value?.refreshCaptcha()
  } finally {
    savingEmail.value = false
  }
}

async function handleChangePassword(payload: ChangePasswordPayload) {
  savingPassword.value = true
  try {
    await auth.changePassword(payload)
    ElMessage.success('密码已修改，请重新登录')
    auth.logout()
    await router.push('/login')
  } catch {
    // 1005 原密码不正确等提示由 http 层给出
  } finally {
    savingPassword.value = false
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
  try {
    await auth.removeAvatar()
    ElMessage.success('头像已移除')
  } catch {
    // 提示已由 http 层给出
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

    <AvatarSection
      :avatar-url="auth.user?.avatarUrl ?? null"
      :name="auth.user?.name ?? ''"
      @remove="handleRemoveAvatar"
    />
    <BasicInfoForm :user="auth.user" :saving="savingProfile" @submit="handleSaveProfile" />
    <ChangeEmailForm ref="emailFormRef" :saving="savingEmail" @submit="handleChangeEmail" />
    <ChangePasswordForm :saving="savingPassword" @submit="handleChangePassword" />
    <AppearanceSettings />

    <section class="section">
      <h2 class="section__title">会话</h2>
      <el-button @click="handleLogout">
        <AppIcon name="logout" />
        <span class="btn-text">退出登录</span>
      </el-button>
    </section>
  </div>
</template>
