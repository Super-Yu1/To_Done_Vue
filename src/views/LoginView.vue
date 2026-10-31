<script setup lang="ts">
/**
 * 登录（UC-02 / 6.5 ④）：邮箱 + 密码。
 *
 * 图形码**不再每次都要**（2026-10-28 需求变更）：同一邮箱连续输错 2 次密码，第 3 次点「登录」才弹窗，
 * 前两次直接提交。计数在 `utils/loginAttempts`（本地 / 按邮箱 / 30 分钟过期 / 成功清零），
 * 后端按同一规则判定 —— 本地计数没跟上时后端回 4008，这里再把弹窗递上来（口径见 `docs/CHANGELOG.md` 项目约定 25）。
 *
 * 账号锁定（1009，2026-10-31）：连续 10 次密码错后台锁 2 小时，**密码正确**时才返回 1009
 * （密码错仍是 1003）。这里的原话直接展示、不改写，详见下方 `lockedNotice`。
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
import { isCaptchaError, isCaptchaRequiredError, isCredentialError, isLockedError } from '@/api/http'
import { pickLoginWelcome } from '@/constants'
import {
  clearLoginFailures,
  markCaptchaRequired,
  needsLoginCaptcha,
  recordLoginFailure,
} from '@/utils/loginAttempts'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

/**
 * 标题下面那句欢迎语（2026-10-27 换掉原来的「用邮箱登录」）：十条里随机一条，
 * 组件挂载时定下来 —— 放在 setup 里而不是 computed，免得重渲染时又换一句。
 */
const welcome = pickLoginWelcome()

/**
 * token 失效被踢回来时，http 层在地址栏留了 expired=1（那边不弹 toast 的原因见 http.ts）。
 * 这里做成**页面内的常驻提示**而不是 toast：整页跳转刚结束时弹提示容易与加载抢时序，
 * 常驻一行反而看得清，提交一次后自然消失。
 */
const expiredNotice = ref(false)

/**
 * 账号被锁定（1009，2026-10-31）时后端给的原话，**原样展示、不改写**：
 * 文案里带着「请 X 分钟后再试，或联系管理员解禁」，比任何自己拼的提示都准。
 * 用常驻提示而不是 toast —— 气泡三秒就没了，用户看不到还得等多久。
 */
const lockedNotice = ref('')

onMounted(() => {
  if (!route.query.expired) return
  expiredNotice.value = true
  const rest = { ...route.query }
  delete rest.expired
  void router.replace({ path: route.path, query: rest })
})

const formRef = ref<FormInstance>()
const captchaVisible = ref(false)
/** 弹窗句柄：图形码输错时要让它「留住弹窗 + 红字 + 换一张新图」 */
const captchaDialogRef = ref<InstanceType<typeof CaptchaDialog>>()

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

/** 校验通过：该出图形码就弹窗，还不用出就直接提交 */
async function handleSubmit() {
  // 表单是原生 `<form>`：点按钮与按回车都会走到这里，请求在飞的时候回车要挡住（按钮自身会被 loading 禁用）
  if (auth.loading) return
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  if (needsLoginCaptcha(form.email)) {
    captchaVisible.value = true
    return
  }
  await submitLogin()
}

async function handleCaptchaConfirm(payload: { captchaId: string; captchaCode: string }) {
  await submitLogin(payload)
}

/** 提交登录；带不带图形码由调用方决定（第 1、2 次不带，第 3 次起带） */
async function submitLogin(captcha?: { captchaId: string; captchaCode: string }) {
  try {
    await auth.login({ email: form.email, password: form.password, ...(captcha ?? {}) })
    clearLoginFailures(form.email)
    captchaVisible.value = false
    lockedNotice.value = ''
    ElMessage.success('登录成功')
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/tasks'
    await router.push(redirect)
  } catch (error) {
    // 图形码错（4001）：留住弹窗，输入框下方给红字并换一张新图 —— 输错的那 4 位不值得让用户从头再来
    if (isCaptchaError(error)) {
      captchaDialogRef.value?.markError()
      return
    }
    // 锁定（1009）：密码是对的，只是账号在锁定期。后端原话常驻展示（见 lockedNotice）。
    // 顺手清掉本地的「连续失败」计数 —— 管理员解禁时后端会把 Redis 里的计数一起清掉，
    // 本地若还停在 2 次以上，解禁后第一次登录会白弹一次图形码。
    if (isLockedError(error)) {
      lockedNotice.value = error instanceof Error ? error.message : ''
      clearLoginFailures(form.email)
      captchaVisible.value = false
      return
    }
    lockedNotice.value = ''
    // 只有「邮箱或密码错」才累计连续失败：冻结 / 注销是账号状态问题，不该顺带把图形码逼出来
    if (isCredentialError(error)) recordLoginFailure(form.email)
    // 其它失败由 http 层提示；关掉弹窗，免得密码填错时逼用户为一次提交连填两次图形码。
    // 下次点「登录」自然是一张新图。
    captchaVisible.value = false
    // 后端说「该输图形码了」而本地还没打算弹（换了浏览器 / 清了缓存 / 别处已经错过两次）：
    // 把本地计数补到阈值再递上弹窗，否则关掉弹窗再点登录又会先不带码提交一次、再吃一次 4008
    if (isCaptchaRequiredError(error)) {
      markCaptchaRequired(form.email)
      captchaVisible.value = true
      captchaDialogRef.value?.refresh()
    }
  }
}
</script>

