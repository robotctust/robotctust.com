import { getAllPosts } from '@/app/utils/postService'
import { serializePost } from '@/app/types/serialized'

/**
 * GET /api/mobile/posts
 * 公開文章列表（給 iOS App 使用，不需要 auth）
 *
 * Response: SerializedPost[]
 */
export async function GET() {
  try {
    const posts = await getAllPosts()
    return Response.json(posts.map(serializePost))
  } catch (error) {
    console.error('Mobile posts list error:', error)
    return Response.json({ error: '無法取得文章列表' }, { status: 500 })
  }
}
