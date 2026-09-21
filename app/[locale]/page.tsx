import { Suspense } from 'react'
import styles from './home.module.scss'
import { getTranslations, setRequestLocale } from 'next-intl/server'

// components
import Page from '@/app/components/page/Page'
import Footer from '@/app/components/Footer/Footer'
import HeroSection from '@/app/components/HeroSection/HeroSection'
import ClubFeaturesSection from '@/app/components/home/ClubFeaturesSection'
import CoreProjects from '@/app/components/home/CoreProjects/CoreProjects'
import LatestUpdatesSection from '@/app/components/home/LatestUpdatesSection'
import Loading from '@/app/components/Loading/Loading'
import Marquee from '@/app/components/home/Marquee/Marquee'
import CourseJourney from '@/app/components/home/CourseJourney/CourseJourney'
import AboutHook from '@/app/components/home/AboutHook/AboutHook'
import ScrollAnimation from '@/app/components/animation/ScrollAnimation/ScrollAnimation'

// utils
import { metadata } from '@/app/utils/metadata'

// icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBullseye } from '@fortawesome/free-solid-svg-icons'

// 靜態快取，最新資訊每 5 分鐘更新；後台改文章時會即時清（app/action/revalidate.ts）
export const revalidate = 300

/**
 * 首頁
 */
export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  setRequestLocale((await params).locale)
  const t = await getTranslations('Home')

  return (
    <Page
      style={styles.homeContainer}
      maxWidth="none"
      backgroundGrid={true}
      mouseDynamicGlow={true}
      config={{
        paddingBottom: false,
      }}
    >
      <HeroSection />
      <OurMissionSection />
      <CoreProjects />
      <Marquee
        items={[
          [
            'Robotics',
            'AI',
            'IoT',
            'Arduino',
            'ESP32',
            'Raspberry Pi',
            'Micro:bit',
          ],
          ['Next.js', 'SwiftUI', 'React', 'Swift', 'Python', 'Java', 'C++'],
          [t('Marquee.keywords.lineFollowing'), t('Marquee.keywords.obstacleAvoidance'), t('Marquee.keywords.pathPlanning'), t('Marquee.keywords.robotArm'), t('Marquee.keywords.autonomousCar')],
        ]}
        speed={60}
      />
      <ClubFeaturesSection />
      <CourseJourney />
      <AboutHook />

      <Suspense fallback={<Loading />}>
        <LatestUpdatesSection />
      </Suspense>

      {/* <Suspense fallback={<Loading />}>
        <UpcomingCompetitionsSection />
      </Suspense> */}
      <Footer />
    </Page>
  )
}

// 我們的使命
const OurMissionSection = async () => {
  const t = await getTranslations('Home.OurMission')

  return (
    <section className={styles.ourMissionSection}>
      <div className={styles.container}>
        <FontAwesomeIcon icon={faBullseye} className={styles.missionIcon} />
        <ScrollAnimation animation="fadeInUp" once={false}>
          <h1>{t('title')}</h1>
        </ScrollAnimation>
        <ScrollAnimation
          animation="fadeInUp"
          delay={50}
          once={false}
          threshold={0.4}
        >
          <p>{t('description')}</p>
        </ScrollAnimation>
      </div>
    </section>
  )
}

export async function generateMetadata() {
  const t = await getTranslations('Index')

  return metadata({
    title: t('webTitle'),
    description: t('description'),
    keywords: ['首頁', '主頁', '官方網站'],
    image: '/assets/image/metadata-backgrounds/global.webp',
    url: '/',
    type: 'website',
    category: 'home',
  })
}
