/**
 * 配图 URL 复用（2026-10-31）——「切页签 / 重排序后图片又重下一遍」的前端侧修复。
 *
 * <p>根因在后端：`ImageVO.url` 是**每次响应现签**的预签名直链（`FileService.toVO` →
 * `MinioObjectStorage.presignedGetUrl`），SigV4 把 `X-Amz-Date`（精确到秒）签进了 URL ——
 * 同一张图在两次列表响应里是两个不同地址。浏览器缓存按 **URL** 存，于是切一次「未完成 / 已完成」
 * 等于换了一批新图，全部重新下载（44px 的封面下的还是原图，最长 10MB）。
 *
 * <p>这里按 **`objectKey`**（对象本身的稳定标识）记住已签发的那条 URL，在它过期前继续用旧的：
 * src 字符串不变，浏览器直接命中自己的图片缓存，一个请求都不发。过期余量留 60 秒，
 * 避免「刚好在过期前一刻发出请求」；真过期了也不怕 —— 下一次响应会带新 URL 进来，这里自动换掉。
 *
 * <p><b>边界（2026-10-31 定稿，不要再往后扩）</b>：预签名的 **30 分钟有效期是刻意的泄露面控制**
 * （设计 §7.7），不为缓存改成长期地址，所以链路上不存在「稳定链接」可用；浏览器缓存本来就是**本机**的，
 * 换设备读不到，而跨刷新 / 跨标签页重下一次已被接受。字节级缓存（Cache API / IndexedDB）要 CORS 放行
 * 与容量回收，收益只覆盖「同一台机器刷新一次」，不划算。
 * 结论：**后端保持预签名不变**，前端只负责「同一页面生命周期内地址不变」这一层。
 */

/** 只需要这两个字段，演示数据（data URL）与真实 VO 都满足 */
export interface SignedImage {
  objectKey: string
  url: string
}

const CACHE_MAX_ENTRIES = 500
/** 过期余量：剩不到一分钟就换新的，别卡在边界上 */
const EXPIRE_MARGIN_MS = 60 * 1000
/** 解析不出过期时间（非 MinIO 直链）时的保守假设：比后端 30 分钟短一档 */
const FALLBACK_TTL_MS = 25 * 60 * 1000

interface CacheEntry {
  url: string
  /** 绝对过期时间戳（毫秒） */
  expiresAt: number
}

/** Map 保持插入顺序：命中时删了再塞，队首就是最久没用的 */
const urlCache = new Map<string, CacheEntry>()

/** data: / blob: 这类本地地址没有签名、也不该进缓存（演示模式走这条） */
function isSignedHttpUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://')
}

/**
 * 从预签名 URL 里读出绝对过期时间：`X-Amz-Date=20261031T133000Z` + `X-Amz-Expires=1800`。
 * 两者缺一就退回保守 TTL —— 宁可早换一条 URL，也不要拿一条已经失效的图去请求。
 */
function parseExpiry(url: string): number {
  const expires = /[?&]X-Amz-Expires=(\d+)/.exec(url)
  if (!expires?.[1]) return Date.now() + FALLBACK_TTL_MS
  const lifetimeMs = Number(expires[1]) * 1000

  // 20261031T133000Z：UTC，直接喂 Date.UTC（本地时区的机子上也不会偏）
  const date = /[?&]X-Amz-Date=(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/.exec(url)
  if (!date) return Date.now() + lifetimeMs
  const signedAt = Date.UTC(
    Number(date[1]),
    Number(date[2]) - 1,
    Number(date[3]),
    Number(date[4]),
    Number(date[5]),
    Number(date[6]),
  )
  return signedAt + lifetimeMs
}

function remember(key: string, entry: CacheEntry): void {
  // 先删再塞：命中/刷新过的条目要挪到队尾，淘汰时才是真正的「最久没用」
  urlCache.delete(key)
  urlCache.set(key, entry)
  while (urlCache.size > CACHE_MAX_ENTRIES) {
    const oldest = urlCache.keys().next().value
    if (oldest === undefined) break
    urlCache.delete(oldest)
  }
}

/**
 * 取这张图该用的 src：缓存里那条还没过期就用它，否则用本次响应给的新 URL 并记下来。
 *
 * <p>同一个 `objectKey` 在整页生命周期里只会在过期后换一次地址 —— 这就是「不重新加载」的全部秘密。
 */
export function resolveImageUrl(image: SignedImage): string {
  if (!isSignedHttpUrl(image.url)) return image.url

  const key = image.objectKey || image.url.split('?')[0] || image.url
  const cached = urlCache.get(key)
  if (cached && cached.expiresAt - Date.now() > EXPIRE_MARGIN_MS) {
    remember(key, cached)
    return cached.url
  }

  remember(key, { url: image.url, expiresAt: parseExpiry(image.url) })
  return image.url
}

/**
 * 作废一张图的缓存：`<img>` 报错时调用（旧 URL 可能刚好到期或被对象存储拒绝），
 * 下一次 `resolveImageUrl` 会改用调用方手里最新的那条 URL。
 */
export function forgetImageUrl(objectKey: string): void {
  if (objectKey) urlCache.delete(objectKey)
}

/** 测试与登录切换用：清空缓存（正常业务不需要调用） */
export function clearImageUrlCache(): void {
  urlCache.clear()
}
