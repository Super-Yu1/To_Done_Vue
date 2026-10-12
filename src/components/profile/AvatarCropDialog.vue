<script setup lang="ts">
/**
 * 头像 1:1 取景框（8.8 / 6.5 ⑨）：选图后弹这里，可拖动、可缩放，确认才上传；取消则原头像不变。
 * 前端裁成 512×512 的 JPEG 再交给调用方上传（服务端不校验比例）。
 *
 * 几何一律用「归一化坐标」（偏移量 = 取景框边长的比例，缩放 = 相对铺满的最小缩放），
 * 这样取景框随窗口变化时不必重算既有状态；到渲染与出图时再乘回像素。
 */
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  visible: boolean
  /** 用户选中的原图；为 null 时不显示内容 */
  file: File | null
}>()

const emit = defineEmits<{ 'update:visible': [boolean]; confirm: [File] }>()

/** 输出边长：与 6.5 ⑨ 一致（512×512），服务端不校验比例 */
const OUTPUT_SIZE = 512
/** 缩放上限：铺满之后再放大 3 倍，够构图了 */
const MAX_ZOOM = 3

const visibleProxy = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
})

const stageRef = ref<HTMLElement | null>(null)
const imageRef = ref<HTMLImageElement | null>(null)
const objectUrl = ref('')
const processing = ref(false)

/** 取景框边长（CSS px）：渲染与出图都以它为准 */
const stageSize = ref(0)
const natural = reactive({ w: 0, h: 0 })
const zoom = ref(1)
/** 归一化偏移：0 表示图片左/上边与取景框左/上边对齐，值必为负或零 */
const offset = reactive({ x: 0, y: 0 })

/** 铺满取景框的最小缩放（长边贴边），单位：CSS px / 图片 px */
const baseScale = computed(() => {
  if (!natural.w || !natural.h || !stageSize.value) return 1
  return Math.max(stageSize.value / natural.w, stageSize.value / natural.h)
})

const totalScale = computed(() => baseScale.value * zoom.value)

const imageStyle = computed(() => ({
  width: `${natural.w}px`,
  height: `${natural.h}px`,
  transform: `translate(${offset.x * stageSize.value}px, ${offset.y * stageSize.value}px) scale(${totalScale.value})`,
  transformOrigin: '0 0',
}))

/** 图片不得露出取景框：偏移量夹在 [取景框-图片, 0] 之间 */
function clampOffset() {
  const size = stageSize.value
  if (!size) return
  const w = natural.w * totalScale.value
  const h = natural.h * totalScale.value
  offset.x = Math.min(0, Math.max((size - w) / size, offset.x))
  offset.y = Math.min(0, Math.max((size - h) / size, offset.y))
}

/** 把取景框居中到图片上（打开时的初始构图） */
function centerImage() {
  const size = stageSize.value
  if (!size) return
  const w = natural.w * totalScale.value
  const h = natural.h * totalScale.value
  offset.x = (size - w) / 2 / size
  offset.y = (size - h) / 2 / size
  clampOffset()
}

/** 缩放：以取景框中心为锚点，避免放大时构图跑偏 */
function setZoom(next: number) {
  const clamped = Math.min(MAX_ZOOM, Math.max(1, next))
  const ratio = clamped / zoom.value
  offset.x = 0.5 - (0.5 - offset.x) * ratio
  offset.y = 0.5 - (0.5 - offset.y) * ratio
  zoom.value = clamped
  clampOffset()
}

function nudge(dx: number, dy: number) {
  const size = stageSize.value
  if (!size) return
  offset.x += dx / size
  offset.y += dy / size
  clampOffset()
}

/* 拖动：pointer 事件 + 捕获，鼠标与触摸同一套 */
const drag = { active: false, pointerId: -1, startX: 0, startY: 0, originX: 0, originY: 0 }

function onPointerDown(event: PointerEvent) {
  if (!natural.w) return
  drag.active = true
  drag.pointerId = event.pointerId
  drag.startX = event.clientX
  drag.startY = event.clientY
  drag.originX = offset.x
  drag.originY = offset.y
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (!drag.active) return
  const size = stageSize.value || 1
  offset.x = drag.originX + (event.clientX - drag.startX) / size
  offset.y = drag.originY + (event.clientY - drag.startY) / size
  clampOffset()
}

function endDrag() {
  drag.active = false
}

