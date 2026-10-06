import Img from '@/app/components/Img/Img'
import { getTranslations } from 'next-intl/server'
import styles from './HeroSection.module.scss'
import ScrollAnimation from '@/app/components/animation/ScrollAnimation/ScrollAnimation'

/**
 * 首頁主視覺區域
 */
export default async function HeroSection() {
  const t = await getTranslations('Home.HeroSection')
  const tIndex = await getTranslations('Index')

  return (
    <section className={styles.heroSection}>
      <div className={styles.firstRow}>
        <ScrollAnimation animation="fadeInUp" once={false}>
          <Img
            src="/assets/image/home/robotctust-home-image.webp"
            alt={tIndex('title')}
            width={96}
            height={96}
            className={styles.homeImage}
          />
        </ScrollAnimation>
        <ScrollAnimation animation="fadeInUp" delay={50} once={false}>
          <p className={styles.clubName}>
            {tIndex('schoolClubName')}
          </p>
        </ScrollAnimation>
        <ScrollAnimation animation="fadeInUp" delay={100} once={false}>
          <h1>
            {t('titles.1')}
            <br />
            {t('titles.2')}<span className="nowrap">{t('titles.3')}</span>
          </h1>
        </ScrollAnimation>
        <ScrollAnimation animation="fadeInUp" delay={200} once={false}>
          <p>
            {t('subtitles.1')}<span className="nowrap">{t('subtitles.2')}</span>
            <span className="nowrap">{t('subtitles.3')}</span>
          </p>
        </ScrollAnimation>
      </div>
      <ScrollAnimation
        animation="zoomIn"
        className={styles.floatingText}
        once={false}
      >
        <span>
          <span className="nowrap">ROBOT</span>
          <span className="nowrap">CTUST</span>
        </span>
      </ScrollAnimation>
    </section>
  )
}
