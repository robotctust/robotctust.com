import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { getPathname } from '@/i18n/navigation'
import styles from './dashboard.module.scss'

// util
import {
  isDashboardAccessError,
  requireDashboardAccess,
} from '@/app/utils/dashboard/auth'
import Page from '@/app/components/page/Page'

interface DashboardLayoutProps {
  children: ReactNode
  aside?: ReactNode
}

/**
 * [Component] 管理後台布局
 * @param children - 子元件
 * @param aside - 平行路由 slot: 依照網址給予不同的 Sidebar
 * @returns 管理後台布局
 */
export default async function DashboardLayout({
  children,
  aside,
}: DashboardLayoutProps) {
  const locale = await getLocale()

  try {
    // 獲取使用者資料，確保有進入後台的權限
    await requireDashboardAccess()

    // 返回管理後台布局
    return (
      <Page style={styles.container} aside={aside}>
        {children}
      </Page>
    )
  } catch (error) {
    if (isDashboardAccessError(error) && error.statusCode === 401) {
      redirect(getPathname({ href: '/login', locale }))
    }

    redirect(getPathname({ href: '/', locale }))
  }
}
