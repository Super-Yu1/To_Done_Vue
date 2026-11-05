<script setup lang="ts">
/**
 * 侧栏底部那一行（2026-11-01 抽出）：**身份位（插槽）+ 主题 + 折叠**。
 *
 * 前台与演示模式共用这一份：前台的身份位是「头像 + 用户名」（点开用户菜单），
 * 演示模式是单枚「去登录」按钮 —— 除了那一格，其余位置、间距、折叠动画完全一致。
 * 原来演示模式没有折叠按钮，左下角和前台不是一套，就是缺了这层共用。
 *
 * 布局是**三个绝对定位的格子**（不是 flex）：折叠时三枚元素各自滑到新位置，
 * 靠 `left / top` 的过渡，而不是重排或淡入淡出。折叠态的两处落点与整体高度用
 * CSS 变量留了出口（`--stacked-row-height` 等），演示那边身份位更高，覆盖即可。
 */
import AppIcon from './AppIcon.vue'
import AppTooltip from './AppTooltip.vue'
import ThemeToggle from './ThemeToggle.vue'

withDefaults(defineProps<{ collapsed?: boolean }>(), { collapsed: false })

const emit = defineEmits<{ toggle: [] }>()
</script>

<template>
  <div class="side-row" :class="{ 'side-row--stacked': collapsed }">
    <slot />

    <!-- 主题按钮的定位写在 `.side-row :deep(.theme-toggle)` 里：
         挂在组件上的 class 会穿过 AppTooltip，落不到这个 button 上 -->
    <ThemeToggle />

    <AppTooltip :content="collapsed ? '展开' : '折叠'" placement="top">
      <button
        class="side-tool side-row__tool side-row__collapse"
        type="button"
        :aria-label="collapsed ? '展开侧栏' : '折叠侧栏'"
        :aria-expanded="!collapsed"
        @click="emit('toggle')"
      >
        <AppIcon :name="collapsed ? 'expand' : 'collapse'" :size="16" />
      </button>
    </AppTooltip>
  </div>
</template>

<style scoped>
/*
 * 底部一排（2026-10-29 重做）：容器只负责高度，三枚按钮各自绝对定位。
 * 身份位占 70%，主题 / 折叠各占 15% 的两格中线；折叠态容器长到 120
 * （40 + 8 + 32 + 8 + 32），三枚按钮的 left / top 一起滑过去 —— 是位移，不是淡出重画。
 *
 * 折叠态的三个数走 CSS 变量（这里只给 fallback）：演示模式的身份位是两个按钮、
 * 收起来占得更高，那边直接在根上加 class 覆盖，不用改这个组件。
 */
.side-row {
  position: relative;
  /*
   * 展开态的高度可被调用方覆盖（2026-11-02）：后台的身份位是「头像 + 上次登录」两行，
   * 比前台的「头像 + 用户名」高 20px。默认仍是 40，前台什么都不用传。
   */
  height: var(--row-height, 40px);
  transition: height 280ms cubic-bezier(0.22, 1, 0.36, 1);
}

/*
 * 用 .side-row 提权：`.side-tool` 自己那条 transition（颜色 / transform）写在后面，
 * 同权重会把这里的 left / top 过渡顶掉 —— 那样折叠钮就是直接跳过去的。
 * transition 是整条覆盖，所以悬停变色与按下缩放要一起抄过来。
 */
.side-row .side-row__tool {
  position: absolute;
  top: 4px;
  transition:
    left 280ms cubic-bezier(0.22, 1, 0.36, 1),
    top 280ms cubic-bezier(0.22, 1, 0.36, 1),
    color var(--dur-fast) var(--ease),
    background-color var(--dur-fast) var(--ease),
    transform 120ms var(--ease);
}

/* 主题按钮的 class 落不到组件根节点上（穿过 AppTooltip），这里从父级点名它 */
.side-row :deep(.theme-toggle) {
  position: absolute;
  top: 4px;
  left: calc(77.5% - 16px);
  /* 同理：整条 transition 会覆盖组件自带的那条，颜色与按下缩放要一起带上 */
  transition:
    left 280ms cubic-bezier(0.22, 1, 0.36, 1),
    top 280ms cubic-bezier(0.22, 1, 0.36, 1),
    color var(--dur-fast) var(--ease),
    background-color var(--dur-fast) var(--ease),
    transform 120ms var(--ease);
}

.side-row__collapse {
  left: calc(92.5% - 16px);
}

/* 折叠态：三枚按钮竖排居中，40 / 48 / 88 的节奏与 76px 浮岛一致 */
.side-row--stacked {
  height: var(--stacked-row-height, 120px);
}

.side-row--stacked :deep(.theme-toggle) {
  left: calc(50% - 16px);
  top: var(--stacked-theme-top, 48px);
}

.side-row--stacked .side-row__collapse {
  left: calc(50% - 16px);
  top: var(--stacked-collapse-top, 88px);
}

/* 图标按钮：32 见方、透明底，悬停才浮一层 */
.side-tool {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: var(--radius-control);
  background-color: transparent;
  color: var(--color-text-3);
  cursor: pointer;
  transition:
    color var(--dur-fast) var(--ease),
    background-color var(--dur-fast) var(--ease),
    transform 120ms var(--ease);
}

.side-tool:hover {
  color: var(--color-text);
  background-color: var(--control-hover);
}

/* 按下就缩一下：反馈发生在 pointer-down，不等 click（2026-10-27 三改） */
.side-tool:active {
  transform: scale(0.97);
}
</style>
