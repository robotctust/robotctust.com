import { createAdminClient } from '@/app/utils/supabase/admin'
import type { AccountUserRow } from '@/app/[locale]/dashboard/accounts/client-utils'

/**
 * 取得帳號管理列表（新到舊）。
 * 使用 service-role client，呼叫前必須先通過 requireDashboardAccess('accounts')。
 */
export async function getAccountUsers(): Promise<AccountUserRow[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('users')
    .select('id, email, username, display_name, avatar_url, roles, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch users', error)
    throw new Error('讀取使用者資料失敗，請稍後再試')
  }

  return data as AccountUserRow[]
}
