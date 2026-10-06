import sharp from 'sharp'
import type { MediaCrop, MediaKind, MediaVariant } from '@/app/types/media'

/** 圖片處理錯誤（帶 HTTP 狀態碼，供 API 直接回應） */
export class MediaError extends Error {
  statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.name = 'MediaError'
    this.statusCode = statusCode
  }
}

/** 上傳檔案大小上限 */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024

/** 接受的來源格式（以 sharp 實際解析結果判斷，不信任前端的 MIME） */
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif', 'avif'])

type Spec = {
  width: number
  height: number
  fit: 'cover' | 'inside' // cover：裁成固定比例；inside：長邊縮到上限、保留比例
  quality: number
}

/** 各種類的處理規格（寬度需與 variant.ts 一致） */
const SPECS: Record<MediaKind, Record<MediaVariant, Spec>> = {
  avatar: {
    lg: { width: 512, height: 512, fit: 'cover', quality: 85 },
    sm: { width: 128, height: 128, fit: 'cover', quality: 80 },
  },
  background: {
    lg: { width: 2160, height: 1080, fit: 'cover', quality: 85 },
    sm: { width: 960, height: 480, fit: 'cover', quality: 75 },
  },
  post: {
    lg: { width: 1920, height: 1920, fit: 'inside', quality: 85 },
    sm: { width: 800, height: 800, fit: 'inside', quality: 75 },
  },
  course: {
    lg: { width: 1920, height: 1920, fit: 'inside', quality: 85 },
    sm: { width: 800, height: 800, fit: 'inside', quality: 75 },
  },
}

/** 背景固定 2:1 */
const BACKGROUND_ASPECT = 2

/**
 * 依裁切偏移計算 2:1 的裁切區域（沿用原本前端 compressAndCropBackground 的算法）
 */
function backgroundRegion(w: number, h: number, crop: MediaCrop) {
  const clamp = (n: number) => Math.min(1, Math.max(0, n))
  if (w / h > BACKGROUND_ASPECT) {
    // 比 2:1 更寬 → 水平裁剪
    const width = Math.round(h * BACKGROUND_ASPECT)
    return { left: Math.round(clamp(crop.x) * (w - width)), top: 0, width, height: h }
  }
  // 比 2:1 更高（或剛好）→ 垂直裁剪
  const height = Math.round(w / BACKGROUND_ASPECT)
  return { left: 0, top: Math.round(clamp(crop.y) * (h - height)), width: w, height }
}

/**
 * 將上傳的圖片處理成 sm / lg 兩個 WebP 版本
 * - 依 EXIF 轉正，並移除所有 metadata（手機照片含 GPS 位置）
 * - background 先依裁切偏移裁成 2:1
 * @param input - 原始檔案內容
 * @param kind - 圖片種類
 * @param crop - 背景裁切偏移（僅 background 使用，預設置中）
 */
export async function processImage(
  input: Buffer,
  kind: MediaKind,
  crop: MediaCrop = { x: 0.5, y: 0.5 },
): Promise<Record<MediaVariant, Buffer>> {
  const image = sharp(input)
  const meta = await image.metadata().catch(() => null)
  if (!meta?.format || !ALLOWED_FORMATS.has(meta.format)) {
    throw new MediaError('不支援的圖片格式（僅接受 JPEG / PNG / WebP / GIF / AVIF）', 415)
  }

  let base = image.autoOrient()
  if (kind === 'background') {
    const { width, height } = meta.autoOrient
    base = base.extract(backgroundRegion(width, height, crop))
  }

  const encode = async (spec: Spec) =>
    base
      .clone()
      .resize({
        width: spec.width,
        height: spec.height,
        fit: spec.fit,
        withoutEnlargement: spec.fit === 'inside', // 一般圖不放大；頭像、背景需補滿固定尺寸
      })
      .webp({ quality: spec.quality })
      .toBuffer()

  const [lg, sm] = await Promise.all([encode(SPECS[kind].lg), encode(SPECS[kind].sm)])
  return { lg, sm }
}
