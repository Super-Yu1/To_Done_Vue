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
  gap: 10px;
  padding: 72px 24px;
  text-align: center;
}

.empty-state__icon {
  color: var(--color-text-3);
}

.empty-state__title {
  font-size: 16px;
  color: var(--color-text);
}

.empty-state__description {
  font-size: 13.5px;
  color: var(--color-text-2);
}

/*
 * 空状态的主操作与工具栏的「新建任务」同一支
 * （2026-10-30 定稿二：浅色浅蓝 #69adff + 深字，深色深蓝 #2a6fc9 + 白字）：
 * 胶囊圆角，同一个动作在两处长得一样。
 */
.empty-state__action {
  --el-button-bg-color: var(--color-cta);
  --el-button-border-color: transparent;
  --el-button-text-color: var(--color-cta-fg);
  --el-button-hover-bg-color: var(--color-cta-hover);
  --el-button-hover-border-color: transparent;
  --el-button-hover-text-color: var(--color-cta-fg);
  --el-button-active-bg-color: var(--color-cta-active);
  --el-button-active-border-color: transparent;
  margin-top: 8px;
  border-radius: var(--radius-pill);
}
</style>
