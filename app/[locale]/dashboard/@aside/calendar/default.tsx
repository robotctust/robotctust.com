import { getTranslations } from 'next-intl/server'
import { Aside } from '@/app/components/Aside'
import { faList } from '@fortawesome/free-solid-svg-icons'

/**
 * [Component] 行事曆管理側邊欄 (Server Component @aside slot)
 */
export default async function CalendarAdminAsideSlot() {
  const t = await getTranslations('Components.DashboardAside')

  const navItems = [
    {
      href: '/dashboard/calendar',
      label: t('items.eventList'),
      icon: faList,
      exact: true,
    },
  ]

  return (
    <Aside
      header={{
        title: t('modules.calendar'),
        backLink: { href: '/dashboard', label: t('backToModules') },
      }}
      items={navItems}
    />
  )
}
