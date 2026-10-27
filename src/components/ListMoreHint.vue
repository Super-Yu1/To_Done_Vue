<script setup lang="ts">
/**
 * 触底加载提示（2026-10-28）：任务页与回收站共用的一枚底部提示。
 *
 * 默认**不显示** —— 两个列表的 `loadingMore` 都默认 false，页面不传 `:loading-more` 就完全看不到它，
 * 与首页现在的表现一致。哪天想让某一页出现「正在加载…」，在那一页的列表上补一行
 * `:loading-more="store.loading"` 即可，两处各自决定、也可以同时打开。
 */
defineProps<{
  /** 是否正在加载下一页；false / 不传时整块不渲染，不占位 */
  loading?: boolean
}>()
</script>

<template>
  <p v-if="loading" class="list-more-hint" role="status" aria-live="polite">正在加载…</p>
</template>

<style scoped>
.list-more-hint {
  padding: 12px 0 4px;
  font-size: 12px;
  color: var(--color-text-2);
  text-align: center;
}
</style>
