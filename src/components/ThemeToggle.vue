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
/**
 * 悬浮提示只写当前档位（2026-10-26）：原来「跟随系统」时写作「浅色（跟随系统）」，
 * 按反馈收成「浅色」；是否跟随系统由个人中心的外观设置体现，不在这个两态按钮上解释。
 */
const tip = computed(() => label.value)
</script>

<template>
  <!--
    2026-10-27：悬浮提示改用原生 title —— 与任务行「标记为已完成」那种一致，
    比 EP 的深色气泡更轻快、也不会有动画延迟；提示内容仍是当前档位本身。
  -->
  <button
    class="theme-toggle"
    type="button"
    :title="tip"
    :aria-label="`切换主题，当前为${tip}`"
    @click="toggleTheme"
  >
    <AppIcon :name="isDark ? 'moon' : 'sun'" />
  </button>
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
  /* 用正文色的低透明度：白底、浅灰底上都能看出这一层，不依赖单一底色 */
  background-color: color-mix(in srgb, var(--color-text) 6%, transparent);
}
</style>
