<script setup lang="ts">
/**
 * 任务配图字段（6.5 ⑦ / 8.8）：选图 → 本地压缩 → 预览 → 拖动排序 → 删图。
 * 保存时才随任务一起上传，所以这里只收集，不发请求。
 *
 * 对外用一个对象交代清楚两件事（对应接口契约）：
 *   - order：有序数组，已有图填它的 id，新选的图填占位符 'NEW'（按出现次序对应 images 段）；
 *   - files：新选的图（每个 'NEW' 一个），顺序与 order 里 'NEW' 的出现次序一致。
 */
import { computed, onUnmounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import AppIcon from './AppIcon.vue'
import { TASK_MAX_IMAGES, UPLOAD_MAX_BYTES } from '@/constants'
import { ImageTooLargeError, assertUploadable, compressImage } from '@/utils/image'
import type { TaskImage } from '@/types'

interface Slot {
  key: string
  /** 已有图：其 id；新图：'NEW' */
  ref: string
  preview: string
  /** 新图才有（已压缩） */
  file?: File
  /** 本地预览用的 objectURL，需要在移除/卸载时回收 */
  objectUrl?: string
}

const props = defineProps<{ images?: TaskImage[]; submitting?: boolean }>()
const model = defineModel<{ order: string[]; files: File[] }>({ required: true })

const slots = ref<Slot[]>([])
const inputRef = ref<HTMLInputElement | null>(null)
const dragKey = ref('')

const hint = computed(
  () => `最多 ${TASK_MAX_IMAGES} 张，单张不超过 ${UPLOAD_MAX_BYTES / 1024 / 1024}MB；` +
    '超过 1920px 或 1MB 的图会在本地压一次（GIF 不压）',
)

/** 已有图（编辑时）同步成槽位；新选的图不动 */
watch(
  () => props.images,
  (images) => {
    const existings: Slot[] = (images ?? []).map((image) => ({
      key: `id-${image.id}`,
      ref: image.id,
      preview: image.url,
    }))
    // 只用 props 重建，不保留此前新选的图：新选的图属于「这一次打开」，
    // 调用方重置 images 时就该丢弃——否则上一次选过的文件会残留在下一次编辑里（已踩过）
    slots.value = existings
    sync()
  },
  { immediate: true },
)

function releaseSlot(slot: Slot) {
  if (slot.objectUrl) URL.revokeObjectURL(slot.objectUrl)
}

function sync() {
  model.value = {
    order: slots.value.map((slot) => slot.ref),
    files: slots.value.filter((slot) => slot.file).map((slot) => slot.file as File),
  }
}

function removeSlot(slot: Slot) {
  releaseSlot(slot)
  slots.value = slots.value.filter((item) => item.key !== slot.key)
  sync()
}

async function handleChange(event: Event) {
  const input = event.target as HTMLInputElement
  const picked = Array.from(input.files ?? [])
  input.value = ''
  if (!picked.length) return

  const room = TASK_MAX_IMAGES - slots.value.length
  if (room <= 0) {
    ElMessage.warning(`最多 ${TASK_MAX_IMAGES} 张配图`)
    return
  }
  const accepted = picked.slice(0, room)
  if (picked.length > room) ElMessage.warning(`最多 ${TASK_MAX_IMAGES} 张，多出的已忽略`)

  for (const file of accepted) {
    try {
      assertUploadable(file)
    } catch (error) {
      ElMessage.error(error instanceof ImageTooLargeError ? error.message : '图片无法上传')
      continue
    }
    try {
      const compressed = await compressImage(file)
      const objectUrl = URL.createObjectURL(compressed)
      slots.value = [
        ...slots.value,
        { key: `new-${Date.now()}-${slots.value.length}`, ref: 'NEW', preview: objectUrl, file: compressed, objectUrl },
      ]
    } catch {
      ElMessage.error(`「${file.name}」处理失败，请换一张`)
    }
  }
  sync()
}

/* 拖动排序：HTML5 draggable，够用且不需要额外库 */
function onDragStart(slot: Slot) {
  dragKey.value = slot.key
}

function onDrop(target: Slot) {
  const from = slots.value.findIndex((slot) => slot.key === dragKey.value)
  const to = slots.value.findIndex((slot) => slot.key === target.key)
  dragKey.value = ''
  if (from < 0 || to < 0 || from === to) return
  const next = [...slots.value]
  const moved = next.splice(from, 1)[0]
  if (!moved) return
  next.splice(to, 0, moved)
  slots.value = next
  sync()
}

onUnmounted(() => slots.value.forEach(releaseSlot))
</script>

<template>
  <div class="images">
    <ul v-if="slots.length" class="images__list">
      <li
        v-for="slot in slots"
        :key="slot.key"
        class="images__item"
        :draggable="!submitting"
        :title="slot.ref === 'NEW' ? '新选择的图片（保存时上传）' : '已有图片'"
        @dragstart="onDragStart(slot)"
        @dragover.prevent
        @drop.prevent="onDrop(slot)"
      >
        <img class="images__thumb" :src="slot.preview" alt="" draggable="false" />
        <span v-if="slot.ref === 'NEW'" class="images__badge">新</span>
        <button
          class="images__remove"
          type="button"
          :aria-label="'移除这张配图'"
          :disabled="submitting"
          @click="removeSlot(slot)"
        >
          <AppIcon name="trash" :size="14" />
        </button>
      </li>
    </ul>

    <div class="images__footer">
      <button
        class="row-action"
        type="button"
        :disabled="submitting || slots.length >= TASK_MAX_IMAGES"
        @click="inputRef?.click()"
      >
        {{ slots.length ? '继续添加' : '选择图片' }}
      </button>
      <span class="images__hint">{{ hint }}</span>
    </div>

    <input
      ref="inputRef"
      class="images__input"
      type="file"
      accept="image/*"
      multiple
      @change="handleChange"
    />
  </div>
</template>

<style scoped>
.images {
  width: 100%;
}

.images__list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 8px;
  padding: 0;
  list-style: none;
}

.images__item {
  position: relative;
  width: 84px;
  height: 84px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: grab;
}

.images__thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.images__badge {
  position: absolute;
  top: 4px;
  left: 4px;
  padding: 1px 6px;
  border-radius: var(--radius-pill);
  background-color: var(--color-mask);
  color: #fff;
  font-size: 11px;
}

.images__remove {
  position: absolute;
  right: 2px;
  bottom: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: var(--radius-sm);
  background-color: var(--color-mask);
  color: #fff;
  cursor: pointer;
  opacity: 0;
  transition: opacity var(--dur-fast) var(--ease);
}

.images__item:hover .images__remove,
.images__item:focus-within .images__remove {
  opacity: 1;
}

.images__footer {
  display: flex;
  align-items: center;
  gap: 10px;
}

.images__hint {
  font-size: 12px;
  line-height: 1.6;
  color: var(--color-text-3);
}

.images__input {
  display: none;
}
</style>
