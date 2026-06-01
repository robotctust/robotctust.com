'use client'

import React, { useRef } from 'react'
import { useSpring, animated } from '@react-spring/web'
import { Link } from '@/i18n/navigation'

/**
 * TiltCard 組件的屬性介面
 * @interface TiltCardProps
 */
export interface TiltCardProps {
  /**
   * 子元素，通常是卡片的內容
   */
  children: React.ReactNode
  /**
   * 自定義的 CSS 類名
   */
  className?: string
  /**
   * 連結網址，若提供則卡片會變成連結
   */
  href?: string
  /**
   * 彈簧動畫的質量 (Mass)
   * @default 1
   */
  mass?: number
  /**
   * 彈簧動畫的張力 (Tension)
   * @default 200
   */
  tension?: number
  /**
   * 彈簧動畫的摩擦力 (Friction)
   * @default 35
   */
  friction?: number
  /**
   * 滑鼠懸停時的縮放比例
   * @default 1.05
   */
  scale?: number
  /**
   * 旋轉靈敏度係數 (數值越大，旋轉幅度越小)
   * @default 35
   */
  rotationFactor?: number
  /**
   * 透視距離 (Perspective) px
   * @default 1000
   */
  perspective?: number
}

// 建立可動畫的 Link 組件
const AnimatedLink = animated(Link)

/**
 * TiltCard 3D 傾斜卡片組件
 *
 * 這是一個通用的包裝組件，提供滑鼠跟隨的 3D 傾斜效果。
 * 使用 react-spring 處理平滑的物理動畫。
 * 若提供 href 屬性，則會渲染為 next/link 連結。
 *
 * @component
 * @example
 * ```tsx
 * <TiltCard
 *   scale={1.1}
 *   tension={170}
 *   friction={26}
 *   className="my-card"
 * >
 *   <div>Card Content</div>
 * </TiltCard>
 * ```
 */
export const TiltCard = ({
  children,
  className,
  href,
  mass = 1,
  tension = 200,
  friction = 35,
  scale = 1.05,
  rotationFactor = 35,
  perspective = 1000,
}: TiltCardProps) => {
  // 使用分離的 ref 以正確支援不同的元素類型
  const divRef = useRef<HTMLDivElement>(null)
  const linkRef = useRef<HTMLAnchorElement>(null)

  // 定義動畫參數
  const [props, api] = useSpring(() => ({
    xys: [0, 0, 1],
    config: { mass, tension, friction },
  }))

  // 計算旋轉角度與縮放
  const calc = (x: number, y: number, rect: DOMRect) => [
    -(y - rect.top - rect.height / 2) / rotationFactor,
    (x - rect.left - rect.width / 2) / rotationFactor,
    scale,
  ]

  // 轉換為 CSS transform 屬性
  const trans = (x: number, y: number, s: number) =>
    `perspective(${perspective}px) rotateX(${x}deg) rotateY(${y}deg) scale(${s})`

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const element = divRef.current || linkRef.current
    if (!element) return
    const rect = element.getBoundingClientRect()
    api.start({ xys: calc(e.clientX, e.clientY, rect) })
  }

  const handleMouseLeave = () => {
    api.start({ xys: [0, 0, 1] })
  }

  const style = { transform: props.xys.to(trans) }

  if (href) {
    return (
      <AnimatedLink
        href={href}
        ref={linkRef}
        className={className}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={style}
      >
        {children}
      </AnimatedLink>
    )
  }

  return (
    <animated.div
      ref={divRef}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={style}
    >
      {children}
    </animated.div>
  )
}

export default TiltCard
