import { NextRequest } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import {
  isDashboardAccessError,
  requireDashboardAccess,
  toRouteErrorResponse,
} from '@/app/utils/dashboard/auth'
import { MAX_UPLOAD_BYTES, MediaError, processImage } from '@/app/utils/media/process'
import {
  deleteMediaByUrl,
  newMediaFolder,
  parseMediaUrl,
  putMedia,
} from '@/app/utils/media/r2'
import type { MediaKind, UploadedImage } from '@/app/types/media'

const KINDS: MediaKind[] = ['avatar', 'background', 'post', 'course']

/** 課程 ID 會成為 R2 key 的一段，只接受安全字元 */
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/

/**
 * 確認操作者對該種類圖片的權限
 * - avatar / background：須登入，擁有者一律取自 session（不採信前端傳入的 uid）
 * - post：須有 news 模組權限
 * - course：須有 courses 模組權限
 * @returns 擁有者 ID（使用者 uid 或課程 ID）
 */
async function authorize(kind: MediaKind, courseId?: string | null): Promise<string | undefined> {
  if (kind === 'post') {
    await requireDashboardAccess('news')
    return undefined
  }
  if (kind === 'course') {
    await requireDashboardAccess('courses')
    if (!courseId || !SAFE_ID.test(courseId)) throw new MediaError('缺少或不合法的課程 ID', 400)
    return courseId
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new MediaError('尚未登入', 401)
  return user.id
}

function toErrorResponse(error: unknown): Response {
  if (error instanceof MediaError) {
    return Response.json({ error: error.message }, { status: error.statusCode })
  }
  if (!isDashboardAccessError(error)) console.error('圖片 API 錯誤:', error)
  return toRouteErrorResponse(error)
}

/**
 * [POST] 上傳圖片：處理成 sm / lg 兩個 WebP 後存到 R2
 * query：kind、courseId（course 用）、cropX / cropY（background 用，0~1）
 * body：multipart，欄位 file
 * 權限與大小檢查放在讀取 body 之前，未授權的請求不會讓伺服器讀入整個檔案
 * @returns UploadedImage：lg 版網址與實際寬高
 */
export async function POST(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const kind = params.get('kind') as MediaKind
    if (!KINDS.includes(kind)) throw new MediaError('不合法的圖片種類', 400)

    const ownerId = await authorize(kind, params.get('courseId'))

    // multipart 外框另有少量位元組，上限多留 1MB
    if (Number(request.headers.get('content-length') ?? 0) > MAX_UPLOAD_BYTES + 1024 * 1024) {
      throw new MediaError('圖片不能超過 20MB', 413)
    }
    const file = (await request.formData()).get('file')
    if (!(file instanceof File) || file.size === 0) throw new MediaError('缺少圖片檔案', 400)
    if (file.size > MAX_UPLOAD_BYTES) throw new MediaError('圖片不能超過 20MB', 413)

    const cropX = Number(params.get('cropX') ?? 0.5)
    const cropY = Number(params.get('cropY') ?? 0.5)
    const { files, width, height } = await processImage(
      Buffer.from(await file.arrayBuffer()),
      kind,
      {
        x: Number.isFinite(cropX) ? cropX : 0.5,
        y: Number.isFinite(cropY) ? cropY : 0.5,
      },
    )
    const url = await putMedia(newMediaFolder(kind, ownerId), files)
    return Response.json({ url, width, height } satisfies UploadedImage)
  } catch (error) {
    return toErrorResponse(error)
  }
}

/**
 * [DELETE] 刪除圖片（sm、lg 一併刪除）
 * body：{ url }；非本系統網址（Firebase、Google 頭像等）直接回成功，方便遷移期間呼叫端不必判斷
 * 權限：avatar / background 只能刪自己的；post / course 需對應模組權限
 */
export async function DELETE(request: NextRequest) {
  try {
    const { url } = (await request.json()) as { url?: string }
    const parsed = url ? parseMediaUrl(url) : null
    if (!parsed) return Response.json({ success: true })

    const ownerId = await authorize(parsed.kind, parsed.ownerId)
    if ((parsed.kind === 'avatar' || parsed.kind === 'background') && ownerId !== parsed.ownerId) {
      throw new MediaError('只能刪除自己的圖片', 403)
    }

    await deleteMediaByUrl(url)
    return Response.json({ success: true })
  } catch (error) {
    return toErrorResponse(error)
  }
}
