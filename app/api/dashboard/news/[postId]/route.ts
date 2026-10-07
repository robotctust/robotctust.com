import { NextRequest } from 'next/server'
import {
  requireDashboardAccess,
  toRouteErrorResponse,
} from '@/app/utils/dashboard/auth'
import { createAdminClient } from '@/app/utils/supabase/admin'
import { getPostById } from '@/app/utils/postService'
import { deleteMediaByUrl } from '@/app/utils/media/r2'
import { SITE_CONFIG } from '@/app/utils/siteConfigs'
import { serializePost } from '@/app/types/serialized'
import { revalidateUpdatePage } from '@/app/action/revalidate'
import { PostCategory } from '@/app/types/post'

type RouteContext = { params: Promise<{ postId: string }> }

/** 文章內文中由 /api/media 上傳的 R2 圖片網址（只比對網址，內文是 Markdown 或日後 TipTap 的 HTML / JSON 都適用） */
const CONTENT_IMAGE_RE = new RegExp(
  `${SITE_CONFIG.mediaBase.replace(/\./g, '\\.')}/posts/[0-9a-f-]{36}/lg\\.webp`,
  'g',
)

/** 刪除圖片失敗只記錄，不影響文章操作 */
function deleteImages(urls: (string | null | undefined)[]) {
  return Promise.all(urls.map((url) => deleteMediaByUrl(url).catch(console.error)))
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await requireDashboardAccess('news')
    const { postId } = await context.params
    const post = await getPostById(postId)
    if (!post) {
      return Response.json({ error: '文章不存在' }, { status: 404 })
    }
    return Response.json(serializePost(post))
  } catch (error) {
    return toRouteErrorResponse(error)
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await requireDashboardAccess('news')
    const { postId } = await context.params

    const body = await request.json()
    const {
      title,
      contentMarkdown,
      category,
      coverImageUrl,
      removeCoverImage,
    } = body as {
      title?: string
      contentMarkdown?: string
      category?: PostCategory
      coverImageUrl?: string | null
      removeCoverImage?: boolean
    }

    const currentPost = await getPostById(postId)
    if (!currentPost) {
      return Response.json({ error: '文章不存在' }, { status: 404 })
    }

    // 封面被移除或更換時，舊圖要在資料庫更新成功後才刪（避免更新失敗時文章指向已刪除的圖）
    const replacedCover =
      currentPost.coverImageUrl &&
      (removeCoverImage ||
        (coverImageUrl && coverImageUrl !== currentPost.coverImageUrl))
        ? currentPost.coverImageUrl
        : null

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (title !== undefined) updatePayload.title = title.trim()
    if (contentMarkdown !== undefined) updatePayload.content_markdown = contentMarkdown.trim()
    if (category !== undefined) updatePayload.category = category
    if (removeCoverImage) {
      updatePayload.cover_image_url = null
    } else if (coverImageUrl !== undefined) {
      updatePayload.cover_image_url = coverImageUrl
    }

    const admin = createAdminClient()
    const { error } = await admin
      .from('posts')
      .update(updatePayload)
      .eq('id', postId)

    if (error) {
      console.error('Error updating post:', error)
      return Response.json({ error: '更新文章失敗' }, { status: 500 })
    }

    await deleteImages([replacedCover])
    await revalidateUpdatePage()

    return Response.json({ success: true })
  } catch (error) {
    return toRouteErrorResponse(error)
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await requireDashboardAccess('news')
    const { postId } = await context.params

    const post = await getPostById(postId)
    if (!post) {
      return Response.json({ error: '文章不存在' }, { status: 404 })
    }

    const admin = createAdminClient()
    const { error } = await admin.from('posts').delete().eq('id', postId)

    if (error) {
      console.error('Error deleting post:', error)
      return Response.json({ error: '刪除文章失敗' }, { status: 500 })
    }

    // 文章刪除後清除封面與內文的 R2 圖片（Firebase 舊圖由 deleteMediaByUrl 略過）
    await deleteImages([
      post.coverImageUrl,
      ...(post.contentMarkdown.match(CONTENT_IMAGE_RE) ?? []),
    ])

    await revalidateUpdatePage()

    return Response.json({ success: true })
  } catch (error) {
    return toRouteErrorResponse(error)
  }
}
