<script setup lang="ts">
/**
 * 冻结 / 解冻弹窗（8.9）：冻结可填原因（≤128 字），解冻只做二次确认；
 * 两种操作都会让该用户已签发的 token 立即失效。
 */
import { computed, reactive, ref, watch } from 'vue'
import { ElMessageBox } from 'element-plus'
import type { AdminUser, FreezePayload } from '@/types'

const props = defineProps<{ user: AdminUser | null; submitting?: boolean }>()
const visible = defineModel<boolean>('visible', { required: true })
const emit = defineEmits<{ confirm: [FreezePayload] }>()

const form = reactive({ reason: '' })
const isUnfreeze = computed(() => !!props.user?.frozenAt)
const title = computed(() => (isUnfreeze.value ? '解冻用户' : '冻结用户'))
const displayName = computed(() => props.user?.name || props.user?.email || '')

watch(visible, (opened) => {
  if (opened) form.reason = ''
})

async function handleSubmit() {
  if (!isUnfreeze.value) {
    emit('confirm', { frozen: true, reason: form.reason.trim() || undefined })
    return
  }
  try {
    await ElMessageBox.confirm(
      '解冻后该用户可继续用原密码登录，任务、配图与回收站原样保留。',
      '确认解冻',
      { confirmButtonText: '解冻', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  emit('confirm', { frozen: false })
}
</script>

<template>
  <el-dialog v-model="visible" :title="title" width="480px" append-to-body>
    <p class="dialog-hint">
      <template v-if="isUnfreeze">
        「{{ displayName }}」将恢复登录；其数据不受影响。
      </template>
      <template v-else>
        「{{ displayName }}」将<strong>立即被强制退出登录</strong>，之后无法登录，直到被解冻。
        任务、配图与回收站保留不变。
      </template>
    </p>

    <el-form v-if="!isUnfreeze" label-position="top" @submit.prevent>
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
      <el-button
        :type="isUnfreeze ? 'primary' : 'danger'"
        :loading="submitting"
        @click="handleSubmit"
      >
        {{ isUnfreeze ? '解冻' : '冻结' }}
      </el-button>
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
