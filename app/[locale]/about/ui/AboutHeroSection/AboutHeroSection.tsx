import styles from './AboutHeroSection.module.scss'
import ScrollAnimation from '@/app/components/animation/ScrollAnimation/ScrollAnimation'
import { getTranslations } from 'next-intl/server'

/**
 * 關於頁面 Hero 區域（極簡：標語 + 一句副標，直接導入下一區）
 */
export default async function AboutHeroSection() {
  const t = await getTranslations('About.hero')

  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        <ScrollAnimation
          className={styles.headline}
          animation="fadeInUp"
          delay={0}
          once
        >
          <h1>{t('title')}</h1>
        </ScrollAnimation>
        <ScrollAnimation
          className={styles.subtitle}
          animation="fadeInUp"
          delay={120}
          once
        >
          <p>{t('subtitle')}</p>
        </ScrollAnimation>
      </div>
    </section>
  )
}
