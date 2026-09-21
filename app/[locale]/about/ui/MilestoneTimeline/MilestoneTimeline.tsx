'use client'

import { useRef, useEffect } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faImage } from '@fortawesome/free-solid-svg-icons'
import styles from './MilestoneTimeline.module.scss'

interface Milestone {
  date: string
  title: string
  description: string
}

// index 與 i18n origin.timeline 對應；留空顯示佔位框。
// 新增照片：圖放 public/assets/image/about/milestones/，再把路徑填入對應位置。
const milestoneImages: string[] = ['', '', '', '', '']

/**
 * 里程碑時間軸：捲到此區時「定住」，改為橫向推進。
 *
 * 釘住用 CSS `position: sticky`（外層保留真實高度），GSAP 只負責橫向 scrub。
 * 這樣可避免 GSAP `pin` 在 flex 容器（.pageContainer 為 flex column）內
 * pin-spacer 不保留高度、導致下一段內容覆蓋時間線的問題。
 * reduced-motion 退化為原生橫向 swipe（CSS 處理）。
 */
export default function MilestoneTimeline() {
  const t = useTranslations('About.origin')
  const milestones = t.raw('timeline') as Milestone[]

  const outerRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const outer = outerRef.current
    const track = trackRef.current
    if (!outer || !track) return

    gsap.registerPlugin(ScrollTrigger)

    const mm = gsap.matchMedia()
    // 任何裝置都劫持；只在使用者要求 reduced-motion 時退化為原生橫向捲動
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // 需要橫移的距離 = 軌道總寬 − 視窗寬
      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth)
      // 外層保留「一個視窗高 + 橫移距離」的真實高度，sticky 才有空間釘住，
      // 也讓下一段內容自然排在外層之後（不會覆蓋）。
      const setHeight = () => {
        outer.style.height = `${window.innerHeight + distance()}px`
      }
      // 啟用劫持版面（CSS 以 .hijack 切換成 sticky；預設則是原生 swipe，無 JS 也安全）
      outer.classList.add(styles.hijack)
      setHeight()

      const tween = gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: outer,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1,
          invalidateOnRefresh: true,
          onRefresh: setHeight, // 視窗尺寸變動時重算高度
        },
      })

      return () => {
        tween.scrollTrigger?.kill()
        tween.kill()
        outer.style.height = ''
        outer.classList.remove(styles.hijack)
      }
    })

    return () => mm.revert()
  }, [milestones.length])

  return (
    <section ref={outerRef} className={styles.timeline}>
      <div className={styles.sticky}>
        <span className={styles.label}>{t('timelineLabel')}</span>
        <div ref={trackRef} className={styles.track}>
          {milestones.map((m, i) => (
            <article key={i} className={styles.card}>
              <div className={styles.media}>
                {milestoneImages[i] ? (
                  <Image
                    src={milestoneImages[i]}
                    alt=""
                    fill
                    sizes="(max-width: 600px) 80vw, 380px"
                    style={{ objectFit: 'cover' }}
                  />
                ) : (
                  <div className={styles.placeholder} aria-hidden="true">
                    <FontAwesomeIcon icon={faImage} />
                  </div>
                )}
              </div>
              <div className={styles.body}>
                <span className={styles.date}>{m.date}</span>
                <h3>{m.title}</h3>
                <p>{m.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
