<script setup lang="ts">
/**
 * 注册（UC-01 / 6.5 ③）：邮箱 + 邮箱验证码 + 密码 + 名字；name 不查重。
 *
 * 2026-10-14 排版重做：改成左右分栏 —— 左边直接摆「产品本体」（三条真实任务行，其中一条在页面
 * 打开时被划掉），右边才是表单。理由是注册页的第一眼应该回答「这是个什么东西」，而不是先给一张
 * 孤立的白表；示例行完全复用列表的视觉语言（26px 勾选圈、20px 圆角、发丝线、优先级色），
 * 动效也只留「划掉」这一处，与列表里勾选完成的节奏同源（--dur-strike，减少动效时自动归零）。
 *
 * 字段顺序按「邮箱 → 它的验证码 → 密码 → 名字」排：邮箱与验证码是一件事的两半，挨着更顺。
 * 图形码不在这一页，只在点「获取验证码」时由 EmailCodeField 弹窗索取。
 */
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import AuthShell from '@/components/AuthShell.vue'
import EmailCodeField from '@/components/EmailCodeField.vue'
import {
  PASSWORD_HINT,
  PASSWORD_PATTERN,
  TASK_PRIORITY_COLOR,
  TASK_PRIORITY_LABEL,
} from '@/constants'
import { useAuthStore } from '@/stores/auth'
import type { TaskPriority } from '@/types'

const auth = useAuthStore()
const router = useRouter()

const formRef = ref<FormInstance>()

const form = reactive({
  email: '',
  password: '',
  name: '',
  emailCode: '',
})

const rules: FormRules = {
  email: [
    { required: true, message: '请填写邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  emailCode: [{ required: true, message: '请填写邮箱验证码', trigger: 'blur' }],
  password: [
    { required: true, message: '请填写密码', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback) =>
        PASSWORD_PATTERN.test(value) ? callback() : callback(new Error(PASSWORD_HINT)),
      trigger: 'blur',
    },
  ],
  name: [{ required: true, message: '请填写名字', trigger: 'blur' }],
}

/** 左侧示例：写真实内容，不用占位词；顺序与列表一致——未完成在前，已完成的收尾 */
const samples: { title: string; priority: TaskPriority; done?: boolean }[] = [
  { title: '把设计评审的意见回写进文档', priority: 'MEDIUM' },
  { title: '周五前定下配图的顺序', priority: 'HIGH' },
  { title: '整理这周的会议记录', priority: 'LOW', done: true },
]

/**
 * 校验通过直接注册（2026-10-14 定稿）：图形码只在「获取验证码」时用一次，
 * 提交不再弹第二次，请求里也就不带 captchaId / captchaCode。
 * 后端 `POST /api/auth/register` 目前仍把这两个字段列为必填（会返回 400 请求参数不合法），
 * 已记在 `docs/后端修改说明.md`，等它改成可选后此处无需再动。
 */
async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  try {
    await auth.register({ ...form })
    ElMessage.success('注册成功')
    await router.push('/tasks')
  } catch {
    // 1002 邮箱已被注册等提示由 http 层给出
  }
}
</script>

<template>
  <AuthShell title="注册">
    <template #aside>
      <div class="aside">
        <p class="aside__lead">把要做的事，一件件划掉。</p>

        <!-- 装饰性的产品示例，对读屏隐藏；真实内容由右侧表单产生 -->
        <ul class="aside__list" aria-hidden="true">
          <li
            v-for="item in samples"
            :key="item.title"
            class="sample-row"
            :class="{ 'sample-row--done': item.done }"
          >
            <span class="sample-row__check">
              <svg
                v-if="item.done"
                viewBox="0 0 16 16"
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M3 8.4l3.3 3.3L13 5" />
              </svg>
            </span>
            <span class="sample-row__title">{{ item.title }}</span>
            <span class="sample-row__pill" :style="{ color: TASK_PRIORITY_COLOR[item.priority] }">
              {{ TASK_PRIORITY_LABEL[item.priority] }}
            </span>
          </li>
        </ul>

        <p class="aside__foot">注册后，这些会存进你自己的清单。</p>
      </div>
    </template>

    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
      <el-form-item label="邮箱" prop="email">
        <el-input v-model="form.email" type="email" autocomplete="username" placeholder="you@example.com" />
      </el-form-item>

      <el-form-item label="邮箱验证码" prop="emailCode">
        <EmailCodeField v-model="form.emailCode" :email="form.email" scene="REGISTER" />
      </el-form-item>

      <el-form-item label="密码" prop="password">
        <el-input v-model="form.password" type="password" autocomplete="new-password" show-password />
        <p class="field-hint">{{ PASSWORD_HINT }}</p>
      </el-form-item>

      <el-form-item label="名字" prop="name">
        <el-input v-model="form.name" placeholder="显示名，可重复" maxlength="32" />
      </el-form-item>

      <el-button class="submit" type="primary" :loading="auth.loading" @click="handleSubmit">
        注册
      </el-button>
    </el-form>

    <div class="links">
      <RouterLink class="links__item" to="/login">已有账号，去登录</RouterLink>
      <RouterLink class="links__item" to="/demo">先逛逛演示</RouterLink>
    </div>
  </AuthShell>
</template>

<style scoped>
/* 左侧：产品的样子。宽度收在 420px 以内，避免标题行被拉得过长 */
.aside {
  max-width: 420px;
}

.aside__lead {
  font-size: 26px;
  line-height: 1.5;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.aside__list {
  display: grid;
  gap: 10px;
  margin: 28px 0 0;
  padding: 0;
  list-style: none;
}

/* 与列表里的任务行同源：26px 勾选圈 + 1fr 标题 + 右侧优先级，20px 圆角、1px 发丝线 */
.sample-row {
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
}

.sample-row__check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-pill);
  color: var(--color-surface);
}

.sample-row__title {
  min-width: 0;
  overflow: hidden;
  font-size: 14px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.sample-row__pill {
  font-size: 12px;
}

/* 已完成那条：勾选圈填状态色，标题被划掉 */
.sample-row--done .sample-row__check {
  border-color: var(--color-status-done);
  background-color: var(--color-status-done);
  color: var(--color-surface);
}

.sample-row--done .sample-row__title {
  color: var(--color-text-2);
  background-image: linear-gradient(currentColor, currentColor);
  background-repeat: no-repeat;
  background-position: 0 58%;
  background-size: 100% 1px;
  /* 页面打开后划一次，全页只此一处动效；时长取 --dur-strike，「减少动效」下自动归零 */
  animation: strike-in var(--dur-strike) var(--ease) 320ms backwards;
}

@keyframes strike-in {
  from {
    background-size: 0 1px;
  }
  to {
    background-size: 100% 1px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sample-row--done .sample-row__title {
    animation: none;
  }
}

.aside__foot {
  margin-top: 20px;
  font-size: 12px;
  color: var(--color-text-2);
}

/* 右侧表单 */
.submit {
  width: 100%;
}

.field-hint {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--color-text-3);
}

.links {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  font-size: 12px;
}

.links__item {
  color: var(--color-text-2);
}

.links__item:hover {
  color: var(--color-text);
}

/* 窄屏：示例行只留勾选圈 + 标题，优先级让位给信息密度 */
@media (max-width: 880px) {
  .aside__lead {
    font-size: 22px;
  }

  .aside__list {
    margin-top: 20px;
  }

  .sample-row__pill {
    display: none;
  }
}
</style>
