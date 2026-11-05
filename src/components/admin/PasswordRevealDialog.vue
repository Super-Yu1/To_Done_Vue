<script setup lang="ts">
/**
 * 密码回显弹窗（2026-11-03，由 `InitialPasswordDialog` 泛化）：
 * 「创建用户」的初始密码与「重置用户密码」生成的新密码共用 —— 两处都只有这一次机会看到明文。
 *
 * 因此刻意收紧关闭路径：点遮罩 / 按 Esc 都不关，只能点「我已复制，关闭」或右上角 X；
 * 关闭（动画结束）后才通知外层：清掉手里的密码，建号时还要刷新列表。
 */
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import { copyText } from '@/utils/clipboard'
import type { AdminUser } from '@/types'

const props = withDefaults(
  defineProps<{
    /** 目标用户（只用于文案）；没传就退化成邮箱兜底 */
    user: AdminUser | null
    /** 只展示一次的明文密码 */
    password: string
    /** create = 刚建号（初始密码）；reset = 管理员重置（新密码）。只改文案，流程一致 */
    mode?: 'create' | 'reset'
  }>(),
  { mode: 'create' },
)

const visible = defineModel<boolean>('visible', { required: true })
const emit = defineEmits<{ closed: [] }>()

const copied = ref(false)

const displayName = computed(() => props.user?.name || props.user?.email || '')
const isReset = computed(() => props.mode === 'reset')

const title = computed(() => (isReset.value ? '新密码（只显示这一次）' : '初始密码（只显示这一次）'))
const lead = computed(() =>
  isReset.value
    ? `「${displayName.value}」的密码已重置，请把这串密码转告本人，用邮箱 + 下面这串密码登录：`
    : `已创建用户「${displayName.value}」，它现在就能用邮箱 + 下面这串密码登录：`,
)
const note = computed(() =>
  isReset.value
    ? '对方登录后可到「个人中心 → 密码」自行修改。'
    : '对方忘记密码时，只能在用户管理里「重置用户密码」。',
)

watch(visible, (opened) => {
  if (opened) copied.value = false
})

async function handleCopy() {
  const ok = await copyText(props.password)
  if (!ok) {
    ElMessage.error('复制失败，请手动选中密码复制')
    return
  }
  copied.value = true
  ElMessage.success('密码已复制')
}
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="title"
    width="480px"
    append-to-body
    align-center
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    @closed="emit('closed')"
  >
    <p class="dialog-hint">{{ lead }}</p>

    <div class="password">
      <code class="password__value">{{ password }}</code>
      <el-button class="password__copy" @click="handleCopy">
        <AppIcon name="copy" />
        <span class="password__copy-text">{{ copied ? '已复制' : '复制密码' }}</span>
      </el-button>
    </div>

    <p class="dialog-warn">此密码只展示这一次，关闭后无法再查看，请复制并转告用户。</p>
    <p class="dialog-hint">{{ note }}</p>

    <template #footer>
      <el-button type="primary" @click="visible = false">我已复制，关闭</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.dialog-hint {
  font-size: 12px;
  line-height: 1.8;
  color: var(--color-text-2);
}

.dialog-warn {
  margin-top: 12px;
  font-size: 12px;
  line-height: 1.8;
  color: var(--color-danger);
}

/* 密码用等宽字体 + 字号放大：便于逐字符核对与手动抄写，点一下即整串选中 */
.password {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 4px 0;
  padding: 10px 12px 10px 16px;
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-md);
  background-color: var(--color-hover);
}

.password__value {
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-size: 18px;
  letter-spacing: 0.12em;
  color: var(--color-text);
  user-select: all;
}

.password__copy-text {
  margin-left: 6px;
}
</style>
