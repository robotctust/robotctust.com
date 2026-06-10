import { UserRole } from '@/app/types/user'

export interface AccountUserRow {
  id: string
  email: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  roles: UserRole[]
  created_at: string
}

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options)

  const isJson = response.headers
    .get('content-type')
    ?.includes('application/json')
  const payload = isJson ? await response.json() : null

  if (!response.ok) {
    throw new Error(payload?.error || `請求失敗 (HTTP ${response.status})`)
  }

  return payload as T
}

export async function fetchAccountUsers(): Promise<AccountUserRow[]> {
  const { users } = await requestJson<{ users: AccountUserRow[] }>(
    '/api/dashboard/accounts',
  )
  return users
}

export async function updateAccountRoles(
  userId: string,
  roles: UserRole[],
): Promise<UserRole[]> {
  const { roles: saved } = await requestJson<{ roles: UserRole[] }>(
    '/api/dashboard/accounts',
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, roles }),
    },
  )
  return saved
}
