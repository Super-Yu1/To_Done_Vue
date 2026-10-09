<script setup lang="ts">
/** 管理员表格（8.9）：名字 · 上次登录时间 · 创建时间；没有操作列——已有管理员不可改、不可删 */
import { formatDateTime } from '@/utils/date'
import type { AdminInfo } from '@/types'

defineProps<{ admins: AdminInfo[]; loading?: boolean }>()
</script>

<template>
  <el-table :data="admins" v-loading="loading">
    <el-table-column label="名字" min-width="160" prop="name" />
    <el-table-column label="上次登录时间" width="200">
      <template #default="{ row }">
        {{ row.lastLoginAt ? formatDateTime(row.lastLoginAt) : '从未登录' }}
      </template>
    </el-table-column>
    <el-table-column label="创建时间" width="200">
      <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
    </el-table-column>
  </el-table>
</template>
