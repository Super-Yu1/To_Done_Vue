<script setup lang="ts">
/**
 * 演示模式 · 个人中心（8.6）：与本尊共用同一套分区组件，数据换成内置示范资料。
 * 写操作只提示「演示模式不保存」；「外观」是真实生效的——它只改本地主题，不涉及后端。
 */
import { ElMessage, ElMessageBox } from 'element-plus'
import { RouterLink } from 'vue-router'
import AppearanceSettings from '@/components/profile/AppearanceSettings.vue'
import AvatarSection from '@/components/profile/AvatarSection.vue'
import BasicInfoForm from '@/components/profile/BasicInfoForm.vue'
import ChangeEmailForm from '@/components/profile/ChangeEmailForm.vue'
import ChangePasswordForm from '@/components/profile/ChangePasswordForm.vue'
import { DEMO_USER } from '@/mock/demoProfile'

/** 演示模式的写操作统一口径：提示不保存，不改数据（8.6） */
function notifyNotSaved() {
  ElMessage.info('演示模式不保存，登录后即可真正使用')
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

    <AvatarSection
      :avatar-url="DEMO_USER.avatarUrl"
      :name="DEMO_USER.name"
      @remove="handleRemoveAvatar"
    />
    <BasicInfoForm :user="DEMO_USER" @submit="notifyNotSaved" />
    <ChangeEmailForm demo @submit="notifyNotSaved" />
    <ChangePasswordForm @submit="notifyNotSaved" />
    <AppearanceSettings />

    <section class="section">
      <h2 class="section__title">下一步</h2>
      <p class="section__hint">注册一个账号，就能真正记录并管理你的任务。</p>
      <div class="section__actions">
        <RouterLink to="/register">
          <el-button type="primary">注册账号</el-button>
        </RouterLink>
        <RouterLink to="/login">
          <el-button>登录</el-button>
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page-hint {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--color-text-2);
}
</style>
