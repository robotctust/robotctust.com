import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { getPathname } from '@/i18n/navigation'

/**
 * [Page] 設定首頁
 * 目前僅有「帳號安全」一項，直接導向。未來擴展設定分類後可改為總覽頁。
 */
export default async function SettingsPage() {
  const locale = await getLocale()
  redirect(getPathname({ href: '/settings/security', locale }))
}
