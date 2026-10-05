import styles from './OriginSection.module.scss'
import ScrollAnimation from '@/app/components/animation/ScrollAnimation/ScrollAnimation'
import { getTranslations } from 'next-intl/server'

/**
 * 創立起源（故事，統一左對齊）；時間軸由 MilestoneTimeline 接在下方。
 */
export default async function OriginSection() {
  const t = await getTranslations('About.origin')

  return (
    <section className={styles.origin}>
      <div className={styles.inner}>
        <ScrollAnimation
          className={styles.heading}
          animation="fadeInUp"
          once={false}
        >
          <h2>{t('heading')}</h2>
        </ScrollAnimation>
        <ScrollAnimation
          className={styles.paragraph}
          animation="fadeInUp"
          delay={60}
          once={false}
        >
          <p>{t('paragraph1')}</p>
        </ScrollAnimation>
        <ScrollAnimation
          className={styles.paragraph}
          animation="fadeInUp"
          delay={100}
          once={false}
        >
          <p>{t('paragraph2')}</p>
        </ScrollAnimation>
      </div>
    </section>
  )
}
