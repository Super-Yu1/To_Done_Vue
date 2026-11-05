<script setup lang="ts">
/**
 * 重置用户密码弹窗（8.9，2026-11-03 改）：**不再让管理员手输密码**。
 *
 * 点「生成并重置」后由**服务端**生成一串随机口令（与建号时的初始密码同一个生成器），
 * 在响应里只回一次；本弹窗只负责确认，成功后关掉它，再弹「新密码」窗口显示一次。
 * 旧密码与已签发的 token 立即失效，用户拿新密码登录后到个人中心自行修改。
 */
import type { AdminUser } from '@/types'

defineProps<{ user: AdminUser | null; submitting?: boolean }>()
const visible = defineModel<boolean>('visible', { required: true })
const emit = defineEmits<{ confirm: []; closed: [] }>()
</script>

<template>
  <el-dialog
    v-model="visible"
    title="重置用户密码"
    width="480px"
    append-to-body
    align-center
    @closed="emit('closed')"
  >
    <p class="dialog-hint">
      「{{ user?.name || user?.email }}」的密码将被重置为系统生成的随机密码，
      <strong>旧密码立即失效、已登录的会话也会被踢下线</strong>，需用新密码重新登录。
    </p>
    <p class="dialog-hint">
      新密码只在提交后显示一次：请复制并转告本人，对方登录后可到「个人中心 → 密码」自行修改。
    </p>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="emit('confirm')">生成并重置</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.dialog-hint {
  margin-bottom: 8px;
  font-size: 12px;
  line-height: 1.8;
  color: var(--color-text-2);
}
</style>