<template>
  <AuthShell title="登录" :subtitle="welcome">
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

    <p v-if="expiredNotice" class="notice">登录状态已失效，请重新登录</p>

    <!--
      账号被锁定（1009）：第一行是后端原话（含剩余分钟），第二行给「能做什么」。
      锁定是系统自动做的（连续 10 次密码错锁 2 小时），自己等不到头也可以找管理员解禁。
    -->
    <p v-if="lockedNotice" class="notice" role="status">
      <span class="notice__text">{{ lockedNotice }}</span>
      <span class="notice__extra">可联系管理员在后台解禁，不必等到锁定结束。</span>
    </p>

    <!--
      `@submit.prevent` 接住原生提交：按钮是 `native-type="submit"`，所以在任一输入框里按回车
      都等同于点「登录」（2026-10-28 用户要求）。按钮不再挂 `@click`，否则鼠标点击会既触发
      click 又触发表单提交，登录请求发两遍。
    -->
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      novalidate
      @submit.prevent="handleSubmit"
    >
      <el-form-item label="邮箱" prop="email">
        <el-input v-model="form.email" type="email" autocomplete="username" placeholder="todone@example.com" />
      </el-form-item>

      <el-form-item class="field-password" label="密码" prop="password">
        <!-- 眼睛图标由 show-password 提供：输入值后出现，点一下切明文 -->
        <el-input v-model="form.password" type="password" autocomplete="current-password" show-password />
      </el-form-item>

      <!--
        忘记密码贴在密码框正下方靠右，小一档；不再和「注册新账号」一左一右分散。
        它必须留在 form-item **外面**：放进去就会占住内容盒，红字（Element Plus 默认浮在
        内容盒下方）被顶到这一行下面，看起来就跑到登录按钮头上了。
      -->
      <div class="field-aside">
        <RouterLink class="field-aside__link" to="/forgot-password">忘记密码？</RouterLink>
      </div>

      <el-button class="submit" type="primary" native-type="submit" :loading="auth.loading">
        登录
      </el-button>
    </el-form>

    <div class="links">
      <RouterLink class="links__item" to="/register">还没有账号？注册新账号</RouterLink>
    </div>

    <CaptchaDialog
      ref="captchaDialogRef"
      v-model:visible="captchaVisible"
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
/* 状态说明（登录失效 / 账号锁定）与表单同宽，用次要底色区分于校验错误（那是红字） */
.notice {
  margin-bottom: 16px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-hover);
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-2);
}

/* 第二行是「接下来能做什么」，比原话再淡一档，两行不抢成一段 */
.notice__text,
.notice__extra {
  display: block;
}

.notice__extra {
  margin-top: 4px;
  font-size: 12.5px;
  color: var(--color-text-3);
}

/* 与注册页同一套尺度：主按钮 44px、15px 字 */
.submit {
  width: 100%;
  height: 44px;
  font-size: 15px;
}

/*
 * 密码项：不要外边距（到「忘记密码」的间距交给 `.field-aside`），
 * 但**常驻预留一行**给校验红字（12px 文字 + 上下余量 = 18px）——
 * 红字出现时只在这一行里显影，下面的「忘记密码」和登录按钮不会整体往下跳。
 * 用 `padding-bottom` 而不是 `min-height`：内容区是 `align-items: center` 的 flex 盒，
 * 撑高会把输入框挤到中间去。
 */
.field-password {
  margin-bottom: 0;
}

.field-password :deep(.el-form-item__content) {
  padding-bottom: 18px;
}

/*
 * 红字默认浮在内容盒**下方**（`top: 100%`）；改成贴着预留那一行的下沿定位，
 * 14px 的盒子正好落在输入框下沿 → 预留区底部上方 4px，与邮箱项的红字同一套位置。
 */
.field-password :deep(.el-form-item__error) {
  top: auto;
  bottom: 4px;
}

/* 忘记密码：密码框正下方靠右，比正文小一档；18 下是到登录按钮的距离 */
.field-aside {
  width: 100%;
  margin: 0 0 18px;
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
