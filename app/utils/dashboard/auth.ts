import { cache } from 'react'
import { createClient } from '@/app/utils/supabase/server'
import {
  DashboardActor,
  DashboardModule,
  MODULE_PERMISSIONS_MAP,
  Role,
} from '@/app/types/dashboard'
import {
  getModulesForRoles,
  normalizeRoles,
  resolvePrimaryRole,
} from '@/app/utils/auth/roles'

export class DashboardAccessError extends Error {
  statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.name = 'DashboardAccessError'
    this.statusCode = statusCode
  }
}

/**
 * 獲取角色模組
 * @param role - 角色
 * @returns 角色模組
 */
export function getRoleModules(role: Role): DashboardModule[] {
  return MODULE_PERMISSIONS_MAP[role] || []
}

/**
 * 判斷角色是否可以訪問模組
 * @param role - 角色
 * @param module - 模組
 * @returns 是否可以訪問模組
 */
export function canAccessModule(role: Role, module: DashboardModule): boolean {
  return getRoleModules(role).includes(module)
}

/**
 * 獲取管理後台使用者
 * 用 React cache 包起來：同一個請求裡 layout、aside、page 都會呼叫，
 * 只打一次 Supabase（getUser + 查角色），不必各跑一遍。
 * @returns 管理後台使用者
 */
export const getDashboardActor = cache(async (): Promise<DashboardActor> => {
  // 建立 Supabase Client
  const supabase = await createClient()
  // 獲取使用者
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new DashboardAccessError('尚未登入', 401)
  }

  // 獲取使用者資料
  const { data: userRow, error: profileError } = await supabase
    .from('users')
    .select('id, roles')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !userRow) {
    throw new DashboardAccessError('找不到使用者資料', 403)
  }

  // 正規化角色
  const roles = normalizeRoles(userRow.roles)
  const role = resolvePrimaryRole(roles)
  const modules = getModulesForRoles(roles)
  // 返回管理後台使用者
  return {
    userId: user.id,
    role,
    roles: roles as Role[],
    modules,
  }
})

/**
 * 要求管理後台訪問
 * @param module - 模組
 * @returns 管理後台使用者
 */
export async function requireDashboardAccess(
  module?: DashboardModule,
): Promise<DashboardActor> {
  // 獲取管理後台使用者
  const actor = await getDashboardActor()

  if (actor.modules.length === 0) {
    // 如果使用者沒有模組權限，返回錯誤
    throw new DashboardAccessError('您沒有後台使用權限', 403)
  }

  if (module && !actor.modules.includes(module)) {
    // 如果使用者沒有該模組的管理權限，返回錯誤
    throw new DashboardAccessError('您沒有該模組的管理權限', 403)
  }

  // 返回管理後台使用者
  return actor
}

/**
 * 轉換為路由錯誤回應
 * @param error - 錯誤
 * @returns 路由錯誤回應
 */
export function toRouteErrorResponse(error: unknown): Response {
  // 如果錯誤是管理後台存取錯誤，返回錯誤回應
  if (error instanceof DashboardAccessError) {
    return Response.json({ error: error.message }, { status: error.statusCode })
  }

  // 如果錯誤是其他類型，返回伺服器錯誤回應
  return Response.json({ error: '伺服器發生未預期錯誤' }, { status: 500 })
}

export function isDashboardAccessError(
  error: unknown,
): error is DashboardAccessError {
  return error instanceof DashboardAccessError
}
