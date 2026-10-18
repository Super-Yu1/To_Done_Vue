<script setup lang="ts">
/**
 * 外观（8.7 深色模式）：三态主题只在设置里选，顶栏按钮只切浅/深两态。
 * 这一项在演示模式下同样真实生效——它只影响本地存储与 html 类，不涉及后端。
 * 版式上它是一条设置行：值的位置放三态分段控件（控件自带交互，所以整行不响应点击）。
 */
import { computed } from 'vue'
import SettingRow from './SettingRow.vue'
import { useTheme, type ThemeMode } from '@/composables/useTheme'

const { mode, setMode } = useTheme()

const themeChoice = computed<ThemeMode>({
  get: () => mode.value,
  set: (value) => setMode(value),
})

/** 说明文字跟着选中项走（2026-10-18）：说清「现在用的是哪一档」 */
const hint = computed(() => {
  if (mode.value === 'light') return '已应用浅色主题'
  if (mode.value === 'dark') return '已应用深色主题'
  return '跟随系统设置自动切换'
})
</script>

<template>
  <SettingRow label="外观">
    <div class="appearance">
      <el-radio-group v-model="themeChoice" size="small">
        <el-radio-button value="light">浅色</el-radio-button>
        <el-radio-button value="dark">深色</el-radio-button>
        <el-radio-button value="auto">跟随系统</el-radio-button>
      </el-radio-group>
      <span class="appearance__hint">{{ hint }}</span>
    </div>
  </SettingRow>
</template>

<style scoped>
.appearance {
  display: flex;
  align-items: center;
  gap: 12px;
}

.appearance__hint {
  font-size: 12px;
  color: var(--color-text-3);
}

/* 窄屏：提示文字接受分段控件下面，别把控件挤窄 */
@container (max-width: 560px) {
  .appearance {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
