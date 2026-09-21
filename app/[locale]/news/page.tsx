import { Suspense } from 'react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import styles from './news.module.scss'

// utils
import { metadata } from '@/app/utils/metadata'
import { getAllPosts } from '@/app/utils/postService'
import { SerializedPost, serializePost } from '@/app/types/serialized'

// components
import Page from '@/app/components/page/Page'
import NewsPageClient from './NewsPageClient'
import Loading from '@/app/components/Loading/Loading'

// 重新整理時間
export const revalidate = 300

/**
 * [Server Component] 新聞頁面
 */
export default async function NewsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  setRequestLocale((await params).locale)
  const t = await getTranslations('News')
  let initialPosts: SerializedPost[] = []

  //* 載入文章資料
  try {
    const posts = await getAllPosts()
    initialPosts = posts.map(serializePost)
  } catch (error) {
    console.error('Error loading posts:', error)
    initialPosts = []
  }

  return (
    <Page
      style={styles.updateContainer}
      header={{
        title: t('title'),
        descriptions: [t('description')],
      }}
    >
      <Suspense fallback={<Loading />}>
        <NewsPageClient initialPosts={initialPosts} />
      </Suspense>
    </Page>
  )
}

//* Page Metadata
export async function generateMetadata() {
  const t = await getTranslations('News')

  return metadata({
    title: t('meta.title'),
    description: t('meta.description'),
    image: '/assets/image/metadata-backgrounds/update.webp',
    keywords: t('meta.keywords').split(','),
    url: '/news',
    category: 'news',
  })
}
