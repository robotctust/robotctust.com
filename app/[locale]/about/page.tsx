import styles from './about.module.scss'
import Page from '@/app/components/page/Page'
import Footer from '@/app/components/Footer/Footer'
import { metadata } from '@/app/utils/metadata'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import AboutHeroSection from './ui/AboutHeroSection/AboutHeroSection'
import ActivityShowcase from './ui/ActivityShowcase/ActivityShowcase'
import OriginSection from './ui/OriginSection/OriginSection'
import MilestoneTimeline from './ui/MilestoneTimeline/MilestoneTimeline'
import CultureSection from './ui/CultureSection/CultureSection'
import JoinHook from './ui/JoinHook/JoinHook'
import ClubOfficer from './ui/ClubOfficer/ClubOfficer'

// 靜態快取，幹部頭像每 5 分鐘更新
export const revalidate = 300

export default async function About({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  setRequestLocale((await params).locale)
  return (
    <Page
      style={styles.aboutContainer}
      maxWidth="none"
      backgroundGrid
      mouseDynamicGlow
      config={{ paddingBottom: false }}
    >
      <AboutHeroSection />
      <ActivityShowcase />
      <OriginSection />
      <MilestoneTimeline />
      <CultureSection />
      <JoinHook />
      <ClubOfficer />
      <Footer />
    </Page>
  )
}

export async function generateMetadata() {
  const t = await getTranslations('About')
  return metadata({
    title: t('meta.title'),
    description: t('meta.description'),
    keywords: t('meta.keywords').split(','),
    url: '/about',
    image: '/assets/image/metadata-backgrounds/about.webp',
    category: 'about',
  })
}
