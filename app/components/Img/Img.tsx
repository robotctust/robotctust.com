import type { ImgHTMLAttributes } from 'react'

type ImgProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> & {
  src: string
  alt: string
  fill?: boolean // 同 next/image：絕對定位填滿父層（父層需 position: relative）
  priority?: boolean // 首屏圖：立即載入並提高下載優先度
}

/**
 * 全站統一圖片元件（取代 next/image）
 * 不經 Vercel 圖片最佳化（額度用完會整批 402 破圖），圖片尺寸與格式由上傳端自行處理
 */
export default function Img({ fill, priority, loading, style, ...rest }: ImgProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...rest}
      loading={loading ?? (priority ? 'eager' : 'lazy')}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      style={
        fill
          ? { position: 'absolute', inset: 0, width: '100%', height: '100%', ...style }
          : style
      }
    />
  )
}
