<script setup lang="ts">
/**
 * 注册（UC-01 / 6.5 ③）：邮箱 + 验证码 + 密码 + 用户名；name 不查重。
 *
 * 排版（2026-10-14 起左右分栏，2026-10-16 改 4:6 全高）：左栏是「产品本体」，见 `AuthAside` ——
 * 登录页共用同一个组件、同一套版式，两页的差别只有主张文案与场景标签那一行。
 * 右侧表单字段顺序按「邮箱 → 它的验证码 → 密码 → 用户名」排：邮箱与验证码是一件事的两半，挨着更顺。
 * 图形码不在这一页，只在点「获取验证码」时由 EmailCodeField 弹窗索取。
 */
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import AuthAside from '@/components/AuthAside.vue'
import AuthShell from '@/components/AuthShell.vue'
import EmailCodeField from '@/components/EmailCodeField.vue'
import { PASSWORD_HINT, PASSWORD_PATTERN } from '@/constants'
import { clearLoginFailures } from '@/utils/loginAttempts'
import { useAuthStore } from '@/stores/auth'

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
  emailCode: [{ required: true, message: '请填写验证码', trigger: 'blur' }],
  password: [
    { required: true, message: '请填写密码', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback) =>
        PASSWORD_PATTERN.test(value) ? callback() : callback(new Error(PASSWORD_HINT)),
      trigger: 'blur',
    },
  ],
  name: [{ required: true, message: '请填写用户名', trigger: 'blur' }],
}

/**
 * 校验通过直接注册（2026-10-14 定稿）：图形码只在「获取验证码」时用一次，
 * 提交不再弹第二次，请求里也就不带 captchaId / captchaCode。
 */
async function handleSubmit() {
  // 原生表单：鼠标点击与回车共用这一条入口，请求在飞时回车也要挡住
  if (auth.loading) return
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  try {
    await auth.register({ ...form })
    // 后端注册成功会 DEL 该邮箱的登录失败计数（注销后用同一邮箱重注册，新账号不继承旧账）。
    // 本地这份也得跟着清，否则第 1 次登录会先被本地计数骗出一张图。
    clearLoginFailures(form.email)
    ElMessage.success('注册成功')
    await router.push('/tasks')
  } catch {
    // 1002 邮箱已被注册等提示由 http 层给出
  }
}
</script>

<template>
  <AuthShell title="注册">
    <!-- 标题右侧的次要入口（外壳统一上样式，见 AuthShell 的 :slotted 规则） -->
    <template #header-extra>
      <RouterLink to="/demo">先逛逛演示</RouterLink>
    </template>

    <template #aside>
      <!-- 价值词 / 互动引导 / 庆祝语都用组件里的默认值，这里只给主张 -->
      <AuthAside lead="把要做的事，一件件划掉。" />
    </template>

    <!-- 回车即提交（与登录页同一套）：按钮是 submit，`@submit.prevent` 接住，按钮不再挂 @click -->
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

      <el-form-item label="验证码" prop="emailCode">
        <EmailCodeField v-model="form.emailCode" :email="form.email" scene="REGISTER" />
      </el-form-item>

      <!-- 密码规则放进输入框当占位文案（原来在框下方另占一行）；校验不通过时错误信息仍是这句，规则不会丢 -->
      <el-form-item label="密码" prop="password">
        <el-input
          v-model="form.password"
          type="password"
          autocomplete="new-password"
          show-password
          :placeholder="PASSWORD_HINT"
        />
      </el-form-item>

      <el-form-item label="用户名" prop="name">
        <el-input v-model="form.name" maxlength="32" />
      </el-form-item>

      <el-button class="submit" type="primary" native-type="submit" :loading="auth.loading">
        注册
      </el-button>
    </el-form>

    <!-- 与表单同体：紧贴注册按钮；「先逛逛演示」在标题右侧，这里只留登录入口 -->
    <div class="links">
      <RouterLink class="links__item" to="/login">已有账号，去登录</RouterLink>
    </div>

    <template #footer>
      <span>© 2026 To_Done</span>
      <span aria-hidden="true">·</span>
      <span>邮箱验证码登录，数据只属于你</span>
    </template>
  </AuthShell>
</template>

<style scoped>
/* 与登录页同一套尺度：主按钮 44px、15px 字 */
.submit {
  width: 100%;
  height: 44px;
  font-size: 15px;
}

.links {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 18px;
  font-size: 14px;
}

.links__item {
  color: var(--color-text-2);
}

.links__item:hover {
  color: var(--color-text);
}
</style>