/** 键盘也能构图：方向键微调、加减号缩放（可见焦点环由全局 :focus-visible 提供） */
function onKeydown(event: KeyboardEvent) {
  const step = event.shiftKey ? 12 : 4
  switch (event.key) {
    case 'ArrowLeft':
      nudge(-step, 0)
      break
    case 'ArrowRight':
      nudge(step, 0)
      break
    case 'ArrowUp':
      nudge(0, -step)
      break
    case 'ArrowDown':
      nudge(0, step)
      break
    case '+':
    case '=':
      setZoom(zoom.value + 0.1)
      break
    case '-':
    case '_':
      setZoom(zoom.value - 0.1)
      break
    default:
      return
  }
  event.preventDefault()
}

function onWheel(event: WheelEvent) {
  setZoom(zoom.value + (event.deltaY < 0 ? 0.1 : -0.1))
}

function releaseObjectUrl() {
  if (objectUrl.value) {
    URL.revokeObjectURL(objectUrl.value)
    objectUrl.value = ''
  }
}

/** 图片尺寸就绪后：量取景框、复位缩放、居中构图 */
function onImageLoad() {
  const image = imageRef.value
  if (!image) return
  natural.w = image.naturalWidth
  natural.h = image.naturalHeight
  zoom.value = 1
  stageSize.value = stageRef.value?.clientWidth ?? 0
  centerImage()
}

watch(
  () => [props.visible, props.file] as const,
  ([visible, file]) => {
    if (!visible) {
      releaseObjectUrl()
      return
    }
    if (!file) return
    releaseObjectUrl()
    natural.w = 0
    natural.h = 0
    objectUrl.value = URL.createObjectURL(file)
  },
)

/** 出图：把取景框在图片坐标里的那块画到 512×512 画布上 */
async function handleConfirm() {
  const image = imageRef.value
  if (!image || !natural.w) return
  const size = stageSize.value
  const scale = totalScale.value
  const canvas = document.createElement('canvas')
  canvas.width = OUTPUT_SIZE
  canvas.height = OUTPUT_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    ElMessage.error('当前浏览器不支持图片裁剪，请换一个浏览器')
    return
  }
  // JPEG 不带透明通道，先铺白底，避免 PNG 透明区出图发黑
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE)

  processing.value = true
  try {
    const sourceSide = size / scale
    ctx.drawImage(
      image,
      (-offset.x * size) / scale,
      (-offset.y * size) / scale,
      sourceSide,
      sourceSide,
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE,
    )
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.92),
    )
    if (!blob) {
      ElMessage.error('图片处理失败，请换一张')
      return
    }
    emit('confirm', new File([blob], 'avatar.jpg', { type: 'image/jpeg' }))
    visibleProxy.value = false
  } finally {
    processing.value = false
  }
}
</script>

<template>
  <el-dialog
    v-model="visibleProxy"
    title="调整头像"
    width="380px"
    :close-on-click-modal="false"
    @closed="releaseObjectUrl"
  >
    <div class="crop">
      <div
        ref="stageRef"
        class="crop__stage"
        tabindex="0"
        role="group"
        aria-label="头像取景框：拖动或方向键移动图片，滚轮、滑块或加减号缩放"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="endDrag"
        @pointercancel="endDrag"
        @wheel.prevent="onWheel"
        @keydown="onKeydown"
      >
        <img
          v-if="objectUrl"
          ref="imageRef"
          class="crop__image"
          :src="objectUrl"
          :style="imageStyle"
          alt=""
          draggable="false"
          @load="onImageLoad"
        />
      </div>

      <el-slider
        class="crop__zoom"
        :model-value="zoom"
        :min="1"
        :max="MAX_ZOOM"
        :step="0.05"
        :show-tooltip="false"
        aria-label="缩放"
        @input="setZoom"
      />
      <p class="crop__hint">拖动调整位置，滚轮或滑块缩放；确认后按 512×512 上传。</p>
    </div>

    <template #footer>
      <el-button @click="visibleProxy = false">取消</el-button>
      <el-button type="primary" :loading="processing" @click="handleConfirm">确认并上传</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.crop {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.crop__stage {
  position: relative;
  width: 100%;
  max-width: 300px;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border-radius: var(--radius-md);
  background-color: var(--color-hover);
  cursor: grab;
  touch-action: none; /* 拖动由 pointer 事件接管，别让页面跟着滚 */
}

.crop__stage:active {
  cursor: grabbing;
}

.crop__image {
  position: absolute;
  top: 0;
  left: 0;
  max-width: none; /* 覆盖全局 img{max-width:100%}，否则缩放会被反向压住 */
  user-select: none;
  pointer-events: none; /* 拖动由取景框处理 */
}

.crop__zoom {
  width: 100%;
  max-width: 300px;
}

.crop__hint {
  font-size: 12px;
  line-height: 1.6;
  color: var(--color-text-2);
  text-align: center;
}
</style>
