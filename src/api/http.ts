/**
 * axios 实例 + 拦截器（见 8.4）：
 * ① 注入 Authorization 头（按请求路径选用户 / 管理员两套 token）
 * ② code !== 200 提示并 reject；③ HTTP 401 清对应 token 并跳对应登录页
 * ④ 413 / 3002 提示图片超限；⑤ 按状态码给网络异常提示
 */
import axios, { type AxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import { ADMIN_TOKEN_KEY, TOKEN_KEY } from '@/constants'
import type { ApiResult } from '@/types'

const AUTH_PREFIX = 'Bearer '
const REQUEST_TIMEOUT = 20000

const http = axios.create({
  baseURL: '/api',
  timeout: REQUEST_TIMEOUT,
})

/** /api/admin/** 走管理员 token，其余走用户 token（7.11 的两套密钥） */
function isAdminUrl(url?: string): boolean {
  return url?.startsWith('/admin') ?? false
}

/**
 * 401：清掉对应 token 并整页跳登录页。
 * 这里**不弹提示**——紧接着的整页跳转会把刚弹出的 toast 冲掉，用户只会莫名其妙地回到登录页；
 * 改成把原因写进 URL（`expired=1`），由登录页挂载时提示一次，跳转后仍能看到。
 */
function redirectToLogin(isAdmin: boolean, expired = false) {
  const from = encodeURIComponent(`${window.location.pathname}${window.location.search}`)
  const suffix = expired ? '&expired=1' : ''
  if (isAdmin) {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    if (window.location.pathname !== '/admin/login') {
      window.location.assign(`/admin/login?redirect=${from}${suffix}`)
    }
    return
  }
  localStorage.removeItem(TOKEN_KEY)
  if (window.location.pathname !== '/login') {
    window.location.assign(`/login?redirect=${from}${suffix}`)
  }
}

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(isAdminUrl(config.url) ? ADMIN_TOKEN_KEY : TOKEN_KEY)
  if (token) {
    config.headers.set('Authorization', `${AUTH_PREFIX}${token}`)
  }
  return config
})

http.interceptors.response.use(
  (response) => {
    const body = response.data as ApiResult<unknown>
    if (body.code !== 200) {
      ElMessage.error(body.message || '操作失败')
      // 把业务码带出去：调用方要能区分「图形码错（4001）」这类可以原地重试的失败
      const failure = new Error(body.message || '操作失败') as Error & { businessCode?: number }
      failure.businessCode = body.code
      return Promise.reject(failure)
    }
    return response
  },
  (error: unknown) => {
    const isAdmin = isAdminUrl(axios.isAxiosError(error) ? error.config?.url : undefined)
    let message = '网络异常，请稍后重试'

    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      const body = error.response?.data as ApiResult<unknown> | undefined
      if (status === 401) {
        // 提示交给登录页（见 redirectToLogin 的说明），这里直接跳
        redirectToLogin(isAdmin, true)
        return Promise.reject(error)
      }
      if (status === 413 || body?.code === 3002) {
        message = '图片不能超过 10MB'
      } else if (status === 403) {
        message = '没有访问权限'
      } else if (status === 404) {
        message = '请求的资源不存在'
      } else if (status === 503) {
        message = body?.message || '服务暂时不可用，请稍后重试'
      } else if (status !== undefined && status >= 500) {
        // 500 与网关类错误（502 / 504：反向代理连不上后端，响应体不是 JSON）
        message = body?.message || '服务器暂时不可用，请稍后重试'
      } else if (body?.message) {
        message = body.message
      } else if (!error.response) {
        message = error.code === 'ECONNABORTED' ? '请求超时，请稍后重试' : '网络连接失败，请检查网络'
      }
    }

    ElMessage.error(message)
    return Promise.reject(error)
  },
)

/**
 * 业务码窄化：请求层把 code 挂在 `Error.businessCode` 上（见上面拦截器），
 * 调用方要区分失败类型时都走这几个函数，不用到处写 any。
 */
function businessCodeOf(error: unknown): number | undefined {
  return (error as { businessCode?: number } | null)?.businessCode
}

/**
 * 图形验证码错误（4001）：那张码的机会用完了，可以原地再要一张，不必让用户从头填整张表单。
 */
export function isCaptchaError(error: unknown): boolean {
  return businessCodeOf(error) === 4001
}

/**
 * 邮箱或密码错（1003）：登录页拿它累加「连续错两次就要图形码」的次数。
 * 冻结（1006）/ 注销（1007）不算 —— 那是账号状态问题，不是密码输错。
 */
export function isCredentialError(error: unknown): boolean {
  return businessCodeOf(error) === 1003
}

/**
 * 后端要求先过图形码（4008，2026-10-28 新增，口径见 `docs/CHANGELOG.md` 项目约定 25）：
 * 本地计数没跟上时（换了浏览器 / 清了缓存 / 后端把计数窗口算得更久）用它把弹窗补上，
 * 用户不至于卡在「点登录只报错、却看不到要输码」。
 */
export function isCaptchaRequiredError(error: unknown): boolean {
  return businessCodeOf(error) === 4008
}

/** 业务侧拿到的直接是 data（8.4） */
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await http.request<ApiResult<T>>(config)
  return response.data.data
}

/**
 * 文件上传：任务新建 / 更新是 multipart（JSON 的 data 段 + 0~9 个 images 段，见 6.5 ⑦），
 * 头像上传是同类的单文件 multipart，故统一收口为 FormData 入参。
 */
export async function upload<T>(
  url: string,
  form: FormData,
  options: { method?: 'POST' | 'PUT'; onProgress?: (percent: number) => void } = {},
): Promise<T> {
  const { method = 'POST', onProgress } = options
  return request<T>({
    url,
    method,
    data: form,
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => {
      const total = event.total ?? 0
      if (onProgress && total > 0) {
        onProgress(Math.round((event.loaded * 100) / total))
      }
    },
  })
}
