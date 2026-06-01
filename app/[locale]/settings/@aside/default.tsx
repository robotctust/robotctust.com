import { getTranslations } from 'next-intl/server'
import { createClient } from '@/app/utils/supabase/server'
import { Aside, type AsideNavItem } from '@/app/components/Aside'
import { faShieldHalved } from '@fortawesome/free-solid-svg-icons'

/**
 * [Component] 設定頁面側邊欄 (Server Component @aside slot)
 * 所有 /settings/* 路由共用此導航。新增設定分類時於 items 加入即可。
 *
 * 項目可見性：
 * - 公開設定（如未來的外觀、語言）不論登入與否皆顯示
 * - 需登入的設定（如帳號安全）僅在登入時顯示
 */
export default async function SettingsAsideSlot() {
  const t = await getTranslations('Settings.aside')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const items: AsideNavItem[] = []

  // 公開設定項（未來的外觀、語言、通知等）於此加入，不受登入狀態限制

  // 需登入的設定項
  if (user) {
    items.push({
      label: t('nav.security'),
      href: '/settings/security',
      icon: faShieldHalved,
    })
  }

  return (
    <Aside
      header={{
        title: t('title'),
        backLink: { href: '/profile', label: t('backLink') },
      }}
      items={items}
    />
  )
}
