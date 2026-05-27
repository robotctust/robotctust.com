'use client'

import React, { useRef, useState } from 'react'
import styles from './MarkdownRenderer.module.scss'
// icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'

/**
 * 圖片輪播（client island）：一次顯示一張圖片，透過左右按鈕或觸控滑動切換上下張，
 * 下方圓點顯示總張數與目前位置。
 *
 * children 為 server 端已渲染好的圖片節點（span.imageWrapper），
 * 以「client 元件接收 server children」的模式跨邊界傳入，互動邏輯只在 client 執行。
 */
const ImageCarousel: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const slides = React.Children.toArray(children)
  const count = slides.length
  const [index, setIndex] = useState(0)

  // 觸控滑動：記錄起始觸點
  const touchStartX = useRef<number | null>(null)
  // 觸發切換的最小水平位移（px），避免輕觸誤判
  const SWIPE_THRESHOLD = 50

  // 理論上只會在 >= 2 張時使用，單張時保險直接渲染
  if (count <= 1) {
    return <>{children}</>
  }

  // 循環切換（環狀）
  const goTo = (i: number) => setIndex((i + count) % count)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(deltaX) >= SWIPE_THRESHOLD) {
      // 向左滑（deltaX < 0）看下一張，向右滑看上一張
      goTo(deltaX < 0 ? index + 1 : index - 1)
    }
    touchStartX.current = null
  }

  return (
    <div className={styles.carousel}>
      <div
        className={styles.carouselViewport}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className={styles.carouselTrack}
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((slide, i) => (
            <div className={styles.carouselSlide} key={i}>
              {slide}
            </div>
          ))}
        </div>

        <button
          type="button"
          className={`${styles.carouselArrow} ${styles.carouselArrowPrev}`}
          onClick={() => goTo(index - 1)}
          aria-label="上一張"
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <button
          type="button"
          className={`${styles.carouselArrow} ${styles.carouselArrowNext}`}
          onClick={() => goTo(index + 1)}
          aria-label="下一張"
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>

      <div className={styles.carouselDots}>
        {slides.map((_, i) => (
          <button
            type="button"
            key={i}
            className={`${styles.carouselDot} ${
              i === index ? styles.carouselDotActive : ''
            }`}
            onClick={() => goTo(i)}
            aria-label={`第 ${i + 1} 張，共 ${count} 張`}
            aria-current={i === index}
          />
        ))}
      </div>
    </div>
  )
}

export default ImageCarousel
