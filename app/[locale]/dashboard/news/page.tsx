import { requireDashboardAccess } from '@/app/utils/dashboard/auth'
import NewsListClient from './NewsListClient'
import { getAllPosts } from '@/app/utils/postService'
import { serializePost } from '@/app/types/serialized'

export const metadata = { title: '新聞管理 | Dashboard' }

export default async function DashboardNewsPage() {
  await requireDashboardAccess('news')
  // 首屏資料在伺服器抓好，不必等瀏覽器載完 JS 再打 API
  const posts = await getAllPosts()
  return <NewsListClient initialPosts={posts.map(serializePost)} />
}
