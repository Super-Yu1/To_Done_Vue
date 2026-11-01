<script setup lang="ts">
/**
 * 全站气泡（2026-10-28）：默认 hover **0.5 秒**才出现。
 *
 * 用在两类东西上：**按钮**（说清按下去会发生什么），以及**没有文字的标记**——
 * 比如任务卡左侧那枚红胶囊（逾期），气泡补一句「逾期」告诉它是什么意思（2026-11-01）。
 * 任务标题那种「重复显示正文」的气泡不用 —— 文字类信息本来就看得见，气泡只会多一层噪音。
 *
 * 直接透传 el-tooltip 的 props / 事件（content、placement、disabled、popper-class…），
 * 个别需要更快或更慢时传 `:show-after="毫秒"` 覆盖默认值。
 */
defineOptions({ inheritAttrs: false })

withDefaults(defineProps<{ showAfter?: number }>(), { showAfter: 500 })
</script>

<template>
  <el-tooltip v-bind="$attrs" :show-after="showAfter">
    <slot />
  </el-tooltip>
</template>
