import React from 'react'
import { Metadata } from 'next'
import styles from './CompetitionsDetail.module.scss'
// components
import Page from '@/app/components/page/Page'
import CompetitionDetail from './CompetitionsDetail'
// utils
import { metadata, formatDateTimeToISO } from '@/app/utils/metadata'
import { getAllCompetitions } from '@/app/utils/competitionService'
import { getTranslations } from 'next-intl/server'
// types
import { Competition } from '@/app/types/competition'

interface CompetitionDetailProps {
  params: Promise<{
    slug: string
  }>
}

// 靜態快取；後台同步競賽後會即時清（api/dashboard/competitions/sync）
export const revalidate = 300

/**
 * [Function] 競賽詳細頁面靜態參數
 * @returns
 */
export async function generateStaticParams() {
  const competitions = await getAllCompetitions()
  return competitions.map((competition: Competition) => ({
    slug: competition.id,
  }))
}

/**
 * [Page] 競賽詳細頁面
 * @param params 參數
 * @returns
 */
export default async function CompetitionDetailPage({
  params,
}: CompetitionDetailProps) {
  const { slug } = await params

  // 獲取所有競賽資料
  const competitions = await getAllCompetitions()

  // 根據 slug 找到對應的競賽
  const competition = competitions.find((comp) => comp.id === slug)

  // 如果找不到競賽，返回 404 頁面
  if (!competition) {
    return (
      <Page>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h1>競賽不存在</h1>
          <p>找不到 ID 為 {slug} 的競賽。</p>
        </div>
      </Page>
    )
  }

  return (
    <Page style={styles.competitionDetail}>
      <CompetitionDetail competition={competition} />
    </Page>
  )
}

/**
 * [Function] 競賽詳細頁面 metadata
 * @param params 參數
 * @returns
 */
export async function generateMetadata({
  params,
}: CompetitionDetailProps): Promise<Metadata> {
  const { slug } = await params
  const t = await getTranslations('Competitions')
  const competitions = await getAllCompetitions()
  const competition = competitions.find((comp) => comp.id === slug)

  const title = competition
    ? t('meta.detail.titleTemplate', { title: competition.title })
    : t('meta.detail.titleFallback', { slug })

  const description = competition
    ? competition.description
    : t('meta.detail.descriptionFallback', { slug })

  return metadata({
    title,
    description,
    keywords: [
      t('meta.detail.keywordDetail'),
      slug,
      t('meta.detail.keywordInfo'),
      ...(competition?.tags || []),
    ],
    image:
      competition?.image ||
      '/assets/icons/web-icon/robotctust-web-icon-1024.png',
    url: `/competitions/${slug}`,
    type: 'article',
    publishedTime: formatDateTimeToISO(competition?.createdAt),
    modifiedTime: formatDateTimeToISO(competition?.updatedAt),
    category: 'competition-detail',
  })
}
