<script setup lang="ts">
/** 404：路径不存在（8.2 的兜底路由） */
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'

const router = useRouter()
</script>

<template>
  <div class="not-found">
    <p class="not-found__code">404</p>
    <p class="not-found__title">页面不存在</p>
    <p class="not-found__description">链接可能已失效，或者这个地址从来就不存在。</p>
    <div class="not-found__actions">
      <el-button @click="router.back()">
        <AppIcon name="back" />
        <span class="btn-text">返回上一页</span>
      </el-button>
      <el-button type="primary" @click="router.push('/tasks')">回到任务列表</el-button>
    </div>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  background-color: var(--color-bg);
  text-align: center;
}

.not-found__code {
  font-size: 40px;
  font-weight: 600;
  color: var(--color-text-3);
}

.not-found__title {
  margin-top: 8px;
  font-size: 20px;
}

.not-found__description {
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-text-2);
}

.not-found__actions {
  display: flex;
  gap: 8px;
  margin-top: 24px;
}
</style>
