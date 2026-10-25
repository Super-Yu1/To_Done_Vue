<script setup lang="ts">
/**
 * 快速输入（H）：只填标题，回车即建 —— 挂在任务列表底部（真实行之后、触底哨兵之前）。
 * 新任务按创建时间倒序会落到未完成组最上面（列表顶部），而输入框在底部：
 * 这里刻意不滚动、不打断录入（连加几条时视线不会被反复拽走），
 * 「已置顶」交给调用方在创建成功后提示。
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
    <AppIcon class="quick-add__icon" name="plus" :size="16" />
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
 * 与任务行同壳（圆角 / 内边距 / 底色），但描边用虚线：
 * 它是一条"待填写"的行，不是已有的任务。
 */
.quick-add {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
  padding: 14px 20px;
  /* 玻璃条上的虚线用墨色兑水：白色描边在浅底上会看不见，这条线得始终读得出来 */
  border: 1px dashed color-mix(in srgb, var(--color-text) 20%, transparent);
  border-radius: var(--radius-card);
  background-color: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  transition: border-color var(--dur-fast) var(--ease);
}

.quick-add:focus-within {
  border-color: var(--color-text-3);
}

.quick-add__icon {
  flex: none;
  margin: 0 5px;
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
  height: 22px;
  font-size: 15px;
}

.quick-add__hint {
  flex: none;
  font-size: 12px;
  color: var(--color-text-3);
}

/* 窄屏：提示文案让位，输入框优先 */
@container (max-width: 640px) {
  .quick-add__hint {
    display: none;
  }
}
</style>
