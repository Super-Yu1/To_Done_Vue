<script setup lang="ts">
/**
 * 外观（8.7 深色模式）：三态主题只在设置里选，顶栏按钮只切浅/深两态。
 * 这一项在演示模式下同样真实生效——它只影响本地存储与 html 类，不涉及后端。
 *
 * 2026-10-26 改版：
 *   ① 去掉「已应用浅色主题 / 跟随系统设置自动切换」这类说明文字 —— 选中态本身已经说明了结果；
 *   ② 控件按全站同一套胶囊语言重画（浅灰底槽 + 选中实底），与筛选条上的状态页签同源，
 *      不再用 Element Plus 的 radio-button（那套是方角分段，和这里的圆润语言不搭）。
 */
import SettingRow from './SettingRow.vue'
import { useTheme, type ThemeMode } from '@/composables/useTheme'

const { mode, setMode } = useTheme()

const OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'auto', label: '跟随系统' },
]
</script>

<template>
  <SettingRow label="外观" align-end>
    <div class="appearance" role="radiogroup" aria-label="外观主题">
      <button
        v-for="option in OPTIONS"
        :key="option.value"
        class="appearance__pill"
        :class="{ 'appearance__pill--on': mode === option.value }"
        type="button"
        role="radio"
        :aria-checked="mode === option.value"
        @click="setMode(option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  </SettingRow>
</template>

<style scoped>
/* 胶囊分段：与筛选条页签（.filter-bar__tabs）同一套尺寸与色阶 */
.appearance {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px;
  border-radius: var(--radius-pill);
  background-color: var(--color-hover);
}

.appearance__pill {
  height: 28px;
  padding: 0 14px;
  border: none;
  border-radius: var(--radius-pill);
  background-color: transparent;
  color: var(--color-text-2);
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease);
}

.appearance__pill:hover {
  color: var(--color-text);
}

.appearance__pill--on {
  background-color: var(--color-primary-bg);
  color: var(--color-primary-fg);
  font-weight: 600;
}

.appearance__pill--on:hover {
  color: var(--color-primary-fg);
}

.appearance__pill:focus-visible {
  outline: 2px solid var(--color-text);
  outline-offset: 2px;
}
</style>
