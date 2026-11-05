/**
 * axios 实例 + 拦截器（见 8.4）：
 * ① 注入 Authorization 头（按请求路径选用户 / 管理员两套 token）
 * ② code !== 200 提示并 reject；③ HTTP 401 清对应 token 并跳对应登录页
 * ④ 413 / 3002 提示图片超限；⑤ 按状态码给网络异常提示
 * ⑥ 例外：1009（登录锁定）不弹气泡，提示由登录页常驻展示（见 LOGIN_LOCKED_CODE）
 */
import axios, { type AxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import { ADMIN_TOKEN_KEY, TOKEN_KEY } from '@/constants'
import type { ApiResult } from '@/types'

const AUTH_PREFIX = 'Bearer '
const REQUEST_TIMEOUT = 20000

/**
 * 登录锁定（1009，2026-10-31）：只有 `/auth/login` 会返回它 —— 密码**正确**但账号在锁定期。
 * 文案里带「还剩 X 分钟」，要常驻展示在登录页上（气泡三秒就没了），
 * 所以这个码不走拦截器的 toast，交给登录页渲染。
 */
const LOGIN_LOCKED_CODE = 1009
/**
 * 该验证却没带票（4008）：**不弹** —— 三处入口（登录 / 后台登录 / 发信）收到它都会打开
 * 人机验证弹窗，提示交给流程本身。以前会弹一句「请先完成人机验证后重试」，
 * 用户还没看到验证码就先收到一条像「失败」的红字（2026-11-05 用户反馈）。
 */
const CHALLENGE_REQUIRED_CODE = 4008

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
      // 1009 的提示由登录页常驻展示（见 LOGIN_LOCKED_CODE）；
      // 4008 由调用方打开人机验证弹窗 —— 这两个都不弹，避免「先失败一回」的错觉
      if (body.code !== LOGIN_LOCKED_CODE && body.code !== CHALLENGE_REQUIRED_CODE) {
        ElMessage.error(body.message || '操作失败')
      }
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
 * 人机验证「答错了」（4009，2026-11-05 两段式）：滑块超差 / 点偏了 / 轨迹不像人拖的 / 同题超 3 次。
 * **原地重试**即可 —— 弹窗留着，让用户再拖一次；只有提示「次数用尽」时才需要重新取题。
 * （4001「图形码错误」已随旧接口退役，号码保留不再抛出。）
 */
export function isChallengeWrongError(error: unknown): boolean {
  return businessCodeOf(error) === 4009
}

/**
 * 票据失效（4010）：过期 / 已用过 / 场景不符。
 * **必须重新取题**——拿同一张票重试一定还是 4010，所以这里不能「原地重试」。
 */
export function isChallengeExpiredError(error: unknown): boolean {
  return businessCodeOf(error) === 4010
}

/**
 * 风险过高（4011，HTTP 429）：**一个验证码都别弹**，直接提示稍后再试并按 `Retry-After` 冷却。
 * 还弹验证码的话，用户会陷进「怎么点都不对」的死循环。
 */
export function isChallengeBlockedError(error: unknown): boolean {
  return businessCodeOf(error) === 4011
}

/** 取后端给的业务提示原文（错误码里有「还剩 X 分钟」这类信息，不要自己改写） */
export function messageOf(error: unknown): string {
  return (error as { message?: string } | null)?.message ?? ''
}

/**
 * 邮箱或密码错（1003）：登录页拿它累加「连续错两次就要图形码」的次数。
 * 冻结（1006）/ 注销（1007）不算 —— 那是账号状态问题，不是密码输错。
 */
export function isCredentialError(error: unknown): boolean {
  return businessCodeOf(error) === 1003
}

/**
 * 该验证却没带票据（4008，2026-11-05 两段式）：登录页拿它去**取题 → 换票 → 重发同一个请求**。
 * 前端现在不猜「要不要验证」（旧版靠本地失败计数预判），一律先直接发，收到 4008 再补 ——
 * 风险规则在服务端，本地那套计数永远算不准，还会多一次无谓的取题。
 */
export function isChallengeRequiredError(error: unknown): boolean {
  return businessCodeOf(error) === CHALLENGE_REQUIRED_CODE
}

/**
 * 账号处于登录锁定期（1009，2026-10-31）：连续 10 次密码错 → 锁 2 小时，
 * **只有密码正确时**才会拿到这个码（密码错仍是 1003）。登录页拿它把后端的原话
 * （含「请 X 分钟后再试，或联系管理员解禁」）常驻展示出来，不要改写。
 */
export function isLockedError(error: unknown): boolean {
  return businessCodeOf(error) === LOGIN_LOCKED_CODE
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
