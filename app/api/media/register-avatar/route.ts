import { NextRequest } from 'next/server'
import { createAdminClient } from '@/app/utils/supabase/admin'
import { MAX_UPLOAD_BYTES, MediaError, processImage } from '@/app/utils/media/process'
import { newMediaFolder, putMedia } from '@/app/utils/media/r2'

/** 註冊頭像只接受剛建立的帳號 */
const REGISTER_WINDOW_MS = 10 * 60 * 1000
const DEFAULT_AVATAR = '/assets/image/userEmptyAvatar.png'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/**
 * [POST] 註冊頭像：帳號建立後、尚未登入（需信箱驗證）時也能設定頭像
 * query：userId（signUp 回傳的使用者 ID）；body：multipart，欄位 file
 *
 * 因為沒有 session，改以帳號狀態授權：帳號須在 10 分鐘內建立，且頭像仍是預設圖。
 * 頭像一經設定就不再是預設圖，因此每個帳號只能透過此 API 設定一次，無法拿來改別人的頭像。
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId') ?? ''
    if (!UUID.test(userId)) throw new MediaError('不合法的使用者 ID', 400)

    const admin = createAdminClient()
    const [{ data: authData }, { data: row }] = await Promise.all([
      admin.auth.admin.getUserById(userId),
      admin.from('users').select('avatar_url').eq('id', userId).maybeSingle(),
    ])
    const createdAt = authData?.user ? Date.parse(authData.user.created_at) : NaN
    if (
      !row ||
      !(Date.now() - createdAt < REGISTER_WINDOW_MS) ||
      (row.avatar_url && row.avatar_url !== DEFAULT_AVATAR)
    ) {
      throw new MediaError('此帳號無法設定註冊頭像', 403)
    }

    if (Number(request.headers.get('content-length') ?? 0) > MAX_UPLOAD_BYTES + 1024 * 1024) {
      throw new MediaError('圖片不能超過 20MB', 413)
    }
    const file = (await request.formData()).get('file')
    if (!(file instanceof File) || file.size === 0) throw new MediaError('缺少圖片檔案', 400)
    if (file.size > MAX_UPLOAD_BYTES) throw new MediaError('圖片不能超過 20MB', 413)

    const { files } = await processImage(Buffer.from(await file.arrayBuffer()), 'avatar')
    const url = await putMedia(newMediaFolder('avatar', userId), files)

    const { error } = await admin.from('users').update({ avatar_url: url }).eq('id', userId)
    if (error) throw error

    return Response.json({ url })
  } catch (error) {
    if (error instanceof MediaError) {
      return Response.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('註冊頭像上傳失敗:', error)
    return Response.json({ error: '伺服器發生未預期錯誤' }, { status: 500 })
  }
}
