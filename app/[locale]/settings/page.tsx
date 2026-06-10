import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { getPathname } from '@/i18n/navigation'
import { createClient } from '@/app/utils/supabase/server'
import { getVisibleSettingsSections } from './sections'

/**
 * [Page] 設定首頁
 * 依 sections registry 與登入狀態，導向第一個對使用者可見的分類。
 * 若無可用分類（未登入且僅有需登入分類），導向登入並回跳 /settings 再解析。
 */
export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const sections = getVisibleSettingsSections(!!user)
  const locale = await getLocale()

  if (sections.length === 0) {
    redirect(getPathname({ href: '/login?next=/settings', locale }))
  }

  redirect(getPathname({ href: sections[0].href, locale }))
}
