<script setup lang="ts">
/**
 * 表格里的时间单元格（2026-11-05 用户要求）：**两行** —— 上面日期、下面时刻。
 *
 * 后台三列（注册时间 / 上次登录时间 / 审计时间）原来是一行「2026-11-01 21:51」，
 * 140 / 150 的列宽里被挤成一整串；拆成两行后日期不再折行，扫读也更快。
 * 单元格本身是居中的（`.admin-panel .el-table .cell { text-align: center }`），
 * 这里只负责分行与第二行的弱化，不改对齐方式。
 */
import { computed } from 'vue'
import { formatDate, formatTime } from '@/utils/date'

const props = withDefaults(
  defineProps<{
    /** 时间串（后端 `yyyy-MM-dd'T'HH:mm:ss`）；空或解析不出来时显示 fallback */
    value?: string | null
    /** 没有时间的占位：上次登录可能确实没有记录，用「—」而不是「从未」 */
    fallback?: string
  }>(),
  { value: null, fallback: '—' },
)

const date = computed(() => formatDate(props.value))
const time = computed(() => formatTime(props.value))
</script>

<template>
  <span v-if="date" class="date-time">
    <span class="date-time__date">{{ date }}</span>
    <span class="date-time__time">{{ time }}</span>
  </span>
  <span v-else class="date-time__empty">{{ fallback }}</span>
</template>

<style scoped>
.date-time {
  display: block;
  line-height: 1.35;
}

.date-time__date,
.date-time__time {
  display: block;
}

/* 时刻弱一档：日期是主信息，时分只在需要精确时看 */
.date-time__time {
  color: var(--color-text-2);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.date-time__empty {
  color: var(--color-text-2);
}
</style>
