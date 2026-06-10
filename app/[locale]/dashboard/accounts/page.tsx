import { Metadata } from 'next'
import { requireDashboardAccess } from '@/app/utils/dashboard/auth'
import { getAssignableRoles } from '@/app/utils/auth/roles'
import { UserRole } from '@/app/types/user'
import AccountsClient from './AccountsClient'

export const metadata: Metadata = {
  title: '帳號管理 - 控制台',
  description: '管理使用者角色與權限分配',
}

/**
 * 帳號與角色管理後台頁面
 */
export default async function DashboardAccountsPage() {
  const actor = await requireDashboardAccess('accounts')
  const actorRoles = actor.roles as UserRole[]

  return (
    <AccountsClient
      currentUserId={actor.userId}
      assignableRoles={getAssignableRoles(actorRoles)}
    />
  )
}
