<script setup lang="ts">
/**
 * 任务配图字段（6.5 ⑦ / 8.8）：选图 → 本地压缩 → 预览 → 拖动排序 → 删图。
 * 保存时才随任务一起上传，所以这里只收集，不发请求。
 *
 * 对外用一个对象交代清楚两件事（对应接口契约）：
 *   - order：有序数组，已有图填它的 id，新选的图填占位符 'NEW'（按出现次序对应 images 段）；
 *   - files：新选的图（每个 'NEW' 一个），顺序与 order 里 'NEW' 的出现次序一致。
 *
 * 点缩略图（2026-10-31 改为「窗口内查看器」）：缩略图同时是**拖动排序的抓取区**，两者靠位移阈值区分 ——
 * `mousedown` 记坐标，`click` 时位移 > 4px 就当「这是一次拖动」不切换（原生拖拽成功后浏览器本来就
 * 不派 click，这条只挡「几乎没动就松手」那种误触）。三处配套细节：
 *   ① 内层 `<img>` 必须 `draggable="false"` —— 否则浏览器会拖那张图、抢走外层 `<li>` 的 dragstart，
 *      排序会静默失效（这就是不用 `el-image` 做缩略图的原因）；
 *   ② 删除按钮的 click 要 `.stop`，否则点删除会顺带切一次图；
 *   ③ 点缩略图不再弹 `ElImageViewer`，改为向父级抛 `select`（下标）—— 大图直接显示在弹窗内部的
 *      16:9 查看器里，不再另开一层。槽位列表（各图的预览地址）通过 `previews` 抛给父级，供查看器用。
 */
