import type { MediaCrop, MediaKind } from '@/app/types/media'

/**
 * 上傳圖片到 R2（經 /api/media 處理成 sm / lg 兩個 WebP 版本）
 * @param file - 原始圖片檔案
 * @param kind - 圖片種類
 * @param options.courseId - course 必填
 * @param options.crop - background 的裁切偏移（0~1）
 * @returns lg 版網址（存入資料庫的值）
 */
export async function uploadImage(
  file: File,
  kind: MediaKind,
  options: { courseId?: string; crop?: MediaCrop } = {},
): Promise<string> {
  const params = new URLSearchParams({ kind })
  if (options.courseId) params.set('courseId', options.courseId)
  if (options.crop) {
    params.set('cropX', String(options.crop.x))
    params.set('cropY', String(options.crop.y))
  }
  const body = new FormData()
  body.append('file', file)

  const res = await fetch(`/api/media?${params}`, { method: 'POST', body })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || '圖片上傳失敗')
  return data.url as string
}

/**
 * 刪除 R2 圖片；非本系統網址（Firebase、Google 頭像、預設圖）由伺服器直接略過
 * @param url - 資料庫中存的圖片網址
 */
export async function deleteImage(url: string): Promise<void> {
  const res = await fetch('/api/media', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || '圖片刪除失敗')
  }
}
