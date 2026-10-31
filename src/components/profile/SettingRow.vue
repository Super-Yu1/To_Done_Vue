<script setup lang="ts">
/**
 * 设置行（个人中心的行原语）：左侧项名、中间当前值、右侧动作，与任务行同一套阅读顺序——
 * 用户已经在任务列表里学会「左边是什么、右边能做什么」，这里不再教一遍。
 *
 * 设计要点：
 *   ① 默认只显示**当前值**；用户名 / 手机号改成行内编辑（2026-10-31），其余仍进弹窗；
 *   ② **只有右侧按钮可点**（2026-10-31 改动）：原来整行都能点，命中区大但会和行内编辑打架 ——
 *      输入框里点一下就把编辑关掉了。现在整行只是容器，`cursor` 也不再是 pointer；
 *   ③ 编辑态（`editing`）时右侧换成「取消 / 确认」，值列由调用方用默认插槽塞输入框；
 *   ④ 动作平时是次要色，悬停才提亮；破坏性动作（移除、退出）悬停显危险色。
 */
defineProps<{
  /** 项名，如「用户名」「登录邮箱」 */
  label: string
  /** 当前值；未设置时传文案 + muted */
  value?: string
  /** 值处于「未绑定」这类次要状态 */
  muted?: boolean
  /** 右侧动作文案（非编辑态）；不传则本行没有动作 */
  actionText?: string
  /** 破坏性动作：悬停显危险色 */
  danger?: boolean
  /**
   * 控件类设置（外观 / 删除前二次确认）：把中间的值列推到**右侧**，
   * 与账号行右侧的动作按钮对齐（2026-10-26 反馈：控件贴在左边看着像没做完）。
   */
  alignEnd?: boolean
  /** 行内编辑中：值区域换成输入框（插槽），右侧变成「取消 / 确认」 */
  editing?: boolean
  /** 正在提交：两个按钮都禁用，确认按钮显示「保存中…」 */
  saving?: boolean
}>()

const emit = defineEmits<{ action: []; cancel: [] }>()
</script>

<template>
  <div class="setting-row" :class="{ 'setting-row--editing': editing }">
    <span class="setting-row__label">{{ label }}</span>

    <div class="setting-row__value" :class="{ 'setting-row__value--end': alignEnd }">
      <!--
        编辑态用独立的 `editor` 插槽：默认插槽要留给「外观」「删除二次确认」这类**常驻控件**，
        不能和输入框共用一个槽 —— 否则调用方一旦提供了默认插槽，`value` 文本就永远不渲染了。
      -->
      <slot v-if="editing" name="editor" />
      <slot v-else>
        <span :class="{ 'setting-row__text--muted': muted }">{{ value }}</span>
      </slot>
    </div>

    <!-- 编辑态：右侧从「编辑」换成「取消 / 确认」，确认是这一行的落点 -->
    <div v-if="editing" class="setting-row__edit-actions">
      <button class="row-action" type="button" :disabled="saving" @click="emit('cancel')">
        取消
      </button>
      <button
        class="row-action row-action--primary"
        type="button"
        :disabled="saving"
        @click="emit('action')"
      >
        {{ saving ? '保存中…' : '确认' }}
      </button>
    </div>

    <button
      v-else-if="actionText"
      class="setting-row__action row-action"
      :class="{ 'row-action--danger': danger }"
      type="button"
      @click.stop="emit('action')"
    >
      {{ actionText }}
    </button>
    <!--
      align-end 时值列已跨到最后一列，这个占位 span 会被挤到第二行（0 高，但带走 16px 的 row-gap），
      导致整行内容上移 8px —— 这种行不要再渲染它（2026-10-26 修复）。
    -->
    <span v-else-if="!alignEnd"></span>
  </div>
</template>

<style scoped>
.setting-row {
  display: grid;
  /* 96px 足够放下「删除二次确认」这类 6 字标签，不再折行 */
  grid-template-columns: 96px minmax(0, 1fr) auto;
  align-items: center;
  /* 只要列间距：单行设置行不需要 row-gap（留它会因意外换行多出半截间距，见上方模板注释） */
  column-gap: 16px;
  min-height: 56px;
  padding: 12px 20px;
  transition: background-color var(--dur-fast) var(--ease);
}

/*
 * 整行悬停的浅灰底保留 —— 它是「这一行」的反馈，不是「可点」的暗示；
 * 可点的暗示交给右侧按钮自己的悬停色（2026-10-31 去掉整行 click）。
 */
.setting-row:hover,
.setting-row:focus-within {
  background-color: var(--color-row-hover);
}

/* 左侧项名加深到正文色：浅底上不再发灰，可读性优先 */
.setting-row__label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
}

/* 行悬停时右侧动作同步加深；危险动作悬停更深一档 */
.setting-row:hover .row-action {
  color: var(--color-text);
}

.setting-row:hover .row-action--danger {
  color: var(--color-danger-hover);
}

/* 确认按钮在悬停时仍保持主色：它是这一行唯一的「落点」，不该被融进正文色 */
.setting-row:hover .row-action--primary {
  color: var(--color-accent-hover);
}

.setting-row__value {
  min-width: 0;
  font-size: 14px;
  word-break: break-word;
}

/*
 * 控件贴右：跨到行尾（第 2 列到最后一列），这样控件右缘与账号行「编辑 / 更换 / 修改」
 * 落在同一条竖线上（20px 内边距处），而不是隔着一道列间距。
 */
.setting-row__value--end {
  display: flex;
  grid-column: 2 / -1;
  justify-content: flex-end;
}

.setting-row__text--muted {
  color: var(--color-text-3);
}

/* 编辑态右侧的两枚文字按钮：取消在左、确认在右，间距收到 2 —— 它们是一组，不是两个独立动作 */
.setting-row__edit-actions {
  display: flex;
  align-items: center;
  gap: 2px;
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

  .setting-row__action,
  .setting-row__edit-actions {
    grid-row: 1 / span 2;
    grid-column: 2;
  }
}
</style>
