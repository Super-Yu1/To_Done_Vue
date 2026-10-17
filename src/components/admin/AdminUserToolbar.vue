<script setup lang="ts">
/** 用户管理工具条（8.9）：搜索（邮箱 / 用户名 / 手机号，防抖 300ms）、状态筛选、刷新 */
import { onUnmounted, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { SEARCH_DEBOUNCE_MS } from '@/constants'
import type { AdminUserQuery, UserStatus } from '@/types'

const props = defineProps<{ query: AdminUserQuery }>()
const emit = defineEmits<{ change: []; refresh: [] }>()

/**
 * 状态选项：用「清空筛选」表达「不传 status」= 正常 + 已冻结（6.5 ⑫）。
 * 不给选项传 undefined —— Element Plus 的 el-option 不接 undefined，会报属性类型告警。
 */
const STATUS_OPTIONS: { value: UserStatus; label: string }[] = [
  { value: 'NORMAL', label: '正常' },
  { value: 'FROZEN', label: '已冻结' },
  { value: 'DELETED', label: '已注销' },
]

let debounceTimer: number | undefined

watch(
  () => props.query.keyword,
  () => {
    window.clearTimeout(debounceTimer)
    debounceTimer = window.setTimeout(() => emit('change'), SEARCH_DEBOUNCE_MS)
  },
)

onUnmounted(() => window.clearTimeout(debounceTimer))

/** 清空（clearable）时 EP 给的是空字符串，统一折成 undefined = 不筛选 */
function handleStatusChange(value: UserStatus | '' | undefined) {
  props.query.status = value ? value : undefined
  emit('change')
}

function clearFilters() {
  props.query.keyword = ''
  props.query.status = undefined
  emit('change')
}

defineExpose({ clearFilters })
</script>

<template>
  <div class="toolbar">
    <el-input v-model="query.keyword" class="toolbar__search" placeholder="搜索邮箱 / 用户名 / 手机号" clearable>
      <template #prefix>
        <AppIcon name="search" />
      </template>
    </el-input>

    <el-select
      class="toolbar__status"
      :model-value="query.status"
      placeholder="全部（正常 + 已冻结）"
      clearable
      @change="handleStatusChange"
    >
      <el-option
        v-for="item in STATUS_OPTIONS"
        :key="item.label"
        :label="item.label"
        :value="item.value"
      />
    </el-select>

    <el-button @click="emit('refresh')">
      <AppIcon name="refresh" />
      <span class="toolbar__text">刷新</span>
    </el-button>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 16px;
}

.toolbar__search {
  width: 280px;
}

.toolbar__status {
  width: 200px;
}

.toolbar__text {
  margin-left: 6px;
}
</style>
