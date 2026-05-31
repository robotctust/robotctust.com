import { NextRequest } from 'next/server'
import { getPostById } from '@/app/utils/postService'
import { serializePost } from '@/app/types/serialized'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * GET /api/mobile/posts/[id]
 * 公開單篇文章詳情（給 iOS App 使用，不需要 auth）
 *
 * Response: SerializedPost | { error }
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const post = await getPostById(id)
    if (!post) {
      return Response.json({ error: '文章不存在' }, { status: 404 })
    }
    return Response.json(serializePost(post))
  } catch (error) {
    console.error('Mobile post detail error:', error)
    return Response.json({ error: '無法取得文章' }, { status: 500 })
  }
}
