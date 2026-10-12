<script setup lang="ts">
/**
 * 演示模式 · 个人中心（8.6）：与本尊共用同一套行与弹窗，数据换成内置示范资料。
 * 写操作只提示「演示模式不保存」；两处是真的：①「外观」直接改本地主题；
 * ②头像的 1:1 取景框（本地裁剪，不涉及后端），只是确认后不上传。
 */
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { RouterLink } from 'vue-router'
import AppearanceSettings from '@/components/profile/AppearanceSettings.vue'
import AvatarCropDialog from '@/components/profile/AvatarCropDialog.vue'
import BasicInfoDialog from '@/components/profile/BasicInfoDialog.vue'
import EmailChangeDialog from '@/components/profile/EmailChangeDialog.vue'
import IdentityRow from '@/components/profile/IdentityRow.vue'
import PasswordChangeDialog from '@/components/profile/PasswordChangeDialog.vue'
import SettingRow from '@/components/profile/SettingRow.vue'
import { DEMO_USER } from '@/mock/demoProfile'
import { formatDate } from '@/utils/date'

const basicVisible = ref(false)
const emailVisible = ref(false)
const passwordVisible = ref(false)
const cropVisible = ref(false)
const pickedFile = ref<File | null>(null)

/** 演示模式的写操作统一口径：提示不保存，不改数据（8.6） */
function notifyNotSaved() {
  ElMessage.info('演示模式不保存，注册账号后即可真正使用')
}

/** 三个表单的提交口径与任务弹窗一致：关掉弹窗再提示不保存 */
function handleBasicSubmit() {
  basicVisible.value = false
  notifyNotSaved()
}

function handleEmailSubmit() {
  emailVisible.value = false
  notifyNotSaved()
}

function handlePasswordSubmit() {
  passwordVisible.value = false
  notifyNotSaved()
}

function handlePickAvatar(file: File) {
  pickedFile.value = file
  cropVisible.value = true
}

function handleAvatarConfirm() {
  cropVisible.value = false
  pickedFile.value = null
  notifyNotSaved()
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
  notifyNotSaved()
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">个人中心</h1>
    <p class="page-hint">
      下面是内置的示范资料。改动不会保存，「外观」可以直接试——它只切换本地主题，真实生效。
    </p>

    <div class="profile-block">
      <IdentityRow
        :name="DEMO_USER.name"
        :meta="`注册于 ${formatDate(DEMO_USER.createdAt)}`"
        :avatar-url="DEMO_USER.avatarUrl"
        @pick="handlePickAvatar"
        @remove="handleRemoveAvatar"
      />
    </div>

    <h2 class="settings-group-title">账号</h2>
    <div class="settings-group">
      <SettingRow label="名字" :value="DEMO_USER.name" action-text="编辑" @action="basicVisible = true" />
      <SettingRow
        label="手机号"
        :value="DEMO_USER.phone || '未绑定'"
        :muted="!DEMO_USER.phone"
        action-text="编辑"
        @action="basicVisible = true"
      />
      <SettingRow
        label="登录邮箱"
        :value="DEMO_USER.email"
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

    <h2 class="settings-group-title">下一步</h2>
    <div class="settings-group">
      <SettingRow label="注册账号" value="注册后就能真正记录并管理你的任务">
        <div class="demo-actions">
          <RouterLink to="/register">
            <el-button type="primary" size="small">注册账号</el-button>
          </RouterLink>
          <RouterLink to="/login">
            <el-button size="small">登录</el-button>
          </RouterLink>
        </div>
      </SettingRow>
    </div>

    <BasicInfoDialog v-model:visible="basicVisible" :user="DEMO_USER" @submit="handleBasicSubmit" />
    <EmailChangeDialog v-model:visible="emailVisible" demo @submit="handleEmailSubmit" />
    <PasswordChangeDialog
      v-model:visible="passwordVisible"
      @submit="handlePasswordSubmit"
    />
    <AvatarCropDialog v-model:visible="cropVisible" :file="pickedFile" @confirm="handleAvatarConfirm" />
  </div>
</template>

<style scoped>
.page-hint {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--color-text-2);
}

.profile-block {
  margin-top: 20px;
}

.demo-actions {
  display: flex;
  gap: 8px;
}
</style>
