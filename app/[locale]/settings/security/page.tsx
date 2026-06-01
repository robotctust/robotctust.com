import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { getPathname } from '@/i18n/navigation'
import { createClient } from '@/app/utils/supabase/server'
import SecuritySettingsClient from './SecuritySettingsClient'

/**
 * [Page] 帳號安全設定頁面
 * 需登入；未登入時重定向至登入頁（帶回跳路徑）。
 */
export default async function SecuritySettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    const locale = await getLocale()
    redirect(getPathname({ href: '/login?next=/settings/security', locale }))
  }

  return <SecuritySettingsClient />
}
