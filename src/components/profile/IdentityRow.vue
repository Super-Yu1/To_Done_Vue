<script setup lang="ts">
/**
 * 身份行（个人中心第一行）：头像 + 用户名 + 登录邮箱，右侧是头像动作。
 * 整页只有这一处把「你是谁」放大——它比设置行高，其余行一律安静。
 * 选图在这里做类型与 10MB 拦截（8.8 要求在选择时即拦），1:1 裁剪交给 AvatarCropDialog。
 */
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'

const props = defineProps<{
  name: string
  /** 用户名下面那行事实（调用方决定写什么，如「注册于 2026-08-28」） */
  meta: string
  avatarUrl: string | null
  uploading?: boolean
}>()

const emit = defineEmits<{ pick: [File]; remove: [] }>()

/** 与后端头像校验对齐：≤ 10MB、必须是图片（服务端另做扩展名与文件头魔数校验） */
const MAX_BYTES = 10 * 1024 * 1024

const inputRef = ref<HTMLInputElement | null>(null)
const initial = computed(() => (props.name || '我').slice(0, 1))

function openPicker() {
  if (props.uploading) return
  inputRef.value?.click()
}

function handleChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  // 清空 value：否则连续选同一个文件不会再触发 change
  input.value = ''
  if (!file) return

  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件')
    return
  }
  if (file.size > MAX_BYTES) {
    ElMessage.error('图片超过 10MB，请换一张')
    return
  }
  emit('pick', file)
}
</script>

<template>
  <div class="identity-card">
    <div class="identity">
      <button
        class="identity__avatar"
        type="button"
        :aria-label="avatarUrl ? '更换头像' : '上传头像'"
        @click="openPicker"
      >
        <img v-if="avatarUrl" class="identity__image" :src="avatarUrl" alt="" />
        <span v-else class="identity__initial">{{ initial }}</span>
        <span class="identity__overlay" aria-hidden="true">
          <AppIcon name="camera" :size="18" />
        </span>
      </button>

      <div class="identity__info">
        <p class="identity__name">{{ name }}</p>
        <p class="identity__meta">{{ meta }}</p>
      </div>

      <div class="identity__actions">
        <button
          class="row-action"
          type="button"
          :disabled="uploading"
          @click="openPicker"
        >
          {{ uploading ? '上传中…' : '更换头像' }}
        </button>
        <button
          v-if="avatarUrl"
          class="row-action row-action--danger"
          type="button"
          :disabled="uploading"
          @click="emit('remove')"
        >
          移除头像
        </button>
      </div>
    </div>

    <input ref="inputRef" class="identity__input" type="file" accept="image/*" @change="handleChange" />
  </div>
</template>

<style scoped>
/* 自成容器：下面的窄屏断点按这张卡片的宽度算，而不是按视口 */
.identity-card {
  container-type: inline-size;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
}

.identity {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 20px;
}

.identity__avatar {
  position: relative;
  width: 64px;
  height: 64px;
  padding: 0;
  overflow: hidden;
  border: none;
  border-radius: 50%;
  background-color: var(--color-hover);
  color: var(--color-text-2);
  cursor: pointer;
}

.identity__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.identity__initial {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 22px;
}

/* 悬停/聚焦时才提示「可以换」：平时不打扰，也不给头像加常驻按钮 */
.identity__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-mask);
  color: #fff;
  opacity: 0;
  transition: opacity var(--dur-fast) var(--ease);
}

.identity__avatar:hover .identity__overlay,
.identity__avatar:focus-visible .identity__overlay {
  opacity: 1;
}

.identity__info {
  min-width: 0;
}

.identity__name {
  font-size: 15px;
  font-weight: 500;
  line-height: 1.45;
  word-break: break-word;
}

.identity__meta {
  margin-top: 2px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-text-2);
  word-break: break-word;
}

.identity__actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 原生文件框只用来承接选择，不参与排版 */
.identity__input {
  display: none;
}

/* 窄屏：动作换到第二行、左对齐，头像与文字仍并排 */
@container (max-width: 560px) {
  .identity {
    grid-template-columns: 56px minmax(0, 1fr);
    gap: 12px 14px;
    padding: 16px;
  }

  .identity__avatar {
    width: 56px;
    height: 56px;
  }

  .identity__actions {
    grid-column: 2;
    justify-content: flex-start;
    margin-left: -10px;
  }
}
</style>
