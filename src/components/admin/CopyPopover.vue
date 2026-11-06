<script setup lang="ts">
/**
 * 悬停气泡 + 一键复制（2026-11-06）：用户管理的邮箱、登录审计的账号 / User-Agent 共用。
 *
 * 这里不能用 AppTooltip：它 `pointer-events: none`，气泡里的复制按钮点不到，所以走 `el-popover`。
 * 气泡里的整串交给 `<slot />` 之外的 `text`，触发元素（单行省略的那段文字）由调用方塞进默认插槽。
 */
import { onUnmounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import { copyText } from '@/utils/clipboard'

const props = withDefaults(
  defineProps<{
    /** 气泡里展示并复制的完整文本 */
    text: string
    /** 复制按钮的无障碍名称（复制的是什么） */
    copyLabel?: string
    /** 气泡宽度：账号 / 邮箱 300，UA 这类长串给 420 */
    width?: number
  }>(),
  { copyLabel: '复制', width: 300 },
)

/** 刚复制过的那一格：图标就地变勾并转绿，1.6 秒后复位（不用 toast 打扰整屏） */
const copied = ref(false)
let copiedTimer: number | undefined

async function handleCopy() {
  if (!(await copyText(props.text))) {
    ElMessage.error('复制失败，请手动选中')
    return
  }
  copied.value = true
  window.clearTimeout(copiedTimer)
  copiedTimer = window.setTimeout(() => {
    copied.value = false
  }, 1600)
}

onUnmounted(() => window.clearTimeout(copiedTimer))
</script>

<template>
  <el-popover trigger="hover" placement="top" :width="width" :show-after="200" popper-class="copy-popover">
    <template #reference>
      <slot />
    </template>
    <div class="copy-pop">
      <span class="copy-pop__text">{{ text }}</span>
      <!-- 只放图标：文案交给 aria-label，复制成功后图标换成勾并转绿 -->
      <el-button
        link
        class="copy-pop__copy"
        :class="{ 'copy-pop__copy--done': copied }"
        :aria-label="copied ? '已复制' : copyLabel"
        @click="handleCopy"
      >
        <AppIcon :name="copied ? 'check' : 'copy'" :size="14" />
      </el-button>
    </div>
  </el-popover>
</template>

<style>
/*
 * 气泡 teleport 到 body，scoped 够不到 popper 根节点（`.el-popper`），所以整块不 scoped。
 * 全串允许断行（长邮箱 / UA 没有空档），复制按钮贴右；底色、描边、模糊复用全局那套玻璃弹层。
 */
.copy-popover.el-popper {
  padding: 10px 12px;
}

.copy-pop {
  display: flex;
  align-items: center;
  gap: 10px;
}

.copy-pop__text {
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--color-text);
  word-break: break-all;
  /* 点一下就能整串选中，复制失败时还有退路 */
  user-select: all;
}

/* 只有图标：24 的方形热区，默认墨灰、悬停品牌蓝、复制完换成勾并转绿 */
.copy-pop__copy.el-button {
  flex: none;
  width: 24px;
  height: 24px;
  margin-left: 0;
  padding: 0;
  color: var(--color-text-2);
}

.copy-pop__copy.el-button:hover {
  color: var(--color-brand-ink);
}

.copy-pop__copy.el-button.copy-pop__copy--done,
.copy-pop__copy.el-button.copy-pop__copy--done:hover {
  color: var(--color-status-done);
}
</style>
