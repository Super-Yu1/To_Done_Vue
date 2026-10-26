<script setup lang="ts">
import { RouterView } from 'vue-router'
import TitleTip from '@/components/TitleTip.vue'
</script>

<template>
  <RouterView />
  <!-- 全局悬浮提示（2026-10-27）：接管所有原生 title，统一 150ms 延迟 -->
  <TitleTip />
</template>
