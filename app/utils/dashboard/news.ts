import { createAdminClient } from '@/app/utils/supabase/admin'
import { deleteMediaPrefix } from '@/app/utils/media/r2'
import { isEmptyContent } from '@/app/components/RichText/content'
import type { JSONContent } from '@tiptap/core'

/** 空白草稿保留多久才清除（按「新增」就會先建一篇，沒寫就離開會留下來） */
const EMPTY_DRAFT_TTL_MS = 24 * 60 * 60 * 1000

/**
 * 清除超過一天、從沒發布過且完全空白（無標題、封面、內文）的草稿，連同它的圖片資料夾。
 * 在後台文章列表載入時呼叫。使用 service-role client，呼叫前必須先通過 requireDashboardAccess('news')。
 */
export async function cleanupEmptyDrafts(): Promise<void> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('posts')
    .select('id, media_key, content')
    .eq('status', 'draft')
    .is('published_at', null)
    .eq('title', '')
    .is('cover_image_url', null)
    .lt('updated_at', new Date(Date.now() - EMPTY_DRAFT_TTL_MS).toISOString())
  if (error) {
    console.error('Failed to list empty drafts', error)
    return
  }

  const empty = (data as { id: string; media_key: string; content: JSONContent | null }[]).filter((row) =>
    isEmptyContent(row.content),
  )
  if (empty.length === 0) return

  const { error: deleteError } = await admin
    .from('posts')
    .delete()
    .in(
      'id',
      empty.map((row) => row.id),
    )
  if (deleteError) {
    console.error('Failed to delete empty drafts', deleteError)
    return
  }
  // 內文是空的，但可能上傳過又刪掉的圖片還在資料夾裡
  await Promise.all(empty.map((row) => deleteMediaPrefix(`posts/${row.media_key}/`).catch(console.error)))
}
