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

function redirectToLogin(isAdmin: boolean) {
  const from = encodeURIComponent(`${window.location.pathname}${window.location.search}`)
  if (isAdmin) {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    if (window.location.pathname !== '/admin/login') {
      window.location.assign(`/admin/login?redirect=${from}`)
    }
    return
  }
  localStorage.removeItem(TOKEN_KEY)
  if (window.location.pathname !== '/login') {
    window.location.assign(`/login?redirect=${from}`)
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
      return Promise.reject(new Error(body.message || '操作失败'))
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
        message = body?.message || '登录状态已失效，请重新登录'
        redirectToLogin(isAdmin)
      } else if (status === 413 || body?.code === 3002) {
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
