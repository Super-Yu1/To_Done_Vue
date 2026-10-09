<script setup lang="ts">
/**
 * 外观（8.7 深色模式）：三态主题只在设置里选，顶栏按钮只切浅/深两态。
 * 这一项在演示模式下同样真实生效——它只影响本地存储与 html 类，不涉及后端。
 */
import { computed } from 'vue'
import { useTheme, type ThemeMode } from '@/composables/useTheme'

const { mode, setMode } = useTheme()

const themeChoice = computed<ThemeMode>({
  get: () => mode.value,
  set: (value) => setMode(value),
})
</script>

<template>
  <section class="section">
    <h2 class="section__title">外观</h2>
    <p class="section__hint">
      首次进入系统时跟随系统主题；选定「浅色」或「深色」后会一直用它，直到在这里改回来。
    </p>
    <el-radio-group v-model="themeChoice">
      <el-radio-button value="auto">跟随系统</el-radio-button>
      <el-radio-button value="light">浅色</el-radio-button>
      <el-radio-button value="dark">深色</el-radio-button>
    </el-radio-group>
  </section>
</template>
