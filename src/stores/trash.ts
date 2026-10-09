/** 回收站（见 8.3、6.5 ⑩） */
import { reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import * as trashApi from '@/api/trash'
import { PAGE_SIZE } from '@/constants'
import type { TrashQuery, TrashTask } from '@/types'

export const useTrashStore = defineStore('trash', () => {
  const query = reactive<TrashQuery>({ page: 1, size: PAGE_SIZE })
  const tasks = ref<TrashTask[]>([])
  const total = ref(0)
  const totalPages = ref(0)
  const loading = ref(false)

  async function fetchTrash(page = query.page) {
    loading.value = true
    query.page = page
    try {
      const result = await trashApi.fetchTrashTasks({ ...query })
      tasks.value = result.records
      total.value = result.total
      totalPages.value = result.totalPages
    } finally {
      loading.value = false
    }
  }

  async function restore(id: string) {
    await trashApi.restoreTask(id)
    const isLastOfPage = tasks.value.length === 1 && query.page > 1
    await fetchTrash(isLastOfPage ? query.page - 1 : query.page)
  }

  async function purge(id: string) {
    await trashApi.purgeTask(id)
    const isLastOfPage = tasks.value.length === 1 && query.page > 1
    await fetchTrash(isLastOfPage ? query.page - 1 : query.page)
  }

  async function clearTrash() {
    const result = await trashApi.clearTrash()
    await fetchTrash(1)
    return result.removed
  }

  return { query, tasks, total, totalPages, loading, fetchTrash, restore, purge, clearTrash }
})
