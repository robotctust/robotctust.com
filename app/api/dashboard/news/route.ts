import {
  requireDashboardAccess,
  toRouteErrorResponse,
} from '@/app/utils/dashboard/auth'
import { createAdminClient } from '@/app/utils/supabase/admin'
import { getDashboardPosts } from '@/app/utils/postService'
import { serializePost } from '@/app/types/serialized'
import { POST_CATEGORIES } from '@/app/types/post'

const BASE62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

function generateSlug(length = 10): string {
  let result = ''
  const randomValues = new Uint8Array(length)
  crypto.getRandomValues(randomValues)
  for (const v of randomValues) {
    result += BASE62[v % 62]
  }
  return result
}

async function generateUniqueSlug(admin: ReturnType<typeof createAdminClient>): Promise<string> {
  for (let attempts = 0; attempts < 10; attempts++) {
    const slug = generateSlug()
    const { data } = await admin.from('posts').select('id').eq('id', slug).maybeSingle()
    if (!data) return slug
  }
  throw new Error('無法生成唯一 slug，請稍後再試')
}

export async function GET() {
  try {
    await requireDashboardAccess('news')
    const posts = await getDashboardPosts()
    return Response.json(posts.map(serializePost))
  } catch (error) {
    return toRouteErrorResponse(error)
  }
}

/**
 * [POST] 新增文章：先建立一篇空白草稿，前端拿到 postId 後跳到編輯頁
 * （草稿從沒發布過，網址 slug 之後在編輯頁還能改）
 */
export async function POST() {
  try {
    const actor = await requireDashboardAccess('news')
    const admin = createAdminClient()

    // 作者顯示名稱快照（刪除帳號時會改成「已刪除的使用者」）
    const { data: userRow } = await admin
      .from('users')
      .select('display_name')
      .eq('id', actor.userId)
      .maybeSingle()

    const postId = await generateUniqueSlug(admin)
    const now = new Date().toISOString()
    const { error } = await admin.from('posts').insert({
      id: postId,
      title: '',
      category: POST_CATEGORIES[0],
      status: 'draft',
      author_id: actor.userId,
      author_display_name: userRow?.display_name || actor.userId,
      created_at: now,
      updated_at: now,
    })

    if (error) {
      console.error('Error creating draft:', error)
      return Response.json({ error: '建立草稿失敗' }, { status: 500 })
    }

    return Response.json({ postId }, { status: 201 })
  } catch (error) {
    return toRouteErrorResponse(error)
  }
}
