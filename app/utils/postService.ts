import { UserProfile } from '../types/user'
import { createAdminClient } from './supabase/admin'
import { createPublicClient } from './supabase/public'
import {
  Post,
  PostCategory,
} from '../types/post'
import { canAccessModuleByRoles } from './auth/roles'
import { Locale } from '../types/i18n'

/**
 * 檢查使用者是否有發布權限
 */
export function checkUserPermission(user: UserProfile): boolean {
  return canAccessModuleByRoles(user.roles, 'news')
}

type SupabasePostRow = {
  id: string
  title: string
  content_markdown: string | null
  category: string
  cover_image_url: string | null
  author_id: string
  author_display_name: string
  created_at: string
  updated_at: string
  published_at: string | null
  author: { display_name: string; username: string } | null
}

const POST_SELECT = '*, author:users!posts_author_id_fkey(display_name, username)' as const

function rowToPost(row: SupabasePostRow): Post {
  return {
    id: row.id,
    title: row.title,
    // v2.7 新編輯器的文章只有 JSON 內文，這裡沒有 markdown
    contentMarkdown: row.content_markdown ?? '',
    category: row.category as PostCategory,
    coverImageUrl: row.cover_image_url,
    authorId: row.author_id,
    authorDisplayName: row.author?.display_name || row.author_display_name,
    authorUsername: row.author?.username ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  }
}

/*
 * 公開頁的讀取一律用 createPublicClient()（訪客身分），由 RLS 只放行已發布的文章；
 * 草稿只有後台的 getDashboard* 函式（admin client）讀得到。
 */

/**
 * 獲取所有已發布文章（依發布時間新到舊）
 * @param limit 只取最新幾篇，不給就全部
 */
export async function getAllPosts(limit?: number): Promise<Post[]> {
  const query = createPublicClient()
    .from('posts')
    .select(POST_SELECT)
    .order('published_at', { ascending: false })
  const { data, error } = await (limit ? query.limit(limit) : query)

  if (error) {
    console.error('Error fetching posts:', error)
    throw new Error('無法獲取文章列表')
  }

  return (data as SupabasePostRow[]).map(rowToPost)
}

export type AdjacentPost = {
  id: string
  title: string
  coverImageUrl: string | null
}

/**
 * 依發布時間線取得相鄰文章（older = 較早一篇，newer = 較新一篇）
 */
export async function getAdjacentPosts(
  publishedAt: string | null,
): Promise<{ older: AdjacentPost | null; newer: AdjacentPost | null }> {
  if (!publishedAt) return { older: null, newer: null }
  const supabase = createPublicClient()
  const [olderRes, newerRes] = await Promise.all([
    supabase
      .from('posts')
      .select('id, title, cover_image_url')
      .lt('published_at', publishedAt)
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('posts')
      .select('id, title, cover_image_url')
      .gt('published_at', publishedAt)
      .order('published_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ])

  if (olderRes.error)
    console.error('Error fetching older post:', olderRes.error)
  if (newerRes.error)
    console.error('Error fetching newer post:', newerRes.error)

  const toAdjacent = (
    row: { id: string; title: string; cover_image_url: string | null } | null,
  ): AdjacentPost | null =>
    row
      ? { id: row.id, title: row.title, coverImageUrl: row.cover_image_url }
      : null

  return {
    older: toAdjacent(olderRes.data),
    newer: toAdjacent(newerRes.data),
  }
}

/**
 * 取得同分類的推薦文章（依時間新到舊），排除自己與指定 ids
 */
export async function getRelatedPosts(
  category: PostCategory,
  currentId: string,
  excludeIds: string[] = [],
  limit = 3,
): Promise<AdjacentPost[]> {
  const exclude = new Set([currentId, ...excludeIds])
  const { data, error } = await createPublicClient()
    .from('posts')
    .select('id, title, cover_image_url')
    .eq('category', category)
    .neq('id', currentId)
    .order('published_at', { ascending: false })
    .limit(limit + excludeIds.length)

  if (error) {
    console.error('Error fetching related posts:', error)
    return []
  }

  return (data ?? [])
    .filter((row) => !exclude.has(row.id))
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      title: row.title,
      coverImageUrl: row.cover_image_url,
    }))
}

/**
 * 根據分類獲取已發布文章
 */
export async function getPostsByCategory(
  category: PostCategory,
): Promise<Post[]> {
  const { data, error } = await createPublicClient()
    .from('posts')
    .select(POST_SELECT)
    .eq('category', category)
    .order('published_at', { ascending: false })

  if (error) {
    console.error('Error fetching posts by category:', error)
    throw new Error('無法獲取分類文章')
  }

  return (data as SupabasePostRow[]).map(rowToPost)
}

/**
 * 取得文章摘要
 * @param markdown - 文章內容
 * @param maxLength - 摘要最大長度
 * @returns 文章摘要
 */
export function getPostExcerpt(
  markdown: string,
  maxLength: number = 150,
): string {
  const plainText = markdown
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/!\[.*?\]\(.+?\)/g, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/^\s*>\s+/gm, '')
    .replace(/---/g, '')
    .trim()
  return plainText.length > maxLength
    ? plainText.substring(0, maxLength) + '...'
    : plainText
}

/**
 * 獲取單篇已發布文章
 */
export async function getPostById(postId: string): Promise<Post | null> {
  return findPost(createPublicClient(), postId)
}

/**
 * 後台用：獲取所有文章，含草稿（admin client，呼叫前須先 requireDashboardAccess('news')）
 */
export async function getDashboardPosts(): Promise<Post[]> {
  const { data, error } = await createAdminClient()
    .from('posts')
    .select(POST_SELECT)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching dashboard posts:', error)
    throw new Error('無法獲取文章列表')
  }

  return (data as SupabasePostRow[]).map(rowToPost)
}

/**
 * 後台用：獲取單篇文章，含草稿（admin client，呼叫前須先 requireDashboardAccess('news')）
 */
export async function getDashboardPostById(postId: string): Promise<Post | null> {
  return findPost(createAdminClient(), postId)
}

async function findPost(
  supabase: ReturnType<typeof createPublicClient>,
  postId: string,
): Promise<Post | null> {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('id', postId)
    .maybeSingle()

  if (error) {
    console.error('Error fetching post:', error)
    throw new Error('無法獲取文章')
  }

  return data ? rowToPost(data as SupabasePostRow) : null
}

/**
 * 格式化時間顯示，支援 zh-TW / en-US 雙語輸出
 */
export function formatPostDate(
  timestamp: string,
  locale: Locale = 'zh-TW',
): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
  const isZh = locale.startsWith('zh')

  if (diffInHours < 1) {
    const mins = Math.floor(diffInHours * 60)
    return isZh
      ? `${mins} 分鐘前`
      : `${mins} ${mins === 1 ? 'minute' : 'minutes'} ago`
  } else if (diffInHours < 24) {
    const hours = Math.floor(diffInHours)
    return isZh
      ? `${hours} 小時前`
      : `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  } else if (diffInHours < 24 * 7) {
    const days = Math.floor(diffInHours / 24)
    return isZh ? `${days} 天前` : `${days} ${days === 1 ? 'day' : 'days'} ago`
  } else {
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }
}
