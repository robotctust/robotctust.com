'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import styles from './ConnectingPath.module.scss'

interface ConnectingPathProps {
  /** 連接點選擇器（相對於父容器查詢），預設 '[data-journey-node]' */
  nodeSelector?: string
  /** 錨點的水平基準：對齊元素左/中/右邊，預設 'left'（適合左對齊內容） */
  anchorX?: 'left' | 'center' | 'right'
  /** 自 anchorX 基準再往右位移的距離 px，預設 0 */
  offsetX?: number
  /** 錨點距元素頂端的垂直距離 px，預設 16 */
  offsetY?: number
  /** 曲線張力 0–0.5，越大越彎，預設 0.2 */
  tension?: number
  className?: string
}

type Point = [number, number]

/**
 * 用 Catmull-Rom 風格的三次貝茲，將一連串點串成平滑曲線。
 * 端點以自身複製作為虛擬控制點，避免起訖過衝。
 */
function buildSmoothPath(pts: Point[], tension: number): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const cp1x = p1[0] + (p2[0] - p0[0]) * tension
    const cp1y = p1[1] + (p2[1] - p0[1]) * tension
    const cp2x = p2[0] - (p3[0] - p1[0]) * tension
    const cp2y = p2[1] - (p3[1] - p1[1]) * tension
    d +=
      ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)},` +
      ` ${cp2x.toFixed(1)} ${cp2y.toFixed(1)},` +
      ` ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  return d
}

/**
 * [component] 動態連接曲線（client）。
 *
 * 量測父容器內所有 `nodeSelector` 元素的位置，把它們的錨點以平滑曲線串起，
 * 畫進一張覆蓋父容器的 SVG。常用於把橫向排列、各自有垂直位移的項目連成
 * 一條「旅程線」。
 *
 * 運作要點：
 * - SVG 與被連接的項目同為 track 的子元素 → 跟著父層 transform（如 GSAP scrub）
 *   一起位移，捲動時無需重算，僅在 resize / 版面變動時重建路徑。
 * - 座標一律以 track 的 getBoundingClientRect 為基準計算相對值；track 上的
 *   translateX 在相減時會抵消，故劫持捲動中的座標仍然穩定。
 * - 標記 `data-hsh-decoration` 讓 HorizontalScrollHijack 不把它當成項目。
 * - 純裝飾（aria-hidden），不影響 SEO / a11y。
 *
 * 錨點位置：以 anchorX / offsetX / offsetY 統一控制（見 props）。
 * 個別節點可用 data 屬性覆寫整組設定（值為相對該元素左上角的 px）：
 *   `data-journey-x` → 覆寫水平座標、`data-journey-y` → 覆寫垂直座標。
 */
export default function ConnectingPath({
  nodeSelector = '[data-journey-node]',
  anchorX = 'left',
  offsetX = 12,
  offsetY = 12,
  tension = 0.2,
  className,
}: ConnectingPathProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [path, setPath] = useState('')
  const [points, setPoints] = useState<Point[]>([])
  const [size, setSize] = useState({ w: 0, h: 0 })

  const recompute = useCallback(() => {
    const svg = svgRef.current
    const track = svg?.parentElement
    if (!svg || !track) return

    const nodes = Array.from(track.querySelectorAll<HTMLElement>(nodeSelector))
    if (nodes.length < 2) {
      setPath('')
      setPoints([])
      return
    }

    // anchorX 決定水平基準（左/中/右邊），offsetX 再往右位移
    const baseX = (r: DOMRect) =>
      anchorX === 'center' ? r.width / 2 : anchorX === 'right' ? r.width : 0

    const tr = track.getBoundingClientRect()
    const pts: Point[] = nodes.map((n) => {
      const r = n.getBoundingClientRect()
      const dx = n.dataset.journeyX // 個別節點水平覆寫
      const dy = n.dataset.journeyY // 個別節點垂直覆寫
      const x =
        r.left + (dx !== undefined ? Number(dx) : baseX(r) + offsetX) - tr.left
      const y = r.top + (dy !== undefined ? Number(dy) : offsetY) - tr.top
      return [x, y]
    })

    setSize({ w: track.scrollWidth, h: track.scrollHeight })
    setPoints(pts)
    setPath(buildSmoothPath(pts, tension))
  }, [nodeSelector, anchorX, offsetX, offsetY, tension])

  useEffect(() => {
    const track = svgRef.current?.parentElement
    if (!track) return

    // rAF 去抖，避免 ResizeObserver 連續觸發造成 layout thrash
    let raf = 0
    const schedule = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(recompute)
    }

    schedule()

    const ro = new ResizeObserver(schedule)
    ro.observe(track)
    window.addEventListener('resize', schedule)
    window.addEventListener('load', schedule)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('resize', schedule)
      window.removeEventListener('load', schedule)
    }
  }, [recompute])

  return (
    <svg
      ref={svgRef}
      className={`${styles.svg} ${className ?? ''}`}
      width={size.w || undefined}
      height={size.h || undefined}
      data-hsh-decoration="true"
      aria-hidden="true"
    >
      {path && <path className={styles.path} d={path} />}
      {points.map(([x, y], i) => (
        <circle key={i} className={styles.node} cx={x} cy={y} r={9} />
      ))}
    </svg>
  )
}
