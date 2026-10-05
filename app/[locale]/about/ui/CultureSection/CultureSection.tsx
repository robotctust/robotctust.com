import styles from './CultureSection.module.scss'
import ScrollAnimation from '@/app/components/animation/ScrollAnimation/ScrollAnimation'
import Marquee from '@/app/components/home/Marquee/Marquee'
import { getTranslations } from 'next-intl/server'

/**
 * 文化與理念：理念 tag 跑馬燈 + 大字「我們相信…」主張（不用卡片）。
 */
export default async function CultureSection() {
  const t = await getTranslations('About.culture')
  const tags = t.raw('marqueeTags') as string[]
  const beliefs = t.raw('beliefs') as string[]

  return (
    <section className={styles.culture}>
      <div className={styles.marquee}>
        <Marquee items={[tags]} speed={26} />
      </div>

      <div className={styles.inner}>
        <ScrollAnimation
          className={styles.heading}
          animation="fadeInUp"
          once={false}
        >
          <h2>{t('heading')}</h2>
        </ScrollAnimation>

        <div className={styles.beliefs}>
          {beliefs.map((belief, i) => (
            <ScrollAnimation
              key={i}
              className={styles.belief}
              animation="fadeInUp"
              delay={i * 90}
              once={false}
            >
              <p>{belief}</p>
            </ScrollAnimation>
          ))}
        </div>
      </div>
    </section>
  )
}
