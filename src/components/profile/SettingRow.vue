<script setup lang="ts">
/**
 * 设置行（个人中心的行原语）：左侧项名、中间当前值、右侧动作，与任务行同一套阅读顺序——
 * 用户已经在任务列表里学会「左边是什么、右边能做什么」，这里不再教一遍。
 *
 * 设计要点：
 *   ① 默认只显示**当前值**，表单进弹窗——用户想知道「现在是什么」不必点开任何东西；
 *   ② 鼠标点整行等同点动作（命中区大），但键盘只留动作按钮一个踏板，避免同一动作两处焦点；
 *   ③ 动作平时是次要色，悬停才提亮；破坏性动作（移除、退出）悬停显危险色。
 * 插槽：默认插槽用来放自定义内容（如外观的三态分段控件），此时本行不可点。
 */
defineProps<{
  /** 项名，如「名字」「登录邮箱」 */
  label: string
  /** 当前值；未设置时传文案 + muted */
  value?: string
  /** 值处于「未绑定」这类次要状态 */
  muted?: boolean
  /** 右侧动作文案；不传则本行没有动作 */
  actionText?: string
  /** 破坏性动作：悬停显危险色 */
  danger?: boolean
}>()

const emit = defineEmits<{ action: [] }>()

/** 只有带动作的行才响应整行点击（外观那种自带控件的行不抢它的交互） */
function handleRowClick(actionText?: string) {
  if (actionText) emit('action')
}
</script>

<template>
  <div
    class="setting-row"
    :class="{ 'setting-row--clickable': actionText }"
    @click="handleRowClick(actionText)"
  >
    <span class="setting-row__label">{{ label }}</span>

    <div class="setting-row__value">
      <slot>
        <span :class="{ 'setting-row__text--muted': muted }">{{ value }}</span>
      </slot>
    </div>

    <button
      v-if="actionText"
      class="setting-row__action row-action"
      :class="{ 'row-action--danger': danger }"
      type="button"
      @click.stop="emit('action')"
    >
      {{ actionText }}
    </button>
    <span v-else></span>
  </div>
</template>

<style scoped>
.setting-row {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  min-height: 56px;
  padding: 12px 20px;
  transition: background-color var(--dur-fast) var(--ease);
}

.setting-row--clickable {
  cursor: pointer;
}

.setting-row--clickable:hover,
.setting-row--clickable:focus-within {
  background-color: var(--color-hover);
}

.setting-row__label {
  font-size: 13px;
  color: var(--color-text-2);
}

.setting-row__value {
  min-width: 0;
  font-size: 14px;
  word-break: break-word;
}

.setting-row__text--muted {
  color: var(--color-text-3);
}

/* 动作按钮的外观来自 main.css 的 .row-action；这里只负责它在窄屏的落位 */

/* 窄屏：项名收到值上方，动作仍在右侧，避免三列挤成两行 */
@container (max-width: 560px) {
  .setting-row {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px 12px;
    padding: 12px 16px;
  }

  .setting-row__label {
    grid-column: 1;
    font-size: 12px;
  }

  .setting-row__value {
    grid-column: 1;
  }

  .setting-row__action {
    grid-row: 1 / span 2;
    grid-column: 2;
  }
}
</style>
