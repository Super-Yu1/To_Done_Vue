<script setup lang="ts">
/** 空状态：列表为空时给引导文案与主操作，不留白（见 8.8） */
import AppIcon from './AppIcon.vue'

defineProps<{
  title: string
  description?: string
  /** 传了才渲染操作按钮 */
  actionText?: string
}>()

const emit = defineEmits<{ action: [] }>()
</script>

<template>
  <div class="empty-state">
    <AppIcon class="empty-state__icon" name="inbox" :size="28" />
    <p class="empty-state__title">{{ title }}</p>
    <p v-if="description" class="empty-state__description">{{ description }}</p>
    <el-button v-if="actionText" class="empty-state__action" @click="emit('action')">
      {{ actionText }}
    </el-button>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 64px 24px;
  text-align: center;
}

.empty-state__icon {
  color: var(--color-text-3);
}

.empty-state__title {
  font-size: 14px;
  color: var(--color-text);
}

.empty-state__description {
  font-size: 12px;
  color: var(--color-text-2);
}

.empty-state__action {
  margin-top: 8px;
}
</style>
