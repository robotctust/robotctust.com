import { NextRequest } from 'next/server'
import {
  requireDashboardAccess,
  toRouteErrorResponse,
} from '@/app/utils/dashboard/auth'
import { createAdminClient } from '@/app/utils/supabase/admin'
import { getPostById, deletePostImage } from '@/app/utils/postService'
import { serializePost } from '@/app/types/serialized'
import { revalidateUpdatePage } from '@/app/action/revalidate'
import { PostCategory } from '@/app/types/post'

type RouteContext = { params: Promise<{ postId: string }> }

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

    // 處理封面圖片：移除舊圖
    if (removeCoverImage && currentPost.coverImageUrl) {
      await deletePostImage(currentPost.coverImageUrl)
    } else if (
      coverImageUrl &&
      currentPost.coverImageUrl &&
      coverImageUrl !== currentPost.coverImageUrl
    ) {
      await deletePostImage(currentPost.coverImageUrl)
    }

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

    if (post.coverImageUrl) {
      await deletePostImage(post.coverImageUrl)
    }

    const admin = createAdminClient()
    const { error } = await admin.from('posts').delete().eq('id', postId)

    if (error) {
      console.error('Error deleting post:', error)
      return Response.json({ error: '刪除文章失敗' }, { status: 500 })
    }

    await revalidateUpdatePage()

    return Response.json({ success: true })
  } catch (error) {
    return toRouteErrorResponse(error)
  }
}
