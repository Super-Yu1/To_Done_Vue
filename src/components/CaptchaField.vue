<script setup lang="ts">
/**
 * 图形验证码字段（3.2 / 6.5 ①，交互见 8.8）：4 位字符、有效期 120 秒、一次机会。
 *
 * 2026-10-17 重做（弹窗与内联统一用这一版）：
 * - 文案不再说「图形验证码」——图片就在输入框右边，占位符只说「请输入右侧字符」；
 * - 图片放大到 132×40 并加圆角，右下角常驻一个刷新角标（整块图都可点，悬停变实）；
 * - 输入满 4 位、或按回车就发 submit（`autoSubmit` 打开时）——不用再挪鼠标去点按钮；
 * - 错误提示由上层通过 `error` 传进来，红字显示在输入框下方，输入或换图即清空。
 */
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { InputInstance } from 'element-plus'
import AppIcon from './AppIcon.vue'
import AppTooltip from './AppTooltip.vue'
import { getCaptcha } from '@/api/verify'
import { createDemoCaptcha } from '@/mock/demoCaptcha'

const CAPTCHA_LENGTH = 4

const props = withDefaults(
  defineProps<{
    demo?: boolean
    /** 输满即提交 / 回车即提交（弹窗里用；内联表单里保持关闭，避免误提交外层表单） */
    autoSubmit?: boolean
    /** 上层给的错误文案，红字显示在输入框下方 */
    error?: string
  }>(),
  { demo: false, autoSubmit: false, error: '' },
)

const code = defineModel<string>({ required: true })
const captchaId = defineModel<string>('captchaId', { required: true })

const emit = defineEmits<{
  /** 输满 4 位或按了回车 —— 由上层决定是否直接提交 */
  submit: []
  /** 换了一张新图（上层可借此清掉错误提示） */
  refreshed: []
}>()

const image = ref('')
const loading = ref(false)
const inputRef = ref<InputInstance>()

/** 后端下发 Base64 图；未带 data URI 前缀时补上，避免 img 直接渲染失败 */
const imageSrc = computed(() => {
  if (!image.value) return ''
  return image.value.startsWith('data:') ? image.value : `data:image/png;base64,${image.value}`
})

function focus() {
  inputRef.value?.focus()
}

async function refresh() {
  loading.value = true
  try {
    const result = props.demo ? createDemoCaptcha() : await getCaptcha()
    image.value = result.image
    captchaId.value = result.captchaId
    code.value = ''
    emit('refreshed')
    await nextTick()
    focus()
  } catch {
    // 获取失败已由 http 层提示，保留当前图片，可再点一次
  } finally {
    loading.value = false
  }
}

/** 输入到长度就自动提交；换图 / 提交失败清空后不会重复触发 */
watch(code, (value) => {
  if (props.autoSubmit && value.length >= CAPTCHA_LENGTH) emit('submit')
})

function handleEnter() {
  if (props.autoSubmit) emit('submit')
}

onMounted(() => {
  void refresh()
})

defineExpose({ refresh, focus })
</script>

<template>
  <div class="captcha-field">
    <div class="captcha-field__row">
      <el-input
        ref="inputRef"
        v-model="code"
        class="captcha-field__input"
        placeholder="请输入右侧字符"
        :maxlength="CAPTCHA_LENGTH"
        autocomplete="off"
        @keydown.enter.prevent="handleEnter"
      />

      <AppTooltip content="看不清？点击换一张" placement="top">
        <button
          class="captcha-field__image"
          type="button"
          :disabled="loading"
          @click="refresh"
        >
          <img v-if="imageSrc" :src="imageSrc" alt="图形验证码" />
          <span v-else class="captcha-field__empty">点击获取</span>
          <!-- 常驻刷新角标：不提示的话，用户想不到这张图能点 -->
          <span class="captcha-field__renew" aria-hidden="true">
            <AppIcon name="refresh" :size="12" />
          </span>
        </button>
      </AppTooltip>
    </div>

    <p v-if="error" class="captcha-field__error" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.captcha-field {
  width: 100%;
}

.captcha-field__row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.captcha-field__input {
  flex: 1;
  min-width: 0;
}

.captcha-field__image {
  position: relative;
  flex: none;
  width: 132px;
  height: 40px;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  cursor: pointer;
  transition: border-color var(--dur-fast) var(--ease);
}

.captcha-field__image:hover {
  border-color: var(--color-text-3);
}

.captcha-field__image:disabled {
  cursor: progress;
}

.captcha-field__image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.captcha-field__empty {
  font-size: 12px;
  color: var(--color-text-3);
}

/* 刷新角标：压在图片右下角，平时 0.75 透明，悬停整块图时变实 */
.captcha-field__renew {
  position: absolute;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-top-left-radius: var(--radius-sm);
  background-color: color-mix(in srgb, var(--color-text) 55%, transparent);
  color: var(--color-bg);
  opacity: 0.75;
  transition: opacity var(--dur-fast) var(--ease);
}

.captcha-field__image:hover .captcha-field__renew {
  opacity: 1;
}

.captcha-field__error {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--color-danger);
}
</style>
