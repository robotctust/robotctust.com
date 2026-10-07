import { UserProfile } from '../types/user'
import { createAdminClient } from './supabase/admin'
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
  content_markdown: string
  category: string
  cover_image_url: string | null
  author_id: string
  author_display_name: string
  created_at: string
  updated_at: string
  author: { display_name: string; username: string } | null
}

const POST_SELECT = '*, author:users!posts_author_id_fkey(display_name, username)' as const

function rowToPost(row: SupabasePostRow): Post {
  return {
    id: row.id,
    title: row.title,
    contentMarkdown: row.content_markdown,
    category: row.category as PostCategory,
    coverImageUrl: row.cover_image_url,
    authorId: row.author_id,
    authorDisplayName: row.author?.display_name || row.author_display_name,
    authorUsername: row.author?.username ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * 獲取所有文章（新到舊）
 * @param limit 只取最新幾篇，不給就全部
 */
export async function getAllPosts(limit?: number): Promise<Post[]> {
  const admin = createAdminClient()
  const query = admin
    .from('posts')
    .select(POST_SELECT)
    .order('created_at', { ascending: false })
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
 * 依時間線取得相鄰文章（older = 較早一篇，newer = 較新一篇）
 */
export async function getAdjacentPosts(
  createdAt: string,
): Promise<{ older: AdjacentPost | null; newer: AdjacentPost | null }> {
  const admin = createAdminClient()
  const [olderRes, newerRes] = await Promise.all([
    admin
      .from('posts')
      .select('id, title, cover_image_url')
      .lt('created_at', createdAt)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from('posts')
      .select('id, title, cover_image_url')
      .gt('created_at', createdAt)
      .order('created_at', { ascending: true })
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
  const admin = createAdminClient()
  const exclude = new Set([currentId, ...excludeIds])
  const { data, error } = await admin
    .from('posts')
    .select('id, title, cover_image_url')
    .eq('category', category)
    .neq('id', currentId)
    .order('created_at', { ascending: false })
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
 * 根據分類獲取文章
 */
export async function getPostsByCategory(
  category: PostCategory,
): Promise<Post[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('posts')
    .select(POST_SELECT)
    .eq('category', category)
    .order('created_at', { ascending: false })

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
 * 獲取單篇文章
 */
export async function getPostById(postId: string): Promise<Post | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
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
