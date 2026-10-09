<script setup lang="ts">
/** 头像分区（UC-09 / 8.8）：真实页与演示页共用；上传（含 1:1 裁剪）尚未实现，先提供移除 */
import { computed } from 'vue'

const props = defineProps<{ avatarUrl: string | null; name: string }>()
const emit = defineEmits<{ remove: [] }>()

const initial = computed(() => (props.name || '我').slice(0, 1))
</script>

<template>
  <section class="section">
    <h2 class="section__title">头像</h2>
    <div class="avatar-row">
      <img v-if="avatarUrl" class="avatar-lg" :src="avatarUrl" alt="头像" />
      <span v-else class="avatar-lg avatar-lg--text">{{ initial }}</span>
      <div class="avatar-row__info">
        <p class="text-2">头像上传需要 1:1 取景框裁剪（前端裁成 512×512 后上传），本项尚未实现。</p>
        <el-button v-if="avatarUrl" size="small" @click="emit('remove')">移除头像</el-button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.avatar-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 12px;
}

.avatar-lg {
  width: 72px;
  height: 72px;
  flex: none;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  object-fit: cover;
}

.avatar-lg--text {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: var(--color-text-2);
  background-color: var(--color-hover);
}

.avatar-row__info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  line-height: 1.7;
}
</style>
