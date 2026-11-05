<script setup lang="ts">
/**
 * 配图轮播（2026-11-01）：16:9 一屏一张，左右箭头 + 「n / m」计数，**首尾夹住不循环**。
 *
 * 抽成组件是为了「一处样式、两处用」：
 *   · `TaskFormDialog` —— 嵌在「配图」色块里（默认样式，圆角 md、34px 箭头）；
 *   · 主页点缩略图 —— 放进灯箱里放大看（`large`，圆角 lg、44px 箭头）。
 * 两边的观感必须一致，所以样式只写在这里，调用方只决定「放在哪儿、多大」。
 *
 * 只做展示：当前下标由父级 `v-model:index` 持有 —— 弹窗要在删图后把越界的下标收回来，
 * 灯箱要在关闭时把它归零，这些都属于调用方的状态。
 */
import { computed, onUnmounted, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 已经解析好的图片地址（按显示顺序） */
    urls: string[]
    /** 当前第几张（0 起） */
    index: number
    /** 灯箱里的放大版：更大的箭头与计数、更粗的圆角 */
    large?: boolean
    /** 图片的无障碍描述 */
    label?: string
    /** 键盘左右键切换：灯箱里开；弹窗里不开（那边整窗是表单，方向键不该被抢） */
    keyboard?: boolean
  }>(),
  { large: false, label: '任务配图', keyboard: false },
)

const emit = defineEmits<{ 'update:index': [number] }>()

const total = computed(() => props.urls.length)

/**
 * 上一张 / 下一张：**首尾夹住、不循环**。越界直接返回 ——
 * 按钮的 `disabled` 由模板里同一条边界给出，判断只写一处，两边不会走岔。
 */
function step(delta: number) {
  const next = props.index + delta
  if (next < 0 || next >= total.value) return
  emit('update:index', next)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowLeft') step(-1)
  else if (event.key === 'ArrowRight') step(1)
}

/*
 * 键盘监听挂在 window 上：灯箱里焦点可能在关闭按钮上，挂在容器上会漏。
 * 只在 `keyboard` 为真时挂（`immediate` 让首帧打开的情况也覆盖到）。
 */
watch(
  () => props.keyboard,
  (on) => {
    if (on) window.addEventListener('keydown', onKeydown)
    else window.removeEventListener('keydown', onKeydown)
  },
  { immediate: true },
)

onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div
    class="image-slideshow"
    :class="{ 'image-slideshow--large': large }"
    role="group"
    :aria-label="label"
  >
    <!--
      滑动轨道：所有图横排成一条等宽「格」，切图只改 `translateX`，
      由 `--dur-slide` 过渡成滑动 —— 换 `src` 只能瞬切，没有任何中间帧。
      `aria-hidden` 只留给当前这张：轨道上的图不该被读屏连读一遍。
    -->
    <div class="image-slideshow__track" :style="{ transform: `translateX(${-index * 100}%)` }">
      <div
        v-for="(src, i) in urls"
        :key="i"
        class="image-slideshow__slide"
        :aria-hidden="i !== index"
      >
        <img class="image-slideshow__img" :src="src" :alt="label" />
      </div>
    </div>

    <button
      v-if="total > 1"
      class="image-slideshow__nav"
      type="button"
      aria-label="上一张"
      :disabled="index === 0"
      @click.stop="step(-1)"
    >
      ‹
    </button>
    <button
      v-if="total > 1"
      class="image-slideshow__nav image-slideshow__nav--next"
      type="button"
      aria-label="下一张"
      :disabled="index >= total - 1"
      @click.stop="step(1)"
    >
      ›
    </button>
    <span v-if="total > 1" class="image-slideshow__count">{{ index + 1 }} / {{ total }}</span>
  </div>
</template>

