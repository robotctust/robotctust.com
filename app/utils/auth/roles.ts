import {
  DashboardModule,
  MODULE_PERMISSIONS_MAP,
  Role,
} from '@/app/types/dashboard'
import { ALL_ROLES, UserRole } from '@/app/types/user'

export const SUPER_ADMIN_ROLE: UserRole = 'super_admin'

export const ADMIN_ROLES: UserRole[] = [
  'super_admin',
  'admin',
  'admin_course',
  'admin_achievement',
  'admin_verifications',
  'admin_news',
  'admin_accounts',
  'admin_members',
  'admin_calendar',
]

const ROLE_PRIORITY: Role[] = [
  'super_admin',
  'admin',
  'admin_course',
  'admin_achievement',
  'admin_verifications',
  'admin_news',
  'admin_accounts',
  'admin_members',
  'admin_calendar',
  'member',
]

/**
 * admin_accounts（非 super_admin）可指派的角色集合。
 * 僅限各模組管理員與 member，刻意排除 super_admin / admin / admin_accounts，
 * 避免帳號管理員越權造出更高權限或可再管理角色的同級帳號。
 */
const ACCOUNTS_ADMIN_ASSIGNABLE_ROLES: UserRole[] = [
  'admin_course',
  'admin_achievement',
  'admin_verifications',
  'admin_news',
  'admin_members',
  'admin_calendar',
  'member',
]

export function normalizeRoles(roles?: UserRole[] | null): UserRole[] {
  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    return ['member']
  }

  const uniqueRoles = new Set<UserRole>()
  for (const role of roles) {
    if (ROLE_PRIORITY.includes(role as Role)) {
      uniqueRoles.add(role)
    }
  }

  if (uniqueRoles.size === 0) {
    return ['member']
  }

  return ROLE_PRIORITY.filter((role) => uniqueRoles.has(role as UserRole))
}

export function isAdminRole(roles?: UserRole[] | null): boolean {
  return normalizeRoles(roles).some((role) => ADMIN_ROLES.includes(role))
}

export function isSuperAdminRole(roles?: UserRole[] | null): boolean {
  return normalizeRoles(roles).includes(SUPER_ADMIN_ROLE)
}

export function resolvePrimaryRole(roles?: UserRole[] | null): Role {
  return normalizeRoles(roles)[0] as Role
}

export function getModulesForRoles(
  roles?: UserRole[] | null,
): DashboardModule[] {
  const modules = new Set<DashboardModule>()

  for (const role of normalizeRoles(roles)) {
    for (const module of MODULE_PERMISSIONS_MAP[role as Role] || []) {
      modules.add(module)
    }
  }

  return Array.from(modules)
}

export function canAccessModuleByRoles(
  roles: UserRole[] | null | undefined,
  module: DashboardModule,
): boolean {
  return getModulesForRoles(roles).includes(module)
}

/**
 * 取得某操作者在帳號管理頁可指派的角色集合。
 * - super_admin：全部角色（含 super_admin），唯一能授予/管理 super_admin 的角色。
 * - admin：全部角色「扣除 super_admin」——可管理一般管理員與會員，但不得新增或修改 super_admin。
 * - admin_accounts：僅模組管理員 + member。
 * - 其他：空陣列（不可指派任何角色）。
 *
 * 注意：此為授權的單一真實來源，後端 API 必須以此驗證，
 * 因為 dashboard 的寫入走 service-role client，會繞過 DB 的 prevent_role_escalation trigger。
 */
export function getAssignableRoles(
  actorRoles?: UserRole[] | null,
): UserRole[] {
  const roles = normalizeRoles(actorRoles)
  if (roles.includes('super_admin')) {
    return [...ALL_ROLES]
  }
  if (roles.includes('admin')) {
    return ALL_ROLES.filter((role) => role !== 'super_admin')
  }
  if (roles.includes('admin_accounts')) {
    return [...ACCOUNTS_ADMIN_ASSIGNABLE_ROLES]
  }
  return []
}

/**
 * 判斷操作者是否有權「編輯」某目標使用者的角色。
 *
 * 規則統一為：目標目前持有的角色，必須全部落在操作者「可指派的範圍」內。
 * - super_admin：可指派範圍涵蓋全部角色 → 可編輯任何人。
 * - admin：範圍不含 super_admin → 可編輯一般管理員與會員，但不得編輯任何 super_admin 使用者。
 * - admin_accounts：範圍僅模組管理員 + member → 不得編輯 super_admin / admin / admin_accounts 使用者。
 * - 其他：範圍為空 → 不可編輯任何人。
 */
export function canManageTargetUser(
  actorRoles: UserRole[] | null | undefined,
  targetCurrentRoles: UserRole[] | null | undefined,
): boolean {
  const assignable = new Set(getAssignableRoles(actorRoles))
  if (assignable.size === 0) {
    return false
  }
  return normalizeRoles(targetCurrentRoles).every((role) =>
    assignable.has(role),
  )
}
