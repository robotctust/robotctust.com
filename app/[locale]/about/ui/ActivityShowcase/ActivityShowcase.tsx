'use client'

import { useRef, useEffect } from 'react'
import Image from 'next/image'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faImage } from '@fortawesome/free-solid-svg-icons'
import { SITE_CONFIG } from '@/app/utils/siteConfigs'
import styles from './ActivityShowcase.module.scss'

/**
 * 活動照片牆：每排不同比例的圖格，隨捲動輕微左右漂移（視差）。
 * 圖存放在 R2 的 about/activity/，檔號對應 rows 的出現順序。
 */
type Tile = { ratio: number; src: string }

const MEDIA = `${SITE_CONFIG.mediaBase}/about/activity`

// src 留空時顯示佔位框；比例設計讓各排視覺上高度一致但寬度各異
const rows: Tile[][] = [
  [
    { ratio: 16 / 9,  src: `${MEDIA}/01.webp` },
    { ratio: 1,       src: `${MEDIA}/02.webp` },
    { ratio: 4 / 3,   src: `${MEDIA}/03.webp` },
    { ratio: 3 / 4,   src: `${MEDIA}/04.webp` },
    { ratio: 16 / 10, src: `${MEDIA}/05.webp` },
  ],
  [
    { ratio: 3 / 4,   src: `${MEDIA}/06.webp` },
    { ratio: 16 / 9,  src: `${MEDIA}/07.webp` },
    { ratio: 1,       src: `${MEDIA}/08.webp` },
    { ratio: 4 / 3,   src: `${MEDIA}/09.webp` },
    { ratio: 4 / 5,   src: `${MEDIA}/10.webp` },
  ],
  [
    { ratio: 4 / 3,   src: `${MEDIA}/11.webp` },
    { ratio: 3 / 4,   src: `${MEDIA}/12.webp` },
    { ratio: 16 / 9,  src: `${MEDIA}/13.webp` },
    { ratio: 1,       src: `${MEDIA}/14.webp` },
    { ratio: 16 / 10, src: `${MEDIA}/15.webp` },
  ],
]

// 奇數排往左、偶數排往右，交錯方向讓視差更有立體感
const drift = [-1, 1, -1]

export default function ActivityShowcase() {
  const sectionRef = useRef<HTMLElement>(null)
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    gsap.registerPlugin(ScrollTrigger)

    // 任何裝置都做漂移；只在使用者要求 reduced-motion 時關閉
    // 尊重 prefers-reduced-motion：使用者有無障礙需求時完全跳過動態效果
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // 漂移幅度隨視窗寬度縮放，避免手機上飄太遠
      const AMOUNT = Math.min(90, Math.round(window.innerWidth * 0.12))
      rowRefs.current.forEach((row, i) => {
        if (!row) return
        const dir = drift[i] ?? (i % 2 ? 1 : -1)
        gsap.fromTo(
          row,
          { x: -AMOUNT * dir },
          {
            x: AMOUNT * dir,
            ease: 'none',
            scrollTrigger: {
              trigger: section,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          },
        )
      })
    })

    // mm.revert() 會一併清除它建立的所有 tween 與 ScrollTrigger
    return () => mm.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      className={styles.showcase}
      aria-label="社團活動照片"
    >
      {rows.map((row, ri) => (
        <div
          key={ri}
          ref={(el) => {
            rowRefs.current[ri] = el
          }}
          className={styles.row}
        >
          {row.map((tile, ti) => (
            <div
              key={ti}
              className={styles.tile}
              style={{ aspectRatio: String(tile.ratio) }}
            >
              {tile.src ? (
                <Image
                  src={tile.src}
                  alt=""
                  fill
                  sizes="(max-width: 600px) 50vw, 30vw"
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <div className={styles.placeholder} aria-hidden="true">
                  <FontAwesomeIcon icon={faImage} />
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </section>
  )
}
