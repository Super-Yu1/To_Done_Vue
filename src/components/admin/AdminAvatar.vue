<script setup lang="ts">
/**
 * 后台表格里的头像（2026-11-05 抽出）：用户管理与管理员管理两张表共用。
 *
 * 有 `avatarUrl` 就显示照片，没有就回落成名字首字的浅灰圆 —— 后台是只读视图，
 * 不在这里做上传或放大，尺寸固定 32，与行高对齐。
 */
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    name?: string | null
    /** 头像直链；后端暂未提供时为空，走首字占位 */
    avatarUrl?: string | null
  }>(),
  { name: '', avatarUrl: null },
)

const initial = computed(() => (props.name || '?').slice(0, 1))
</script>

<template>
  <img v-if="avatarUrl" class="admin-avatar" :src="avatarUrl" alt="头像" />
  <span v-else class="admin-avatar admin-avatar--text">{{ initial }}</span>
</template>

<style scoped>
.admin-avatar {
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  object-fit: cover;
}

.admin-avatar--text {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--color-text-2);
  background-color: var(--color-hover);
}
</style>
