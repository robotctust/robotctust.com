import { SITE_CONFIG } from '@/app/utils/siteConfigs'

/**
 * 各種類 sm / lg 的寬度（px），需與 process.ts 的處理規格一致，供 srcSet 的 w 描述使用
 * ponytail: post / course 以長邊縮放，直式圖的實際寬度會小於標示值；只影響瀏覽器挑版本的精準度
 */
const VARIANT_WIDTHS: { prefix: string; sm: number; lg: number }[] = [
  { prefix: 'users/avatars/', sm: 128, lg: 512 },
  { prefix: 'users/backgrounds/', sm: 960, lg: 2160 },
  { prefix: '', sm: 800, lg: 1920 }, // posts/、courses/
]

/**
 * 取得 R2 圖片的 sm 版網址與兩個版本的寬度
 * 只處理由 /api/media 上傳、結尾為 /lg.webp 的 R2 圖片；其他網址（Firebase、Google、本機）回傳 null
 * @param url - 資料庫中存的圖片網址（lg 版）
 */
export function getMediaVariants(
  url: string,
): { sm: string; smWidth: number; lgWidth: number } | null {
  const base = `${SITE_CONFIG.mediaBase}/`
  if (!url.startsWith(base) || !url.endsWith('/lg.webp')) return null
  const key = url.slice(base.length)
  const widths = VARIANT_WIDTHS.find((w) => key.startsWith(w.prefix))!
  return {
    sm: url.slice(0, -'lg.webp'.length) + 'sm.webp',
    smWidth: widths.sm,
    lgWidth: widths.lg,
  }
}
