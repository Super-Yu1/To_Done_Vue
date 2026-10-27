<script setup lang="ts">
/**
 * 全站气泡（2026-10-28）：默认 hover **0.5 秒**才出现，只用于按钮。
 *
 * 直接透传 el-tooltip 的 props / 事件（content、placement、disabled、popper-class…），
 * 个别需要更快或更慢时传 `:show-after="毫秒"` 覆盖默认值。
 * 任务标题那种「重复显示正文」的气泡不再使用 —— 文字类信息不用气泡。
 */
defineOptions({ inheritAttrs: false })

withDefaults(defineProps<{ showAfter?: number }>(), { showAfter: 500 })
</script>

<template>
  <el-tooltip v-bind="$attrs" :show-after="showAfter">
    <slot />
  </el-tooltip>
</template>
