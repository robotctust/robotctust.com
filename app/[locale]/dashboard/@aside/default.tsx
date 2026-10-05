// util
import { requireDashboardAccess } from '@/app/utils/dashboard/auth'
import { DASHBOARD_MODULES, DashboardModule } from '@/app/types/dashboard'
import { getTranslations } from 'next-intl/server'

// components
import { Aside } from '@/app/components/Aside'
import { faHouse } from '@fortawesome/free-solid-svg-icons'

// 側欄分組與順序（總覽固定在最上方、不分組）
const MODULE_GROUPS: { key: 'content' | 'club'; modules: DashboardModule[] }[] = [
  { key: 'content', modules: ['news', 'courses', 'programs'] },
  { key: 'club', modules: ['calendar', 'verifications', 'achievements', 'members', 'accounts'] },
]

/**
 * [Component] 管理後台全域側邊欄 (Server Component @aside slot)
 * 提供返回模組總覽與切換模組的導覽列
 */
export default async function GlobalAsideSlot() {
  const actor = await requireDashboardAccess()
  const t = await getTranslations('Components.DashboardAside')
  const tRoles = await getTranslations('Components.Roles')

  const items = [
    { label: t('overview'), href: '/dashboard', icon: faHouse, exact: true },
    ...MODULE_GROUPS.flatMap((group) =>
      group.modules
        .filter((key) => actor.modules.includes(key))
        .map((key) => {
          const module = DASHBOARD_MODULES.find((m) => m.key === key)!
          return {
            label: t(`modules.${key}` as any),
            href: module.href,
            icon: module.icon ?? null,
            group: t(`groups.${group.key}`),
          }
        }),
    ),
  ]

  return (
    <Aside
      header={{
        backLink: { href: '/', label: t('backToHome') },
        title: t('header.title'),
        subtitle: t('header.subtitle', { role: tRoles(actor.role as any) }),
      }}
      items={items}
    />
  )
}
