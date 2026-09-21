import { Link } from '@/i18n/navigation'
import styles from './JoinHook.module.scss'
import ScrollAnimation from '@/app/components/animation/ScrollAnimation/ScrollAnimation'
import { getTranslations } from 'next-intl/server'

/**
 * 招生 Hook：收尾的轉換區（一句有底氣的主張 + 支撐句 + 單一 CTA）。
 */
export default async function JoinHook() {
  const t = await getTranslations('About.hook')

  return (
    <section className={styles.hook}>
      <ScrollAnimation
        className={styles.inner}
        animation="fadeInUp"
        once={false}
      >
        <h2>{t('heading')}</h2>
        <p>{t('support')}</p>
        <Link href="/contact" className={styles.cta}>
          <span>{t('ctaLabel')}</span>
          <span aria-hidden="true">→</span>
        </Link>
      </ScrollAnimation>
    </section>
  )
}
