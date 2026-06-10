import { getTranslations } from 'next-intl/server'
import { createClient } from '@/app/utils/supabase/server'
import { Aside, type AsideNavItem } from '@/app/components/Aside'
import { getVisibleSettingsSections } from '../sections'

/**
 * [Component] 設定頁面側邊欄 (Server Component @aside slot)
 * 所有 /settings/* 路由共用此導航；項目由 sections registry 依登入狀態推導。
 * 新增設定分類請改 ../sections.ts，無需動此檔。
 */
export default async function SettingsAsideSlot() {
  const t = await getTranslations('Settings.aside')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const items: AsideNavItem[] = getVisibleSettingsSections(!!user).map((s) => ({
    label: t(`nav.${s.labelKey}`),
    href: s.href,
    icon: s.icon,
  }))

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
