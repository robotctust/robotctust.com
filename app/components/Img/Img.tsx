import type { ImgHTMLAttributes } from 'react'
import { getMediaVariants } from '@/app/utils/media/variant'

type ImgProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> & {
  src: string
  alt: string
  fill?: boolean // 同 next/image：絕對定位填滿父層（父層需 position: relative）
  priority?: boolean // 首屏圖：立即載入並提高下載優先度
  progressive?: boolean // 大圖：先以 sm 版當底圖顯示，lg 載入完成後直接蓋上
}

/**
 * 全站統一圖片元件（取代 next/image）
 * 不經 Vercel 圖片最佳化（額度用完會整批 402 破圖），圖片尺寸與格式由上傳端自行處理
 *
 * R2 上由 /api/media 上傳的圖片（…/lg.webp）會自動帶 srcSet，
 * 瀏覽器依 sizes（未指定時取 width）自行挑 sm 或 lg；其他網址原樣輸出
 */
export default function Img({
  src,
  fill,
  priority,
  progressive,
  loading,
  sizes,
  style,
  ...rest
}: ImgProps) {
  const variants = getMediaVariants(src)
  const width = Number(rest.width) || undefined

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...rest}
      src={src}
      srcSet={
        variants
          ? `${variants.sm} ${variants.smWidth}w, ${src} ${variants.lgWidth}w`
          : undefined
      }
      sizes={sizes ?? (variants && width ? `${width}px` : undefined)}
      loading={loading ?? (priority ? 'eager' : 'lazy')}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      style={{
        ...(fill && { position: 'absolute', inset: 0, width: '100%', height: '100%' }),
        ...(progressive &&
          variants && {
            backgroundImage: `url(${variants.sm})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }),
        ...style,
      }}
    />
  )
}
