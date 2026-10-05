import React, { use } from 'react'
import { Metadata } from 'next'
import styles from './schedules.module.scss'
import Page from '@/app/components/page/Page'
import SchedulesClient from './SchedulesClient'
import { metadata } from '@/app/utils/metadata'
import { useTranslations } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'

function Schedules({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  setRequestLocale(use(params).locale)
  const t = useTranslations('Calendar')

  return (
    <Page
      style={styles.schedulesContainer}
      maxWidth="1200px"
      header={{
        title: t('title'),
        descriptions: [t('descriptions.0'), t('descriptions.1')],
      }}
    >
      <SchedulesClient />
    </Page>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Calendar')

  return metadata({
    title: t('meta.title'),
    description: t('meta.description'),
    image: '/assets/image/metadata-backgrounds/calendar.webp',
    keywords: t('meta.keywords').split(','),
    url: '/calendar',
    category: 'calendar',
  })
}

export default Schedules
