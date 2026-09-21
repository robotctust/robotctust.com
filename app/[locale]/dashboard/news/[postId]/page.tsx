import { requireDashboardAccess } from '@/app/utils/dashboard/auth'
import { notFound } from 'next/navigation'
import NewsEditorClient from '../NewsEditorClient'
import { getPostById } from '@/app/utils/postService'
import { serializePost } from '@/app/types/serialized'

export const metadata = { title: '編輯文章 | Dashboard' }

export default async function EditNewsPage({
  params,
}: {
  params: Promise<{ postId: string }>
}) {
  await requireDashboardAccess('news')
  const { postId } = await params
  // 文章在伺服器抓好直接帶入編輯器，不必先顯示「載入中」再打 API
  const post = await getPostById(postId)
  if (!post) notFound()
  return <NewsEditorClient post={serializePost(post)} />
}
