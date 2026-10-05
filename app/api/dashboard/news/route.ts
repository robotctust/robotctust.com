import { NextRequest } from 'next/server'
import {
  requireDashboardAccess,
  toRouteErrorResponse,
} from '@/app/utils/dashboard/auth'
import { createAdminClient } from '@/app/utils/supabase/admin'
import { getAllPosts } from '@/app/utils/postService'
import { serializePost } from '@/app/types/serialized'
import { revalidateUpdatePage } from '@/app/action/revalidate'
import { PostCategory } from '@/app/types/post'

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
    const posts = await getAllPosts()
    return Response.json(posts.map(serializePost))
  } catch (error) {
    return toRouteErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireDashboardAccess('news')

    const body = await request.json()
    const { title, contentMarkdown, category, coverImageUrl, slug: customSlug } = body as {
      title: string
      contentMarkdown: string
      category: PostCategory
      coverImageUrl?: string | null
      slug?: string
    }

    if (!title?.trim()) {
      return Response.json({ error: '請提供文章標題' }, { status: 400 })
    }
    if (!contentMarkdown?.trim()) {
      return Response.json({ error: '請提供文章內容' }, { status: 400 })
    }
    if (!category) {
      return Response.json({ error: '請選擇文章分類' }, { status: 400 })
    }

    const admin = createAdminClient()

    // 查詢作者顯示名稱
    const { data: userRow } = await admin
      .from('users')
      .select('display_name')
      .eq('id', actor.userId)
      .maybeSingle()

    const authorDisplayName = userRow?.display_name || actor.userId

    // 決定文章 ID
    let postId: string
    if (customSlug?.trim()) {
      const slugValue = customSlug.trim()
      const { data: existing } = await admin.from('posts').select('id').eq('id', slugValue).maybeSingle()
      if (existing) {
        return Response.json({ error: '此 slug 已被使用，請選擇其他名稱' }, { status: 409 })
      }
      postId = slugValue
    } else {
      postId = await generateUniqueSlug(admin)
    }

    const now = new Date().toISOString()
    const { error } = await admin.from('posts').insert({
      id: postId,
      title: title.trim(),
      content_markdown: contentMarkdown.trim(),
      category,
      cover_image_url: coverImageUrl ?? null,
      author_id: actor.userId,
      author_display_name: authorDisplayName,
      created_at: now,
      updated_at: now,
    })

    if (error) {
      console.error('Error inserting post:', error)
      return Response.json({ error: '建立文章失敗' }, { status: 500 })
    }

    await revalidateUpdatePage()

    return Response.json({ postId }, { status: 201 })
  } catch (error) {
    return toRouteErrorResponse(error)
  }
}
