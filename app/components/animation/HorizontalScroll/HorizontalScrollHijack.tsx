'use client'

import { useRef, useEffect, type ReactNode } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import styles from './HorizontalScrollHijack.module.scss'

interface HorizontalScrollHijackProps {
  children: ReactNode
  /**
   * 區塊主標題（由 server 父層傳入以確保 SEO）。
   * 放在 sticky 容器內，劫持模式下固定顯示於視窗頂部，與內容一起出現；
   * 退化模式（mobile/reduced-motion）則作為普通 block 排在 track 上方。
   */
  heading?: ReactNode
  /** 小字輔助標籤（如「課程旅程」），留空則不渲染 */
  label?: ReactNode
  className?: string
}

/**
 * 捲動劫持式橫向推進包裝（client）。
 *
 * 外層保留「視窗高 + 橫移距離」的真實高度，讓 CSS sticky 有空間釘住，
 * 同時確保下一段內容自然排在外層之後不會覆蓋。GSAP 只負責橫向 scrub；
 * 所有版面高度計算都在 JS 端完成（onRefresh 視窗尺寸變動時重算）。
 *
 * 焦點高亮：
 * - hijack 模式：GSAP onUpdate 根據 progress 算出 active index → 設 style.opacity
 * - swipe 模式：scroll 事件找最接近 track 中心的 item → 設 style.opacity
 * CSS 只負責 transition，值由 JS 驅動。
 *
 * 退化策略（無 JS / prefers-reduced-motion）：
 * 外層不加 `.hijack`，track 維持原生 overflow-x + scroll-snap，
 * 不依賴 JS 也能正常使用。
 */
export default function HorizontalScrollHijack({
  children,
  heading,
  label,
  className,
}: HorizontalScrollHijackProps) {
  const outerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const outer = outerRef.current
    const track = trackRef.current
    if (!outer || !track) return

    // 只取真正的項目；標記 data-hsh-decoration 的元素（如 ConnectingPath）排除在外
    const items = (Array.from(track.children) as HTMLElement[]).filter(
      (el) => !el.dataset.hshDecoration,
    )

    // 將指定 index 的 item 設為亮起，其餘降低透明度
    const setActive = (idx: number) => {
      items.forEach((item, i) => {
        item.style.opacity = i === idx ? '1' : '0.38'
      })
    }

    // 初始：第一個 item 亮起
    setActive(0)

    gsap.registerPlugin(ScrollTrigger)

    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // 需要橫移的距離 = 軌道總寬 − 視窗寬
      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth)

      // 外層保留真實高度，sticky 才有捲動空間
      const setHeight = () => {
        outer.style.height = `${window.innerHeight + distance()}px`
      }

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
          onRefresh: setHeight,
          onUpdate: (self) => {
            // 將 0-1 的捲動進度線性對應到 item index
            const idx = Math.min(
              Math.round(self.progress * (items.length - 1)),
              items.length - 1,
            )
            setActive(idx)
          },
        },
      })

      return () => {
        tween.scrollTrigger?.kill()
        tween.kill()
        outer.style.height = ''
        outer.classList.remove(styles.hijack)
        items.forEach((item) => {
          item.style.opacity = ''
        })
      }
    })

    // 原生 swipe 模式：找最接近 track 中心的 item 並高亮
    const handleScroll = () => {
      const center = track.scrollLeft + track.clientWidth / 2
      let activeIdx = 0
      let minDist = Infinity
      items.forEach((item, i) => {
        const dist = Math.abs(item.offsetLeft + item.offsetWidth / 2 - center)
        if (dist < minDist) {
          minDist = dist
          activeIdx = i
        }
      })
      setActive(activeIdx)
    }

    track.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      mm.revert()
      track.removeEventListener('scroll', handleScroll)
      items.forEach((item) => {
        item.style.opacity = ''
      })
    }
  }, [])

  return (
    <div ref={outerRef} className={`${styles.outer} ${className ?? ''}`}>
      <div className={styles.sticky}>
        {heading && <div className={styles.heading}>{heading}</div>}
        {label && <span className={styles.label}>{label}</span>}
        <div ref={trackRef} className={styles.track}>
          {children}
        </div>
      </div>
    </div>
  )
}
