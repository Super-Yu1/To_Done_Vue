<script setup lang="ts">
/**
 * 冻结弹窗（8.9）：只有冻结需要填原因（≤128 字）。
 *
 * 解冻**不走这个弹窗**（2026-11-02）：它没有可填的字段，一次 `ElMessageBox` 确认就够。
 * 以前解冻也先开这个弹窗、弹窗里再弹一次确认，同一件事要关两遍 —— 现在由
 * `AdminUsersView` 的 `handleToggleFreeze` 分流，这里只负责冻结。
 */
import { computed, reactive, watch } from 'vue'
import type { AdminUser, FreezePayload } from '@/types'

const props = defineProps<{ user: AdminUser | null; submitting?: boolean }>()
const visible = defineModel<boolean>('visible', { required: true })
const emit = defineEmits<{ confirm: [FreezePayload] }>()

const form = reactive({ reason: '' })
const displayName = computed(() => props.user?.name || props.user?.email || '')

watch(visible, (opened) => {
  if (opened) form.reason = ''
})

function handleSubmit() {
  emit('confirm', { frozen: true, reason: form.reason.trim() || undefined })
}
</script>

<template>
  <!-- align-center：弹窗落在视口正中，不再贴着顶部 15vh（2026-11-02） -->
  <el-dialog v-model="visible" title="冻结用户" width="480px" append-to-body align-center>
    <p class="dialog-hint">
      「{{ displayName }}」将<strong>立即被强制退出登录</strong>，之后无法登录，直到被解冻。
      任务、配图与回收站保留不变。
    </p>

    <el-form label-position="top" @submit.prevent>
      <el-form-item label="冻结原因（选填）">
        <el-input
          v-model="form.reason"
          type="textarea"
          :rows="3"
          maxlength="128"
          show-word-limit
          placeholder="例如：疑似批量刷接口"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="danger" :loading="submitting" @click="handleSubmit">冻结</el-button>
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
