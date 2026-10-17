<script setup lang="ts">
/**
 * 图形验证码弹窗（2026-10-17 重做，全站统一）。
 *
 * 文案只说「安全验证」+「为了你的账号安全，请输入图片中的字符」——
 * 不再出现「防刷」这类把用户当假想敌的说法（用户不需要知道防刷是什么）。
 *
 * 交互：打开即聚焦；输满 4 位或按回车自动提交；失败时在输入框下方给红字并自动换一张新图；
 * 底部只留一个「验证」按钮（右上角已有 ×，不再重复一个「取消」）。
 */
import { nextTick, ref, watch } from 'vue'
import CaptchaField from './CaptchaField.vue'

const props = withDefaults(
  defineProps<{
    /** 输满自动提交（默认开） */
    autoSubmit?: boolean
    loading?: boolean
    demo?: boolean
  }>(),
  { autoSubmit: true, loading: false, demo: false },
)

const visible = defineModel<boolean>('visible', { required: true })
const emit = defineEmits<{ confirm: [payload: { captchaId: string; captchaCode: string }] }>()

const fieldRef = ref<InstanceType<typeof CaptchaField>>()
const captchaId = ref('')
const captchaCode = ref('')
const error = ref('')

const ERROR_TEXT = '验证码错误，请重试'

/** 用户一改输入就收掉旧错误，别让他改完还盯着上一句红字 */
watch(captchaCode, () => {
  if (error.value) error.value = ''
})

/** 每次打开清空残留（图形码由字段自己在挂载时拉新） */
watch(visible, (opened) => {
  if (!opened) return
  error.value = ''
  captchaCode.value = ''
  void nextTick(() => fieldRef.value?.focus())
})

function confirm() {
  if (props.loading || !captchaCode.value) return
  emit('confirm', { captchaId: captchaId.value, captchaCode: captchaCode.value })
}

/**
 * 上层请求失败时调用：红字提示 + 换一张新图（字段会清空并重新聚焦）。
 * 顺序很重要：**先换图、等它完成再落红字** —— 换图会把输入清空，而「输入变化即清掉错误」
 * 那条 watch 会把刚写上的红字擦掉（第一版就是这么被自己清掉的）。
 */
function markError(text = ERROR_TEXT) {
  const field = fieldRef.value
  if (!field) {
    error.value = text
    return
  }
  void Promise.resolve(field.refresh()).then(() => {
    error.value = text
  })
}

defineExpose({ markError, refresh: () => fieldRef.value?.refresh() })
</script>

<template>
  <el-dialog
    v-model="visible"
    title="安全验证"
    width="380px"
    append-to-body
    destroy-on-close
    align-center
  >
    <p class="captcha-dialog__lead">为了你的账号安全，请输入图片中的字符。</p>

    <CaptchaField
      ref="fieldRef"
      v-model="captchaCode"
      v-model:captcha-id="captchaId"
      :error="error"
      :demo="demo"
      :auto-submit="autoSubmit"
      @submit="confirm"
      @refreshed="error = ''"
    />

    <template #footer>
      <el-button type="primary" :loading="loading" :disabled="!captchaCode" @click="confirm">
        验证
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.captcha-dialog__lead {
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--color-text-2);
}
</style>
