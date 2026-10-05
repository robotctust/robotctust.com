'use client'

import React, { useRef, useEffect, type ElementType } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/** 一段隨捲動線性內插的範圍：[元素進入視窗底部時的值, 離開視窗頂部時的值] */
type Range = [number, number]

interface ScrollParallaxProps {
  children?: React.ReactNode
  /** translateY (px)。負值＝往上飄，可製造「前景比背景移動更快」的景深 */
  y?: Range
  /** translateX (px) */
  x?: Range
  /** 縮放倍率，如 [1, 1.25] */
  scale?: Range
  /** 不透明度，如 [1, 0.12]。避免落到 0，確保內容與 SEO 可見 */
  opacity?: Range
  /** ScrollTrigger 起點，預設 'top bottom'（元素頂端碰到視窗底部時開始） */
  start?: string
  /** ScrollTrigger 終點，預設 'bottom top'（元素底端離開視窗頂部時結束） */
  end?: string
  /** scrub 平滑度：true＝即時跟隨捲軸，數字＝延遲秒數。預設 true */
  scrub?: boolean | number
  /** 渲染的容器標籤，預設 'div'（可設 'span' 等以符合語意） */
  as?: ElementType
  className?: string
  style?: React.CSSProperties
}

/**
 * [component] 捲動連動視差元件
 *
 * 與 `ScrollAnimation`（進場一次性漸入）互補：本元件將 transform / opacity
 * 「綁定」到元素通過視窗的捲動進度（GSAP scrub），用於持續性的視差與景深。
 *
 * 設計重點：
 * - reduced-motion 在此集中處理一次：使用者要求減少動態時完全不套用任何 transform，
 *   內容停在原位且完整可見（不影響 SEO，爬蟲讀到的就是 server-render 的原始內容）。
 * - 清理交給 `mm.revert()`，會一併移除它建立的 tween 與 ScrollTrigger。
 *
 * @example
 * <ScrollParallax scale={[1, 1.25]} opacity={[1, 0.12]} y={[0, -60]}>
 *   <BigText />
 * </ScrollParallax>
 */
export default function ScrollParallax({
  children,
  y,
  x,
  scale,
  opacity,
  start = 'top bottom',
  end = 'bottom top',
  scrub = true,
  as: Tag = 'div',
  className,
  style,
}: ScrollParallaxProps) {
  const ref = useRef<HTMLElement>(null)

  // 以序列化的數值組成依賴，避免呼叫端傳入的 inline 陣列每次 render 都是新參考、
  // 導致 effect 反覆重建 ScrollTrigger（例如 CoreProjects 切換頁籤時）。
  const key = JSON.stringify({ y, x, scale, opacity, start, end, scrub })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // 沒有任何位移設定時不啟動，避免建立空的 ScrollTrigger
    if (!y && !x && !scale && !opacity) return

    gsap.registerPlugin(ScrollTrigger)

    // 尊重 prefers-reduced-motion：有無障礙需求時完全跳過動態
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // 由各範圍的起點 / 終點分別組出 fromTo 的兩端
      const fromVars: gsap.TweenVars = {}
      const toVars: gsap.TweenVars = {}
      if (y) [fromVars.y, toVars.y] = y
      if (x) [fromVars.x, toVars.x] = x
      if (scale) [fromVars.scale, toVars.scale] = scale
      if (opacity) [fromVars.opacity, toVars.opacity] = opacity

      gsap.fromTo(el, fromVars, {
        ...toVars,
        ease: 'none',
        willChange: 'transform',
        scrollTrigger: {
          trigger: el,
          start,
          end,
          scrub,
          invalidateOnRefresh: true, // 視窗尺寸變動時重算
        },
      })
    })

    return () => mm.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return (
    <Tag ref={ref as React.Ref<HTMLElement>} className={className} style={style}>
      {children}
    </Tag>
  )
}