<style scoped>
/*
 * 16:9 固定比例，图片用 `object-fit: contain` 完整呈现（不裁切）。
 *
 * **不留白底**（2026-11-01 用户口径）：图片比例不是 16:9 时两侧 / 上下会空出一块 ——
 * 那原本是「屏幕」的白，现在透出所在容器的颜色：弹窗里是「配图」色块的灰，灯箱里是遮罩的暗。
 * 所以容器与 `<img>` 都不铺底色（`<img>` 的 `background-color` 在 contain 时正好就是那块留白，
 * 必须一起清掉，只清外层等于没改）；**也不要边框** —— 留白既然是底色，再套一圈描边
 * 就只是把「一张纸」换成「一个框」。
 * ⚠ 别在这里写死颜色：留白的颜色由调用方的背景决定，深浅主题各走各的。
 */
.image-slideshow {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: var(--radius-md);
  overflow: hidden;
  background-color: transparent;
  /*
   * 2026-11-02 修「切图后左侧残留一条上一张」：
   * 圆角 + `overflow: hidden` 去裁一个正在做 `transform` 的轨道时，Chrome 的裁剪与内容
   * 可能落在不同的合成层里 —— 被裁的那一侧会留下上一帧的像素（表现为左侧一条旧图）。
   * `isolation` + `translateZ(0)` 把容器自己提成一个独立层，让裁剪和内容在同一层内完成。
   * 这两个属性对布局没有任何影响，只在渲染层生效。
   */
  isolation: isolate;
  transform: translateZ(0);
}

/* 灯箱里的放大版：尺寸由调用方给，这里只放大「零件」 */
.image-slideshow--large {
  border-radius: var(--radius-lg);
}

/*
 * 轨道：`flex: 0 0 100%` 让每格正好一屏宽，位移按「格数 × 100%」算。
 * **别给轨道写 `gap`**：每格会多出 gap 宽度，`translateX(-100%)` 就对不齐了。
 */
.image-slideshow__track {
  display: flex;
  height: 100%;
  transition: transform var(--dur-slide) var(--ease);
}

.image-slideshow__slide {
  flex: 0 0 100%;
  height: 100%;
  /* 每格自己再裁一次：即便上层容器的裁剪有偏差，格与格之间也不会互相露出来 */
  overflow: hidden;
}

.image-slideshow__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background-color: transparent;
}

/* 翻页箭头：深底白字浮在照片上，什么都不选中时是半透明黑 */
.image-slideshow__nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: none;
  border-radius: var(--radius-pill);
  background-color: rgba(17, 24, 39, 0.45);
  color: #fff;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  /*
   * 首尾夹住之后，到头的箭头要能看出「按不动」—— 整枚降到 0.38
   * （比 `.task-form__prio:disabled` 的 0.6 更狠：它浮在照片上，太实会像可点的按钮）。
   * 透明度也进过渡，滑到最后一格时是淡下去而不是跳变。
   */
  transition:
    background-color var(--dur-fast) var(--ease),
    opacity var(--dur-fast) var(--ease);
}

.image-slideshow__nav:hover:not(:disabled) {
  background-color: rgba(17, 24, 39, 0.65);
}

.image-slideshow__nav:disabled {
  opacity: 0.38;
  cursor: default;
}

.image-slideshow__nav--next {
  right: 12px;
}

.image-slideshow__nav:not(.image-slideshow__nav--next) {
  left: 12px;
}

/* 计数：右下角的小胶囊，和箭头同一套配色 */
.image-slideshow__count {
  position: absolute;
  right: 10px;
  bottom: 8px;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  background-color: rgba(17, 24, 39, 0.55);
  color: #fff;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

/*
 * 放大版：箭头与计数各长一档，离边也更远一点（画面大了，贴边会显得挤）。
 * 尺寸跟着视口高度走（`clamp(48px, 5vh, 68px)`）：灯箱本身是屏幕的 80%，箭头若钉死 52px，
 * 在 4K 上就成了两个小圆点。
 */
.image-slideshow--large .image-slideshow__nav {
  width: clamp(48px, 5vh, 68px);
  height: clamp(48px, 5vh, 68px);
  font-size: clamp(26px, 3.2vh, 38px);
}

.image-slideshow--large .image-slideshow__nav--next {
  right: 20px;
}

.image-slideshow--large .image-slideshow__nav:not(.image-slideshow__nav--next) {
  left: 20px;
}

.image-slideshow--large .image-slideshow__count {
  right: 20px;
  bottom: 16px;
  padding: 3px 11px;
  font-size: 13px;
}
</style>
