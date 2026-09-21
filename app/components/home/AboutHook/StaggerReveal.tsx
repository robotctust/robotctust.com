'use client'

import { useRef, useEffect, type ReactNode } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

interface StaggerRevealProps {
  children: ReactNode
  className?: string
}

/**
 * [component] 整塊模糊浮現：容器本身隨捲動進度做 blur + 上移（scrub）。
 *
 * 進度無級綁定捲軸位置，往回捲即往回收。
 *
 * - reduced-motion：完全不啟動 GSAP，停在自然狀態（完整可見）。
 * - SSR/SEO：children 照常 server-render 進 HTML，GSAP 僅在掛載後接管。
 * - 清理交給 mm.revert()，一併移除 tween 與 ScrollTrigger。
 */
export default function StaggerReveal({
  children,
  className,
}: StaggerRevealProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    gsap.registerPlugin(ScrollTrigger)

    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from(el, {
        opacity: 0,
        y: 60,
        filter: 'blur(14px)',
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          end: 'top 50%',
          scrub: true,
          invalidateOnRefresh: true,
        },
      })
    })

    return () => mm.revert()
  }, [])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
