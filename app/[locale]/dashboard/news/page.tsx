import { requireDashboardAccess } from '@/app/utils/dashboard/auth'
import NewsListClient from './NewsListClient'
import { getDashboardPosts } from '@/app/utils/postService'
import { cleanupEmptyDrafts } from '@/app/utils/dashboard/news'
import { serializePost } from '@/app/types/serialized'

export const metadata = { title: '新聞管理 | Dashboard' }

export default async function DashboardNewsPage() {
  await requireDashboardAccess('news')
  // 先清掉超過一天的空白草稿（按「新增」就會建立），再抓首屏資料
  await cleanupEmptyDrafts()
  const posts = await getDashboardPosts()
  return <NewsListClient initialPosts={posts.map(serializePost)} />
}
