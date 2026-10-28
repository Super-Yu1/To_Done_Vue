<script setup lang="ts">
/**
 * 快速输入（H）：只填标题，回车即建 —— 挂在任务列表最底部（真实行之后、触底哨兵之前）。
 * 新任务按创建时间倒序会落到未完成组最上面（列表顶部），而输入框在底部：
 * 这里刻意不滚动、不打断录入（连加几条时视线不会被反复拽走），
 * 「已置顶」交给调用方在创建成功后提示。
 *
 * 2026-10-27 四改：回到**虚线卡**，与任务卡同一套圆角、内边距与栅格，
 * 只把描边换成虚线、底色压淡一档 —— 读成「最后一张待填的卡」。
 */
import { ref } from 'vue'
import AppIcon from './AppIcon.vue'

defineProps<{ submitting?: boolean }>()
const emit = defineEmits<{ create: [string] }>()

const title = ref('')

function handleSubmit() {
  const text = title.value.trim()
  if (!text) return
  emit('create', text)
  title.value = ''
}
</script>

<template>
  <div class="quick-add">
    <AppIcon class="quick-add__icon" name="plus" :size="18" />
    <el-input
      v-model="title"
      class="quick-add__input"
      placeholder="添加任务，回车即创建"
      maxlength="100"
      :disabled="submitting"
      @keydown.enter.prevent="handleSubmit"
    />
    <span class="quick-add__hint">回车创建 · 新任务会置顶</span>
  </div>
</template>

<style scoped>
/*
 * 与任务卡同壳（20px 圆角 / 22 内边距 / 40 前置位），唯一的不同是描边用虚线：
 * 它是一条「待填写」的卡，不是已有的任务。底色比真卡更淡，才不会读成「又一条任务」。
 */
.quick-add {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 12px;
  padding: 15px 22px;
  border: 1px dashed color-mix(in srgb, var(--color-text) 22%, transparent);
  border-radius: var(--radius-lg);
  background-color: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(12px);
  transition: background-color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease);
}

.quick-add:hover {
  border-color: color-mix(in srgb, var(--color-brand) 45%, transparent);
  background-color: rgba(255, 255, 255, 0.44);
}

/* 聚焦 = 虚线转品牌色 + 一圈极淡的蓝，说明「这里正在输入」 */
.quick-add:focus-within {
  border-color: var(--color-brand);
  background-color: rgba(255, 255, 255, 0.52);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-brand) 10%, transparent);
}

html.dark .quick-add {
  background-color: rgba(255, 255, 255, 0.04);
}

html.dark .quick-add:hover {
  background-color: rgba(255, 255, 255, 0.07);
}

html.dark .quick-add:focus-within {
  background-color: rgba(255, 255, 255, 0.09);
}

.quick-add__icon {
  flex: none;
  /* 18 + 11×2 = 40，正好是任务行的勾选列宽，标题才会落在同一条竖线上 */
  margin: 0 11px;
  color: var(--color-text-3);
}

.quick-add__input {
  flex: 1;
  min-width: 0;
}

.quick-add__input :deep(.el-input__wrapper) {
  padding: 0;
  background-color: transparent;
  box-shadow: none;
}

.quick-add__input :deep(.el-input__inner) {
  height: 24px;
  font-size: 16px;
}

.quick-add__hint {
  flex: none;
  font-size: 12px;
  color: var(--color-text-3);
  opacity: 0;
  transition: opacity var(--dur-fast) var(--ease);
}

/* 提示只在鼠标进来或正在输入时出现：平时它就是一行「+ 添加任务」 */
.quick-add:hover .quick-add__hint,
.quick-add:focus-within .quick-add__hint {
  opacity: 1;
}

/* 窄屏：提示文案让位，输入框优先 */
@container (max-width: 640px) {
  .quick-add__hint {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .quick-add__hint {
    transition: none;
  }
}
</style>
