<script setup lang="ts">
/**
 * 管理员表格（8.9）：头像 · 用户名 · 上次登录时间 · 创建时间；没有操作列——已有管理员不可改、不可删。
 * 头像列（2026-11-05）：管理员没有头像字段，**名字首字就是最终形态**（不做上传、不催后端加字段）。
 */
import AdminAvatar from './AdminAvatar.vue'
import DateTimeCell from './DateTimeCell.vue'
import type { AdminInfo } from '@/types'

defineProps<{ admins: AdminInfo[]; loading?: boolean }>()
</script>

<template>
  <el-table :data="admins" v-loading="loading && !admins.length"
    element-loading-background="transparent">
    <el-table-column label="头像" width="56">
      <template #default="{ row }"><AdminAvatar :name="row.name" /></template>
    </el-table-column>
    <el-table-column label="用户名" min-width="160" prop="name" />
    <!-- 时间列统一两行：上日期、下时刻（2026-11-05） -->
    <el-table-column label="上次登录时间" width="200">
      <template #default="{ row }"><DateTimeCell :value="row.lastLoginAt" fallback="从未登录" /></template>
    </el-table-column>
    <el-table-column label="创建时间" width="200">
      <template #default="{ row }"><DateTimeCell :value="row.createdAt" /></template>
    </el-table-column>
  </el-table>
</template>
