import { NextRequest } from 'next/server'
import {
  requireDashboardAccess,
  toRouteErrorResponse,
} from '@/app/utils/dashboard/auth'
import { createAdminClient } from '@/app/utils/supabase/admin'
import { getDashboardPostById } from '@/app/utils/postService'
import { deleteMediaByUrl, deleteMediaPrefix, sweepPostMedia } from '@/app/utils/media/r2'
import { SITE_CONFIG } from '@/app/utils/siteConfigs'
import { serializePost } from '@/app/types/serialized'
import { revalidateUpdatePage } from '@/app/action/revalidate'
import { POST_CATEGORIES, PostCategory } from '@/app/types/post'
import { ContentError, normalizePostContent } from '@/app/components/RichText/validate'
import { collectImageUrls, isEmptyContent } from '@/app/components/RichText/content'

type RouteContext = { params: Promise<{ postId: string }> }

/** v2.7 以前的內文圖片 posts/{uuid}/lg.webp（之後的圖片都在 posts/{media_key}/，刪文時整個資料夾清掉） */
const LEGACY_IMAGE_RE = new RegExp(
  `${SITE_CONFIG.mediaBase.replace(/\./g, '\\.')}/posts/[0-9a-f-]{36}/lg\\.webp`,
  'g',
)

/** 自訂網址：小寫英數與連字號 */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** 刪除圖片失敗只記錄，不影響文章操作 */
function deleteImages(urls: (string | null | undefined)[]) {
  return Promise.all(urls.map((url) => deleteMediaByUrl(url).catch(console.error)))
}

function badRequest(error: string, status = 400) {
  return Response.json({ error }, { status })
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await requireDashboardAccess('news')
    const { postId } = await context.params
    const post = await getDashboardPostById(postId)
    if (!post) {
      return Response.json({ error: '文章不存在' }, { status: 404 })
    }
    return Response.json(serializePost(post))
  } catch (error) {
    return toRouteErrorResponse(error)
  }
}

/**
 * [PATCH] 儲存文章（手動存檔，每次送出完整內容）
 * body：
 * - action：save（狀態不變；已發布的文章即「更新」）、publish、unpublish（撤回成草稿）
 * - expectedUpdatedAt：前端載入 / 上次存檔時的 updated_at，與資料庫不同代表別人改過 → 409
 * - title、category、coverImageUrl、content（TipTap JSON）
 * - slug：只有從沒發布過的文章能改網址（已公開的網址可能已被分享）
 * 發布時間：第一次發布寫入 published_at，並讓 updated_at 等於它（前台據此判斷是否顯示「更新於」）；
 * 撤回後再發布保留第一次的發布時間
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await requireDashboardAccess('news')
    const { postId } = await context.params

    const body = (await request.json()) as {
      action?: 'save' | 'publish' | 'unpublish'
      expectedUpdatedAt?: string
      title?: string
      category?: PostCategory
      coverImageUrl?: string | null
      content?: unknown
      slug?: string
    }
    const action = body.action ?? 'save'
    if (!['save', 'publish', 'unpublish'].includes(action)) return badRequest('不合法的操作')
    if (!body.expectedUpdatedAt) return badRequest('缺少 expectedUpdatedAt')
    if (typeof body.title !== 'string') return badRequest('缺少標題')
    if (!POST_CATEGORIES.includes(body.category as PostCategory)) return badRequest('不合法的分類')
    if (body.coverImageUrl !== null && typeof body.coverImageUrl !== 'string') {
      return badRequest('不合法的封面')
    }

    const current = await getDashboardPostById(postId)
    if (!current) return badRequest('文章不存在', 404)

    let content
    try {
      content = normalizePostContent(body.content ?? { type: 'doc', content: [{ type: 'paragraph' }] })
    } catch (error) {
      if (error instanceof ContentError) return badRequest(error.message)
      throw error
    }

    const title = body.title.trim()
    const status = action === 'publish' ? 'published' : action === 'unpublish' ? 'draft' : current.status
    if (status === 'published') {
      if (!title) return badRequest('發布前請先填寫標題')
      if (isEmptyContent(content)) return badRequest('發布前請先撰寫內文')
    }

    // 網址：從沒發布過才能改
    let newId = postId
    if (body.slug !== undefined && body.slug !== postId) {
      if (current.publishedAt) return badRequest('文章發布過，網址已無法更改')
      const slug = body.slug.trim().toLowerCase()
      if (!SLUG_RE.test(slug) || slug.length > 80) {
        return badRequest('網址只能使用小寫英文、數字與連字號（-），最多 80 字')
      }
      newId = slug
    }

    const now = new Date().toISOString()
    const firstPublish = status === 'published' && !current.publishedAt
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('posts')
      .update({
        id: newId,
        title,
        category: body.category,
        cover_image_url: body.coverImageUrl ?? null,
        content,
        status,
        updated_at: now,
        ...(firstPublish ? { published_at: now } : {}),
      })
      .eq('id', postId)
      // 樂觀鎖：載入後沒人改過才寫入
      .eq('updated_at', body.expectedUpdatedAt)
      .select('id')

    if (error) {
      // posts_id_lower_idx：網址不分大小寫唯一
      if (error.code === '23505') return badRequest('這個網址已被其他文章使用', 409)
      console.error('Error updating post:', error)
      return badRequest('儲存失敗', 500)
    }
    if (!data?.length) {
      return badRequest('這篇文章在你載入後已被修改（可能是其他人或其他分頁），請重新整理後再編輯', 409)
    }

    // 換掉的封面在資料庫更新成功後才刪（新圖都在 posts/{media_key}/，舊文章的封面不在，要個別刪）
    if (current.coverImageUrl && current.coverImageUrl !== (body.coverImageUrl ?? null)) {
      await deleteImages([current.coverImageUrl])
    }
    // 公開中的文章：清掉沒用到的圖片（插入後又刪掉的等），並更新前台快取
    const wasPublic = current.status === 'published'
    if (status === 'published') {
      await sweepPostMedia(current.mediaKey, [
        ...collectImageUrls(content),
        ...(body.coverImageUrl ? [body.coverImageUrl] : []),
      ]).catch(console.error)
    }
    if (status === 'published' || wasPublic) await revalidateUpdatePage()

    const saved = await getDashboardPostById(newId)
    return Response.json({ post: saved && serializePost(saved) })
  } catch (error) {
    return toRouteErrorResponse(error)
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await requireDashboardAccess('news')
    const { postId } = await context.params

    const post = await getDashboardPostById(postId)
    if (!post) {
      return Response.json({ error: '文章不存在' }, { status: 404 })
    }

    const admin = createAdminClient()
    const { error } = await admin.from('posts').delete().eq('id', postId)

    if (error) {
      console.error('Error deleting post:', error)
      return Response.json({ error: '刪除文章失敗' }, { status: 500 })
    }

    // 文章刪除後清除 R2 圖片：v2.7 起的圖片整個資料夾刪掉；更早的封面與內文圖逐張比對網址刪除
    // （內文同時比對 JSON 與 Markdown 備份；Firebase 等外部網址由 deleteMediaByUrl 略過）
    const legacyImages = `${JSON.stringify(post.content)}\n${post.contentMarkdown}`.match(LEGACY_IMAGE_RE) ?? []
    await Promise.all([
      deleteMediaPrefix(`posts/${post.mediaKey}/`).catch(console.error),
      deleteImages([post.coverImageUrl, ...new Set(legacyImages)]),
    ])

    if (post.status === 'published') await revalidateUpdatePage()

    return Response.json({ success: true })
  } catch (error) {
    return toRouteErrorResponse(error)
  }
}
