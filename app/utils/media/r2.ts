import 'server-only'
import { AwsClient } from 'aws4fetch'
import type { MediaKind, MediaVariant } from '@/app/types/media'
import { SITE_CONFIG } from '@/app/utils/siteConfigs'

/** 上傳後永久快取：圖片不覆寫，換圖一律換新 key */
const CACHE_CONTROL = 'public, max-age=31536000, immutable'

let client: AwsClient | null = null

/**
 * 取得 R2（S3 相容 API）client 與 bucket 端點
 * 延遲到第一次呼叫才讀環境變數，避免 build 階段缺變數時直接失敗
 */
function getR2() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    throw new Error('缺少 R2 環境變數（R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET）')
  }
  client ??= new AwsClient({
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    service: 's3',
    region: 'auto',
  })
  return { client, endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}` }
}

/**
 * 對單一物件發出請求，失敗時拋出錯誤
 * 只用 aws4fetch 簽章、再自行 fetch 並帶回原始 body：直接用 client.fetch 時 binary body
 * 會被包成串流以 chunked 送出，R2 不接受（411 MissingContentLength）
 */
async function r2Request(key: string, init: RequestInit) {
  const { client, endpoint } = getR2()
  const signed = await client.sign(`${endpoint}/${key}`, init)
  const res = await fetch(signed.url, { method: signed.method, headers: signed.headers, body: init.body })
  if (!res.ok) {
    throw new Error(`R2 ${init.method} ${key} 失敗：${res.status} ${await res.text()}`)
  }
}

/**
 * 解析 /api/media 產生的 R2 圖片網址
 * key 格式：
 * - users/avatars/{uid}/{uuid}/lg.webp
 * - users/backgrounds/{uid}/{uuid}/lg.webp
 * - posts/{uuid}/lg.webp
 * - courses/{courseId}/{uuid}/lg.webp
 * @returns 種類、擁有者（使用者 uid 或課程 ID）與不含檔名的資料夾；非本系統網址回傳 null
 */
export function parseMediaUrl(
  url: string,
): { kind: MediaKind; ownerId: string | null; folder: string } | null {
  const base = `${SITE_CONFIG.mediaBase}/`
  if (!url.startsWith(base)) return null
  const key = url.slice(base.length)
  const uuid = '[0-9a-f-]{36}'
  let m = key.match(new RegExp(`^users/(avatars|backgrounds)/([^/]+)/${uuid}/lg\\.webp$`))
  if (m) {
    return {
      kind: m[1] === 'avatars' ? 'avatar' : 'background',
      ownerId: m[2],
      folder: key.slice(0, -'/lg.webp'.length),
    }
  }
  m = key.match(new RegExp(`^posts/${uuid}/lg\\.webp$`))
  if (m) return { kind: 'post', ownerId: null, folder: key.slice(0, -'/lg.webp'.length) }
  m = key.match(new RegExp(`^courses/([^/]+)/${uuid}/lg\\.webp$`))
  if (m) return { kind: 'course', ownerId: m[1], folder: key.slice(0, -'/lg.webp'.length) }
  return null
}

/**
 * 產生新圖片的資料夾 key（每次上傳都是新的 uuid）
 * @param kind - 圖片種類
 * @param ownerId - avatar / background 為使用者 uid；course 為課程 ID；post 不需要
 */
export function newMediaFolder(kind: MediaKind, ownerId?: string): string {
  const id = crypto.randomUUID()
  switch (kind) {
    case 'avatar':
      return `users/avatars/${ownerId}/${id}`
    case 'background':
      return `users/backgrounds/${ownerId}/${id}`
    case 'post':
      return `posts/${id}`
    case 'course':
      return `courses/${ownerId}/${id}`
  }
}

/**
 * 上傳 sm / lg 兩個版本
 * @returns lg 版的公開網址（存入資料庫的值）
 */
export async function putMedia(
  folder: string,
  files: Record<MediaVariant, Buffer>,
): Promise<string> {
  const variants = Object.keys(files) as MediaVariant[]
  const results = await Promise.allSettled(
    variants.map((variant) =>
      r2Request(`${folder}/${variant}.webp`, {
        method: 'PUT',
        body: new Uint8Array(files[variant]),
        headers: { 'Content-Type': 'image/webp', 'Cache-Control': CACHE_CONTROL },
      }),
    ),
  )
  const failed = results.find((r) => r.status === 'rejected')
  if (failed) {
    // 只成功一半時清掉已上傳的版本，避免留下孤兒檔
    await Promise.allSettled(
      variants.map((variant) => r2Request(`${folder}/${variant}.webp`, { method: 'DELETE' })),
    )
    throw failed.reason
  }
  return `${SITE_CONFIG.mediaBase}/${folder}/lg.webp`
}

/**
 * 依網址刪除圖片（sm、lg 一併刪除）
 * 非本系統的網址（Firebase、Google、本機預設圖）直接略過，呼叫端不必先判斷
 * 不做權限檢查：呼叫端（API route）須自行確認操作者有權刪除
 */
export async function deleteMediaByUrl(url: string | null | undefined): Promise<void> {
  const parsed = url ? parseMediaUrl(url) : null
  if (!parsed) return
  await Promise.all(
    (['lg', 'sm'] as const).map((variant) =>
      r2Request(`${parsed.folder}/${variant}.webp`, { method: 'DELETE' }),
    ),
  )
}
