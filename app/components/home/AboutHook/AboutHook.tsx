import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import styles from './AboutHook.module.scss'
import StaggerReveal from './StaggerReveal'
import ScrollParallax from '@/app/components/animation/ScrollParallax/ScrollParallax'
import { SITE_CONFIG } from '@/app/utils/siteConfigs'

const MEDIA = `${SITE_CONFIG.mediaBase}/home/about-hook`

/**
 * 懸浮裝飾圖：散落在卡片上下緣、隨捲動輕微上下漂移，並與整塊一起模糊淡入。
 * 圖存放在 R2 的 home/about-hook/，檔號對應 floats 的出現順序。
 *
 * 設計：以卡片寬度置中錨定（translateX(-50%)+left%）、尺寸 clamp 響應式 → 窄螢幕不溢出；
 * 只放上/下緣、pointer-events:none 不擋互動；位置/尺寸/比例/旋轉/漂移各異以營造隨意感。
 * 數值皆可自由微調。
 */
type FloatSpec = {
  edge: 'top' | 'bottom'
  left: string
  size: string // styles.fS | fM | fL
  ratio: string // styles.arP | arL | arS
  rotate: number // deg
  drift: [number, number] // ScrollParallax y 範圍 [進場, 離場] (px)
  src: string
}

const floats: FloatSpec[] = [
  {
    edge: 'top',
    left: '3%',
    size: styles.fM,
    ratio: styles.arL,
    rotate: -6,
    drift: [-28, 18],
    src: `${MEDIA}/01.webp`,
  },
  {
    edge: 'top',
    left: '30%',
    size: styles.fS,
    ratio: styles.arS,
    rotate: 5,
    drift: [-34, 12],
    src: `${MEDIA}/02.webp`,
  },
  {
    edge: 'top',
    left: '62%',
    size: styles.fL,
    ratio: styles.arL,
    rotate: 7,
    drift: [-20, 26],
    src: `${MEDIA}/03.webp`,
  },
  {
    edge: 'top',
    left: '95%',
    size: styles.fS,
    ratio: styles.arL,
    rotate: -4,
    drift: [-30, 16],
    src: `${MEDIA}/04.webp`,
  },
  {
    edge: 'bottom',
    left: '13%',
    size: styles.fL,
    ratio: styles.arL,
    rotate: 6,
    drift: [24, -28],
    src: `${MEDIA}/05.webp`,
  },
  {
    edge: 'bottom',
    left: '49%',
    size: styles.fM,
    ratio: styles.arL,
    rotate: -7,
    drift: [18, -32],
    src: `${MEDIA}/06.webp`,
  },
  {
    edge: 'bottom',
    left: '82%',
    size: styles.fM,
    ratio: styles.arS,
    rotate: 4,
    drift: [28, -18],
    src: `${MEDIA}/07.webp`,
  },
]

/**
 * 從首頁課程旅程引導使用者前往 /about 深入了解社團的過渡鉤子。
 * 進場：整塊（卡片＋懸浮圖）隨捲動以 blur+上移淡入（見 StaggerReveal）；
 * 懸浮圖另以 ScrollParallax 做隨捲動的微漂移。
 */
export default async function AboutHook() {
  const t = await getTranslations('Home.AboutHook')

  return (
    <section className={styles.hook}>
      <StaggerReveal className={styles.inner}>
        <div className={styles.text}>
          <h2>{t('heading')}</h2>
          <p>{t('support')}</p>
        </div>
        <Link href="/about" className={styles.cta}>
          <span>{t('ctaLabel')}</span>
          <span aria-hidden="true">→</span>
        </Link>

        {floats.map((f, i) => (
          <ScrollParallax
            key={i}
            className={`${styles.float} ${f.edge === 'top' ? styles.edgeTop : styles.edgeBottom}`}
            style={{ left: f.left }}
            y={f.drift}
          >
            <span
              className={`${styles.floatTilt} ${f.size} ${f.ratio}`}
              style={{ transform: `translateX(-50%) rotate(${f.rotate}deg)` }}
            >
              {f.src ? (
                <Image
                  src={f.src}
                  alt=""
                  fill
                  sizes="200px"
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <span className={styles.floatPlaceholder} aria-hidden="true" />
              )}
            </span>
          </ScrollParallax>
        ))}
      </StaggerReveal>
    </section>
  )
}
