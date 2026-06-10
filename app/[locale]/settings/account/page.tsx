import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { getPathname } from '@/i18n/navigation'
import { createClient } from '@/app/utils/supabase/server'
import AccountSettingsClient from './AccountSettingsClient'

/**
 * [Page] 帳號設定頁面
 * 需登入；未登入時重定向至登入頁（帶回跳路徑）。
 * 整合：帳號安全、匯出我的資料、刪除帳號。
 */
export default async function AccountSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    const locale = await getLocale()
    redirect(getPathname({ href: '/login?next=/settings/account', locale }))
  }

  // 取回 username 供刪除帳號的確認輸入比對
  const { data: profile } = await supabase
    .from('users')
    .select('username')
    .eq('id', user.id)
    .maybeSingle()

  return <AccountSettingsClient username={profile?.username ?? ''} />
}
