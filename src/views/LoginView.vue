<script setup lang="ts">
/**
 * 登录（UC-02 / 6.5 ④）：邮箱 + 密码；图形码在点「登录」时弹窗输入（2026-10-15，原先常驻表单）。
 * 登录接口要 captchaId + captchaCode（Swagger 必填），所以弹窗确认后才带着它提交。
 *
 * 排版（2026-10-16）与注册页**共用同一套**：左栏 `AuthAside`（同一份产品预览、同样可点）、
 * 右侧表单卡片（外壳的分栏分支给的），差别只有主张文案与场景标签那一行 ——
 * 两页放一起看应该像同一套东西，而不是"注册页好看、登录页是另一张白表"。
 */
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import AuthAside from '@/components/AuthAside.vue'
import AuthShell from '@/components/AuthShell.vue'
import CaptchaDialog from '@/components/CaptchaDialog.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

/**
 * token 失效被踢回来时，http 层在地址栏留了 expired=1（那边不弹 toast 的原因见 http.ts）。
 * 这里做成**页面内的常驻提示**而不是 toast：整页跳转刚结束时弹提示容易与加载抢时序，
 * 常驻一行反而看得清，提交一次后自然消失。
 */
const expiredNotice = ref(false)

onMounted(() => {
  if (!route.query.expired) return
  expiredNotice.value = true
  const rest = { ...route.query }
  delete rest.expired
  void router.replace({ path: route.path, query: rest })
})

const formRef = ref<FormInstance>()
const captchaVisible = ref(false)

const form = reactive({
  email: '',
  password: '',
})

const rules: FormRules = {
  email: [
    { required: true, message: '请填写邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  password: [{ required: true, message: '请填写密码', trigger: 'blur' }],
}

/** 校验通过先弹图形码，不在这里发请求 */
async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  captchaVisible.value = true
}

async function handleCaptchaConfirm(payload: { captchaId: string; captchaCode: string }) {
  try {
    await auth.login({ ...form, ...payload })
    captchaVisible.value = false
    ElMessage.success('登录成功')
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/tasks'
    await router.push(redirect)
  } catch {
    // 失败原因由 http 层提示（4001 图形码错 / 1003 邮箱或密码错 / 1006 冻结 / 1007 注销）。
    // 一律关掉弹窗：密码也可能填错，留住弹窗会逼用户为一次输错连填两次图形码；
    // 弹窗是 destroy-on-close 的，下次点「登录」自然是一张新图。
    captchaVisible.value = false
  }
}
</script>

<template>
  <AuthShell title="登录" subtitle="用邮箱登录">
    <!--
      标题右侧的次要入口：与注册页同一个位置、同一个文案（「先逛逛演示」）。
      管理员入口这里**不留任何入口** —— 后台只能靠直接访问 `/admin/login` 进（路由仍在，
      只是不在用户界面暴露）。原先那句「管理员请走后台入口」的副标题也一并去掉了。
    -->
    <template #header-extra>
      <RouterLink to="/demo">先逛逛演示</RouterLink>
    </template>

    <template #aside>
      <!-- 价值词 / 互动引导 / 庆祝语都用组件里的默认值，这里只给主张 -->
      <AuthAside lead="回到你的清单，保持专注。" />
    </template>

    <p v-if="expiredNotice" class="expired-notice">登录状态已失效，请重新登录</p>

    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
      <el-form-item label="邮箱" prop="email">
        <el-input v-model="form.email" type="email" autocomplete="username" placeholder="todone@example.com" />
      </el-form-item>

      <el-form-item label="密码" prop="password">
        <!-- 眼睛图标由 show-password 提供：输入值后出现，点一下切明文 -->
        <el-input v-model="form.password" type="password" autocomplete="current-password" show-password />
        <!-- 忘记密码贴在密码框正下方靠右，小一档；不再和「注册新账号」一左一右分散 -->
        <div class="field-aside">
          <RouterLink class="field-aside__link" to="/forgot-password">忘记密码？</RouterLink>
        </div>
      </el-form-item>

      <el-button class="submit" type="primary" :loading="auth.loading" @click="handleSubmit">
        登录
      </el-button>
    </el-form>

    <div class="links">
      <RouterLink class="links__item" to="/register">还没有账号？注册新账号</RouterLink>
    </div>

    <CaptchaDialog
      v-model:visible="captchaVisible"
      tip="登录前过一次图形码（防刷），输入后即可登录。"
      :loading="auth.loading"
      @confirm="handleCaptchaConfirm"
    />

    <template #footer>
      <span>© 2026 To_Done</span>
      <span aria-hidden="true">·</span>
      <span>登录，数据只属于你</span>
    </template>
  </AuthShell>
</template>

<style scoped>
/* 失效提示与表单同宽，用次要底色区分于校验错误（那是红字，这是状态说明） */
.expired-notice {
  margin-bottom: 16px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-hover);
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-2);
}

/* 与注册页同一套尺度：主按钮 44px、15px 字 */
.submit {
  width: 100%;
  height: 44px;
  font-size: 15px;
}

/* 忘记密码：密码框正下方靠右，比正文小一档 */
.field-aside {
  width: 100%;
  margin-top: 6px;
  text-align: right;
}

.field-aside__link {
  font-size: 13px;
  color: var(--color-text-2);
}

.field-aside__link:hover {
  color: var(--color-text);
}

.links {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 14px;
  font-size: 14px;
}

.links__item {
  color: var(--color-text-2);
}

.links__item:hover {
  color: var(--color-text);
}
</style>