import { computed, onUnmounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import AppIcon from './AppIcon.vue'
import AppTooltip from './AppTooltip.vue'
import { TASK_MAX_IMAGES, UPLOAD_MAX_BYTES } from '@/constants'
import { ImageRejectedError, assertUploadable, compressImage } from '@/utils/image'
import { resolveImageUrl } from '@/utils/imageUrl'
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

const props = defineProps<{
  images?: TaskImage[]
  submitting?: boolean
}>()
const model = defineModel<{ order: string[]; files: File[] }>({ required: true })

/**
 * `select`：点了第几张（父级把它显示在弹窗内的查看器里）；
 * `previews`：全部槽位的预览地址（新增 / 删除 / 排序后都会重新抛一次）。
 */
const emit = defineEmits<{
  select: [index: number]
  previews: [list: string[]]
}>()

const slots = ref<Slot[]>([])
const inputRef = ref<HTMLInputElement | null>(null)
const dragKey = ref('')

/** 判定「点击」的位移阈值：超过它就算拖动意图，不弹预览 */
const CLICK_MOVE_TOLERANCE = 4

/* ---------- 选中（窗口内查看器用） ---------- */

/** 按下时的坐标：用来区分「点击」与「拖动」 */
let pressPoint: { x: number; y: number } | null = null

function onPress(event: MouseEvent) {
  pressPoint = { x: event.clientX, y: event.clientY }
}

function selectSlot(slot: Slot, event?: MouseEvent) {
  if (event && pressPoint) {
    const moved = Math.hypot(event.clientX - pressPoint.x, event.clientY - pressPoint.y)
    if (moved > CLICK_MOVE_TOLERANCE) return
  }
  pressPoint = null
  const index = slots.value.findIndex((item) => item.key === slot.key)
  if (index < 0) return
  emit('select', index)
}

/** 键盘选中：只有焦点在缩略图本身时才响应（焦点在删除按钮上时交给那个按钮） */
function onKeySelect(slot: Slot, event: KeyboardEvent) {
  if (event.target !== event.currentTarget) return
  selectSlot(slot)
}

/**
 * 槽位一变（增 / 删 / 排序 / 重置）就把预览地址表抛给父级，弹窗里的查看器靠它取图。
 *
 * ⚠ 必须放在「images → slots」那个 watch **之前**，且带 `immediate` ——
 * 那个 watch 是 `immediate: true`，会在 setup 阶段就给 `slots` 赋值；如果这个 watch 注册得比赋值晚，
 * 它拿到的「初始值」就已经是赋值后的数组，从此再也不触发，`previews` 一次都发不出去（已踩）。
 */
watch(
  slots,
  (list) => emit('previews', list.map((slot) => slot.preview)),
  { immediate: true },
)

/** 已有图（编辑时）同步成槽位；新选的图不动 */
watch(
  () => props.images,
  (images) => {
    const existings: Slot[] = (images ?? []).map((image) => ({
      key: `id-${image.id}`,
      ref: image.id,
      // 与列表封面共用同一份 URL 缓存：弹窗里这几张刚在列表上加载过，不该再下一遍
      preview: resolveImageUrl(image),
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
  await addFiles(picked)
}

/** 拖拽上传（2026-10-21）：虚线区可直接把图片拖进来，与选择文件走同一套校验 */
function handleDrop(event: DragEvent) {
  const dropped = Array.from(event.dataTransfer?.files ?? [])
  if (!dropped.length) return
  void addFiles(dropped)
}

/** 文件入口：限张数、校验体积、压缩、生成预览（选择与拖拽共用） */
async function addFiles(picked: File[]) {
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
      ElMessage.error(error instanceof ImageRejectedError ? error.message : '图片无法上传')
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
        role="button"
        tabindex="0"
        aria-label="查看大图（拖动可调整顺序）"
        @mousedown="onPress"
        @click="selectSlot(slot, $event)"
        @keydown.enter.prevent="onKeySelect(slot, $event)"
        @keydown.space.prevent="onKeySelect(slot, $event)"
        @dragstart="onDragStart(slot)"
        @dragend="dragKey = ''"
        @dragover.prevent
        @drop.prevent="onDrop(slot)"
      >
        <!-- 缩略图：`draggable=false` 是硬要求 —— 否则浏览器会拖这张图、抢走外层 li 的 dragstart -->
        <img class="images__thumb" :src="slot.preview" alt="" draggable="false" />
        <span v-if="slot.ref === 'NEW'" class="images__badge">新</span>

        <!--
          提示用 Element Plus 的气泡，不用原生 `title` —— 后者是系统画的长方形，
          跟全站的圆角气泡完全不搭（2026-10-27 按反馈改）；`teleported` 默认开，
          所以在弹窗里也不会被裁掉。
        -->
        <AppTooltip content="移除" placement="top" :hide-after="0">
          <button
            class="images__remove"
            type="button"
            aria-label="移除这张配图"
            :disabled="submitting"
            @click.stop="removeSlot(slot)"
          >
            <AppIcon name="close" :size="12" />
          </button>
        </AppTooltip>
      </li>
    </ul>

    <!--
      2026-10-21：上传入口是虚线框 + 大号「＋」。
      2026-10-30：原来旁边那行「点击看大图 · 拖动调整顺序 · 支持…」已收进「配图」标签旁的 i 图标，
      这里只留入口本身。
    -->
    <button
      class="images__add"
      type="button"
      :disabled="submitting || slots.length >= TASK_MAX_IMAGES"
      :aria-label="slots.length ? '继续添加配图' : '添加配图'"
      @click="inputRef?.click()"
      @dragover.prevent
      @drop.prevent="handleDrop"
    >
      <span class="images__add-plus" aria-hidden="true">＋</span>
    </button>

    <input
      ref="inputRef"
      class="images__input"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      multiple
      @change="handleChange"
    />
  </div>
</template>

<style scoped>
/*
 * 2026-10-30：说明文字收走之后，缩略图下面那行「＋」空出了半行 —— 改成同一个 flex 流：
 * `ul` 用 `display: contents` 把 li 交给外层，缩略图与「＋」自然排成一行、一起折行。
 * 只有 1 张图时高度从 84+84+8 收到 84，配图区不再撑高弹窗。
 */
.images {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
}

.images__list {
  display: contents;
  /* display: contents 会吃掉 margin / padding，list-style 是继承属性，仍能传到 li */
  list-style: none;
}

/* 虚线添加区（2026-10-21）：84×84 与缩略图同尺寸，虚线 + 居中大号加号 */
.images__add {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 84px;
  height: 84px;
  padding: 0;
  border: 1.5px dashed var(--color-border-strong);
  border-radius: var(--radius-md);
  background-color: transparent;
  color: var(--color-text-3);
  cursor: pointer;
  transition: border-color var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease),
    background-color var(--dur-fast) var(--ease);
}

.images__add:hover:not(:disabled) {
  border-color: var(--color-text-3);
  background-color: var(--color-surface);
  color: var(--color-text-2);
}

.images__add:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.images__add-plus {
  font-size: 26px;
  line-height: 1;
}

/* 缩略图块：拖动抓取区 + 点击看大图，两个语义靠光标与悬停角标提示 */
.images__item {
  position: relative;
  width: 84px;
  height: 84px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: grab;
}

.images__item:focus-visible {
  outline: 2px solid var(--color-text);
  outline-offset: 2px;
}

.images__thumb {
  display: block;
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

/*
 * 删除：**右上角的红色 ×**（2026-10-27 按反馈，原来的垃圾桶在下、放大镜在上）。
 * 底下垫一片近白的小圆片：照片底色千差万别，红叉直接压上去会遇到红墙、暗夜看不见；
 * 悬停反色成「红底白叉」，点按意图更明确。
 * 只在真有 hover 的设备上收起 —— 平板是触屏，收起来等于点不到。
 */
.images__remove {
  position: absolute;
  top: 3px;
  right: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  /* 不投影（C 方案）：白片 + 一圈发丝墨边，压在照片上也能读出来 */
  border: 1px solid rgba(17, 24, 39, 0.12);
  border-radius: var(--radius-pill);
  background-color: rgba(255, 255, 255, 0.94);
  color: var(--color-danger);
  cursor: pointer;
  transition: opacity var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease),
    background-color var(--dur-fast) var(--ease);
}

.images__remove:hover:not(:disabled) {
  border-color: transparent;
  background-color: var(--color-danger);
  color: #fff;
}

.images__remove:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

@media (hover: hover) {
  .images__remove {
    opacity: 0;
  }

  .images__item:hover .images__remove,
  .images__item:focus-within .images__remove {
    opacity: 1;
  }
}

.images__footer {
  display: flex;
  align-items: center;
  gap: 10px;
}

.images__input {
  display: none;
}
</style>
