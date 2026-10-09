<script setup lang="ts">
/** 管理员管理（8.9）：列表只读（已有管理员不可改、不可删）+ 新增管理员 */
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import AdminTable from '@/components/admin/AdminTable.vue'
import CreateAdminDialog from '@/components/admin/CreateAdminDialog.vue'
import { useAdminStore } from '@/stores/admin'
import type { CreateAdminPayload } from '@/types'

const adminStore = useAdminStore()

const createVisible = ref(false)
const submitting = ref(false)
const loading = ref(false)
const createError = ref('')

async function guard(action: () => Promise<unknown>) {
  try {
    await action()
  } catch {
    // 提示已由 http 层给出
  }
}

async function loadAdmins() {
  loading.value = true
  try {
    await adminStore.fetchAdmins()
  } catch {
    // 提示已由 http 层给出
  } finally {
    loading.value = false
  }
}

onMounted(loadAdmins)

function openCreate() {
  createError.value = ''
  createVisible.value = true
}

async function handleCreate(payload: CreateAdminPayload) {
  submitting.value = true
  createError.value = ''
  try {
    await adminStore.createAdmin(payload)
    createVisible.value = false
    ElMessage.success('已创建。密码一旦创建不可修改，请妥善保存')
  } catch (error) {
    // 5002 管理员名重复：弹窗保持打开并就地提示
    createError.value = error instanceof Error ? error.message : '创建失败'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="admin-admins">
    <header class="page-header">
      <div>
        <h1 class="page-title">管理员管理</h1>
        <p class="page-header__hint">
          已有管理员不可改名、不可改密、不可删除；忘记密码只能手工改库。
        </p>
      </div>
      <el-button type="primary" @click="openCreate">
        <AppIcon name="plus" />
        <span class="btn-text">新增管理员</span>
      </el-button>
    </header>

    <AdminTable :admins="adminStore.admins" :loading="loading" />

    <CreateAdminDialog
      v-model:visible="createVisible"
      :submitting="submitting"
      :server-error="createError"
      @confirm="handleCreate"
    />
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 16px;
}

.page-header__hint {
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-text-2);
}
</style>
