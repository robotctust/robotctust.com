'use server'

import { revalidatePath } from 'next/cache'

/**
 * 後台新增/編輯/刪除文章後清快取：首頁（最新資訊）、新聞列表、新聞內頁。
 * 要用路由樣式 '/[locale]/…'，寫實際網址（'/news'）清不到 zh-TW——
 * 它經 middleware rewrite 後內部路徑是 /zh-TW/news。
 */
export async function revalidateUpdatePage() {
  try {
    revalidatePath('/[locale]', 'page')
    revalidatePath('/[locale]/news', 'page')
    // 內頁整組清掉，含被刪除的那篇
    revalidatePath('/[locale]/news/[slug]', 'page')

    return {
      success: true,
      message: 'News pages revalidated successfully',
    }
  } catch (error) {
    console.error('Error revalidating news pages:', error)
    throw new Error('Error revalidating news pages: ' + String(error))
  }
}
