import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { getPathname } from '@/i18n/navigation'

/**
 * [Page] 舊「帳號安全」路由
 * 已併入 /settings/account；保留此路由以相容舊連結與書籤，永久轉址。
 */
export default async function SecurityRedirectPage() {
  const locale = await getLocale()
  redirect(getPathname({ href: '/settings/account', locale }))
}
