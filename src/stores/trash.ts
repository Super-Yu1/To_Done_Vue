/** 回收站（见 8.3、6.5 ⑩） */
import { reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import * as trashApi from '@/api/trash'
import { PAGE_SIZE } from '@/constants'
import type { TrashQuery, TrashTask } from '@/types'

export const useTrashStore = defineStore('trash', () => {
  const query = reactive<TrashQuery>({ page: 1, size: PAGE_SIZE, keyword: '' })
  const tasks = ref<TrashTask[]>([])
  const total = ref(0)
  const totalPages = ref(0)
  const loading = ref(false)

  /**
   * 与任务页 `todo.fetchPage` 同一套：
   * append = true 时把新一页接在尾部（触底加载），false 时整表换成第一页（进页 / 搜索 / 清空后）。
   * 只有一次 loading：首屏用骨架卡，触底加载不额外提示（2026-10-28 与首页对齐）。
   */
  async function fetchPage(page: number, append: boolean) {
    loading.value = true
    try {
      // keyword 为空时不发这个参数：避免后端把空串当成「必须匹配空串」的有效过滤
      const { keyword, ...rest } = query
      const result = await trashApi.fetchTrashTasks({
        ...rest,
        page,
        ...(keyword?.trim() ? { keyword: keyword.trim() } : {}),
      })
      tasks.value = append ? [...tasks.value, ...result.records] : result.records
      total.value = result.total
      totalPages.value = result.totalPages
      // 请求成功才推进页码：失败时列表没变，页码也不该动，重试仍是同一页
      query.page = page
    } finally {
      loading.value = false
    }
  }

  /** 进页 / 筛选变化：从第 1 页重取（与 `todo.fetchTasks` 同名同义） */
  async function fetchTrash() {
    await fetchPage(1, false)
  }

  /** 触底加载下一页；正在加载或已到最后一页就返回（与 `todo.loadMore` 同一条件） */
  async function loadMore() {
    if (loading.value || query.page >= totalPages.value) return
    await fetchPage(query.page + 1, true)
  }

  /**
   * 单条动作后只摘掉这一行，不整表重取（2026-10-27）：
   * 恢复 / 彻底删除后若重取当前页，无限滚动加载过的前几页会被一并丢掉、列表缩回一页。
   */
  function forget(id: string) {
    const index = tasks.value.findIndex((task) => task.id === id)
    if (index === -1) return
    tasks.value.splice(index, 1)
    total.value = Math.max(0, total.value - 1)
    totalPages.value = Math.ceil(total.value / query.size)
  }

  async function restore(id: string) {
    await trashApi.restoreTask(id)
    forget(id)
  }

  async function purge(id: string) {
    await trashApi.purgeTask(id)
    forget(id)
  }

  async function clearTrash() {
    const result = await trashApi.clearTrash()
    // 清空是全量动作：本地直接归零，省一次回查
    tasks.value = []
    total.value = 0
    totalPages.value = 0
    query.page = 1
    return result.removed
  }

  return {
    query,
    tasks,
    total,
    totalPages,
    loading,
    fetchTrash,
    loadMore,
    restore,
    purge,
    clearTrash,
  }
})
