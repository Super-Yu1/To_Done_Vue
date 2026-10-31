<script setup lang="ts">
/**
 * 演示模式 · 个人中心（8.6）：与本尊共用同一套行与弹窗，数据换成内置示范资料。
 * 写操作只提示「演示模式不保存」；两处是真的：①「外观」直接改本地主题；
 * ②头像的 1:1 取景框（本地裁剪，不涉及后端），只是确认后不上传。
 */
import { nextTick, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { InputInstance } from 'element-plus'
import AppearanceSettings from '@/components/profile/AppearanceSettings.vue'
import AvatarCropDialog from '@/components/profile/AvatarCropDialog.vue'
import EmailChangeDialog from '@/components/profile/EmailChangeDialog.vue'
import IdentityRow from '@/components/profile/IdentityRow.vue'
import PasswordChangeDialog from '@/components/profile/PasswordChangeDialog.vue'
import SettingRow from '@/components/profile/SettingRow.vue'
import { DEMO_USER } from '@/mock/demoProfile'
import { formatDate } from '@/utils/date'
import { validateName, validatePhone } from '@/utils/validate'

const emailVisible = ref(false)
const passwordVisible = ref(false)
const cropVisible = ref(false)
const pickedFile = ref<File | null>(null)

/** 演示模式的写操作统一口径：提示不保存，不改数据（8.6） */
function notifyNotSaved() {
  ElMessage.info('演示模式不保存，注册账号后即可真正使用')
}

/* ---------- 用户名 / 手机号：行内编辑（2026-10-31，与正式页同一套交互） ---------- */
type InlineField = 'name' | 'phone'

const editingField = ref<InlineField | null>(null)
const draft = ref('')
const nameInputRef = ref<InputInstance | null>(null)
const phoneInputRef = ref<InputInstance | null>(null)

function startEdit(field: InlineField) {
  editingField.value = field
  draft.value = field === 'name' ? DEMO_USER.name : (DEMO_USER.phone ?? '')
}

watch(editingField, async (field) => {
  if (!field) return
  await nextTick()
  const target = field === 'name' ? nameInputRef : phoneInputRef
  target.value?.focus()
})

/** 演示页只校验形态、不动数据：校验过了就退出编辑态并提示不保存（与其余写操作一致） */
function confirmEdit(field: InlineField) {
  const error = field === 'name' ? validateName(draft.value) : validatePhone(draft.value)
  if (error) {
    ElMessage.error(error)
    return
  }
  editingField.value = null
  notifyNotSaved()
}

function cancelEdit() {
  editingField.value = null
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
      />
    </div>

    <h2 class="settings-group-title">账号</h2>
    <div class="settings-group">
      <!-- 用户名 / 手机号行内编辑（2026-10-31）：与正式页同一套，回车确认、Esc 取消 -->
      <SettingRow
        label="用户名"
        :value="DEMO_USER.name"
        :editing="editingField === 'name'"
        action-text="编辑"
        @action="editingField === 'name' ? confirmEdit('name') : startEdit('name')"
        @cancel="cancelEdit"
      >
        <template #editor>
          <el-input
            ref="nameInputRef"
            v-model="draft"
            class="inline-input"
            maxlength="32"
            placeholder="显示用的称呼，可以重复"
            @keyup.enter="confirmEdit('name')"
            @keyup.esc="cancelEdit"
          />
        </template>
      </SettingRow>
      <SettingRow
        label="手机号"
        :value="DEMO_USER.phone || '未绑定'"
        :muted="!DEMO_USER.phone"
        :editing="editingField === 'phone'"
        action-text="编辑"
        @action="editingField === 'phone' ? confirmEdit('phone') : startEdit('phone')"
        @cancel="cancelEdit"
      >
        <template #editor>
          <el-input
            ref="phoneInputRef"
            v-model="draft"
            class="inline-input"
            maxlength="20"
            placeholder="选填，留空即解绑"
            @keyup.enter="confirmEdit('phone')"
            @keyup.esc="cancelEdit"
          />
        </template>
      </SettingRow>
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

    <EmailChangeDialog
      v-model:visible="emailVisible"
      :current-email="DEMO_USER.email"
      demo
      @submit="handleEmailSubmit"
    />
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

/* 行内编辑的输入框（2026-10-31）：与正式页同一个上限，别让一根输入框横穿整行 */
.inline-input {
  max-width: 320px;
}
</style>
