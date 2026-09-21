'use client'

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlay, faPause, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import styles from './Carousel.module.scss'

export interface CarouselSlide {
  id: string
  imageUrl: string
  alt: string
  /** 疊在圖上的文字內容，由 server 父層渲染後傳入，確保 SEO */
  content?: ReactNode
}

interface CarouselProps {
  slides: CarouselSlide[]
  /** CSS aspect-ratio 字串，預設 '16 / 9' */
  aspectRatio?: string
  /** 自動播放間隔 ms，0 = 停用自動播放，預設 5000 */
  autoPlayInterval?: number
  className?: string
}

/**
 * 通用圖片輪播元件（client）。
 *
 * 設計為 props 驅動，文字內容從外部以 ReactNode 傳入（`content`），
 * 由 server 父層 render 後注入，讓爬蟲可直接讀到所有 slide 的文字。
 * 所有 slide 一次全部渲染進 DOM（非虛擬化），避免 SEO 遺漏。
 */
export default function Carousel({
  slides,
  aspectRatio = '16 / 9',
  autoPlayInterval = 5000,
  className,
}: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const touchStartX = useRef<number | null>(null)

  const TICK = 50 // progress 更新頻率 ms

  const nextSlide = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % slides.length)
    setProgress(0)
  }, [slides.length])

  const prevSlide = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + slides.length) % slides.length)
    setProgress(0)
  }, [slides.length])

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
    setProgress(0)
  }

  // 自動播放與進度條：autoPlayInterval 為 0 時完全停用
  useEffect(() => {
    if (!autoPlayInterval || isPaused) return

    const startTime = Date.now()
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime
      setProgress(Math.min((elapsed / autoPlayInterval) * 100, 100))
      if (elapsed >= autoPlayInterval) nextSlide()
    }, TICK)

    return () => clearInterval(timer)
  }, [isPaused, currentIndex, nextSlide, autoPlayInterval])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const delta = touchStartX.current - e.changedTouches[0].clientX
    if (delta > 50) nextSlide()
    else if (delta < -50) prevSlide()
    touchStartX.current = null
  }

  return (
    <div
      className={`${styles.carousel} ${className ?? ''}`}
      style={{ '--aspect-ratio': aspectRatio } as React.CSSProperties}
    >
      <div
        className={styles.track}
        style={{
          transform: `translateX(calc(-1 * var(--current-index) * (var(--card-width) + var(--gap))))`,
          '--current-index': currentIndex,
        } as React.CSSProperties}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            className={styles.slide}
            aria-hidden={currentIndex !== i}
          >
            <div className={styles.imageWrapper}>
              <Image
                src={slide.imageUrl}
                alt={slide.alt}
                fill
                sizes="(max-width: 768px) 100vw, 1200px"
                style={{ objectFit: 'cover' }}
                priority={i === 0}
                quality={85}
              />
            </div>
            <div className={styles.overlay} />
            {slide.content && (
              <div className={styles.content}>{slide.content}</div>
            )}
          </div>
        ))}
      </div>

      <button
        className={`${styles.navButton} ${styles.prev}`}
        onClick={prevSlide}
        aria-label="Previous slide"
      >
        <FontAwesomeIcon icon={faChevronLeft} size="lg" />
      </button>
      <button
        className={`${styles.navButton} ${styles.next}`}
        onClick={nextSlide}
        aria-label="Next slide"
      >
        <FontAwesomeIcon icon={faChevronRight} size="lg" />
      </button>

      {/* 播放控制與指示點 */}
      <div className={styles.controls}>
        {autoPlayInterval > 0 && (
          <button
            className={styles.playPause}
            onClick={() => setIsPaused((p) => !p)}
            aria-label={isPaused ? 'Play' : 'Pause'}
          >
            <FontAwesomeIcon
              icon={isPaused ? faPlay : faPause}
              className={isPaused ? styles.playIcon : undefined}
            />
          </button>
        )}
        <div className={styles.dots} role="tablist">
          {slides.map((_, i) => (
            <div
              key={i}
              role="tab"
              aria-selected={i === currentIndex}
              aria-label={`Slide ${i + 1}`}
              tabIndex={0}
              className={`${styles.dot} ${i === currentIndex ? styles.active : ''}`}
              onClick={() => goToSlide(i)}
              onKeyDown={(e) => e.key === 'Enter' && goToSlide(i)}
            >
              {i === currentIndex && (
                <div
                  className={styles.progress}
                  style={{ width: `${progress}%`, transition: `width ${TICK}ms linear` }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
