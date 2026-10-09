<script setup lang="ts">
/**
 * 顶栏主题按钮：只切浅色 / 深色两态（2026-10-10 需求变更）。
 * 「跟随系统」不在这里循环，改到个人中心的外观设置里选；
 * 当前正处于「跟随系统」时，按钮按眼前实际显示的反面切，并在提示里说明这一点。
 */
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import { useTheme } from '@/composables/useTheme'

const { mode, isDark, toggleTheme } = useTheme()

const isFollowingSystem = computed(() => mode.value === 'auto')
const label = computed(() => (isDark.value ? '深色' : '浅色'))
const tip = computed(() => (isFollowingSystem.value ? `${label.value}（跟随系统）` : label.value))
</script>

<template>
  <el-tooltip :content="`主题：${tip}`" placement="bottom">
    <button
      class="theme-toggle"
      type="button"
      :aria-label="`切换主题，当前为${tip}`"
      @click="toggleTheme"
    >
      <AppIcon :name="isDark ? 'moon' : 'sun'" />
    </button>
  </el-tooltip>
</template>

<style scoped>
.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: var(--radius-md);
  color: var(--color-text-2);
  background: transparent;
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease), background-color var(--dur-fast) var(--ease);
}

.theme-toggle:hover {
  color: var(--color-text);
  background-color: var(--color-hover);
}
</style>
