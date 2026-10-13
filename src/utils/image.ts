/**
 * 配图前端处理（8.8 / 6.5 ⑦）：后端不做任何图像处理，压缩与取景都在前端完成。
 * 规则（docs/前端修改说明.md 第 4 节）：
 *   ① 长边 > 1920 或体积 > 1MB 时用 canvas 重绘（质量 0.85）；
 *   ② GIF 跳过压缩（重绘会丢动画）；
 *   ③ 单张 > 10MB 在选择时就拦掉，别等到上传。
 */
import { UPLOAD_MAX_BYTES } from '@/constants'

const MAX_EDGE = 1920
const REDRAW_THRESHOLD_BYTES = 1024 * 1024
const QUALITY = 0.85

export class ImageTooLargeError extends Error {}

/** 选择时即校验：超过 10MB 直接抛错，由调用方提示 */
export function assertUploadable(file: File) {
  if (file.size > UPLOAD_MAX_BYTES) {
    throw new ImageTooLargeError(
      `「${file.name}」超过 ${UPLOAD_MAX_BYTES / 1024 / 1024}MB，请换一张`,
    )
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片无法读取'))
    }
    image.src = url
  })
}

/**
 * 需要重绘时才重绘：体积小、尺寸也小的图原样返回，避免无谓的二次有损压缩。
 * 输出统一为 JPEG；GIF 与无需压缩的图直接复用原文件（保留原始格式与文件名）。
 */
export async function compressImage(file: File): Promise<File> {
  if (file.type === 'image/gif') return file

  const image = await loadImage(file)
  const longEdge = Math.max(image.naturalWidth, image.naturalHeight)
  const needResize = longEdge > MAX_EDGE
  const needRecompress = file.size > REDRAW_THRESHOLD_BYTES
  if (!needResize && !needRecompress) return file

  const ratio = needResize ? MAX_EDGE / longEdge : 1
  const width = Math.round(image.naturalWidth * ratio)
  const height = Math.round(image.naturalHeight * ratio)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  // 透明图重绘成 JPEG 会发黑，先铺白底
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(image, 0, 0, width, height)

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', QUALITY),
  )
  if (!blob) return file
  const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
  return new File([blob], name, { type: 'image/jpeg' })
}
