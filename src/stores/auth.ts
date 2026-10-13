/** 登录态 / 用户 / 头像（见 8.3；登录态由 localStorage 的 token 推导，刷新不掉线） */
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import * as authApi from '@/api/auth'
import { TOKEN_KEY } from '@/constants'
import type {
  ChangeEmailPayload,
  ChangePasswordPayload,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
  UpdateProfilePayload,
  User,
} from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem(TOKEN_KEY) ?? '')
  const user = ref<User | null>(null)
  const loading = ref(false)

  const isLoggedIn = computed(() => token.value !== '')

  function setToken(value: string) {
    token.value = value
    localStorage.setItem(TOKEN_KEY, value)
  }

  async function login(payload: LoginPayload) {
    loading.value = true
    try {
      const result = await authApi.login(payload)
      setToken(result.token)
      user.value = result.user
    } finally {
      loading.value = false
    }
  }

  async function register(payload: RegisterPayload) {
    loading.value = true
    try {
      const result = await authApi.register(payload)
      setToken(result.token)
      user.value = result.user
    } finally {
      loading.value = false
    }
  }

  async function resetPassword(payload: ResetPasswordPayload) {
    await authApi.resetPassword(payload)
  }

  async function fetchProfile() {
    if (!isLoggedIn.value) return
    user.value = await authApi.getProfile()
  }

  async function updateProfile(payload: UpdateProfilePayload) {
    user.value = await authApi.updateProfile(payload)
  }

  /**
   * 换邮箱：不在这里回读资料。
   * 邮箱是登录凭证，调用方（个人中心）成功后会立即退出登录，回读没有意义；
   * 反过来若回读失败还会把「已经改成功」误报成失败。
   */
  async function changeEmail(payload: ChangeEmailPayload) {
    await authApi.changeEmail(payload)
  }

  async function changePassword(payload: ChangePasswordPayload) {
    await authApi.changePassword(payload)
  }

  /**
   * 上传头像：直接用响应里的新直链替换本地的那个。
   * 不能沿用旧 URL——后端换头像时已把旧对象删掉，旧直链当场失效。
   */
  async function uploadAvatar(file: File) {
    const result = await authApi.uploadAvatar(file)
    if (user.value) user.value.avatarUrl = result.avatarUrl
  }

  /** 移除头像：接口幂等，本地同步清掉直链即可，不必再多拉一次资料 */
  async function removeAvatar() {
    await authApi.removeAvatar()
    if (user.value) user.value.avatarUrl = null
  }

  /** 退出登录：只清用户 token，不碰管理员 token（8.4） */
  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
  }

  return {
    token,
    user,
    loading,
    isLoggedIn,
    login,
    register,
    resetPassword,
    fetchProfile,
    updateProfile,
    changeEmail,
    changePassword,
    uploadAvatar,
    removeAvatar,
    logout,
  }
})
