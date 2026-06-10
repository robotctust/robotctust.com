import { NextRequest } from 'next/server'
import { createAdminClient } from '@/app/utils/supabase/admin'
import {
  requireDashboardAccess,
  toRouteErrorResponse,
} from '@/app/utils/dashboard/auth'
import {
  normalizeRoles,
  getAssignableRoles,
  canManageTargetUser,
} from '@/app/utils/auth/roles'
import { UserRole, getUserRoleName } from '@/app/types/user'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * 取得所有使用者（含角色），供帳號管理頁顯示。
 * 回傳全部使用者；前端依操作者權限決定哪些列可編輯。
 */
export async function GET() {
  try {
    await requireDashboardAccess('accounts')

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('users')
      .select('id, email, username, display_name, avatar_url, roles, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch users', error)
      return Response.json({ error: '讀取使用者資料失敗，請稍後再試' }, { status: 500 })
    }

    return Response.json({ users: data })
  } catch (error) {
    return toRouteErrorResponse(error)
  }
}

/**
 * 更新指定使用者的角色。
 *
 * 重要：此處走 service-role client，會繞過 DB 的 prevent_role_escalation trigger，
 * 因此所有授權邊界都必須在此硬性驗證（不可只靠前端或 DB）。
 */
export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireDashboardAccess('accounts')
    const actorRoles = actor.roles as UserRole[]

    const body = (await request.json()) as {
      userId?: string
      roles?: UserRole[]
    }

    const userId = body.userId
    if (!userId || !UUID_RE.test(userId)) {
      return Response.json({ error: '無效的使用者 ID 格式' }, { status: 400 })
    }

    const finalRoles = normalizeRoles(body.roles)

    const admin = createAdminClient()

    // 讀取目標使用者目前的角色
    const { data: target, error: readError } = await admin
      .from('users')
      .select('roles')
      .eq('id', userId)
      .maybeSingle()

    if (readError) {
      console.error('Failed to read target user', readError)
      return Response.json({ error: '讀取使用者資料失敗，請稍後再試' }, { status: 500 })
    }
    if (!target) {
      return Response.json({ error: '找不到該使用者' }, { status: 404 })
    }

    const targetRoles = normalizeRoles(target.roles as UserRole[] | null)

    // (1) 是否有權編輯此目標使用者（admin_accounts 不能動 super_admin/admin/admin_accounts）
    if (!canManageTargetUser(actorRoles, targetRoles)) {
      return Response.json({ error: '您沒有權限編輯此使用者的角色' }, { status: 403 })
    }

    // (2) 欲指派的角色必須全部落在操作者可指派的範圍內
    const assignable = new Set(getAssignableRoles(actorRoles))
    if (!finalRoles.every((role) => assignable.has(role))) {
      return Response.json({ error: '您沒有權限指派其中部分角色' }, { status: 403 })
    }

    const targetWasSuperAdmin = targetRoles.includes('super_admin')
    const removingSuperAdmin = targetWasSuperAdmin && !finalRoles.includes('super_admin')

    // (3) 自保：不可移除自己的頂層管理角色（super_admin / admin），避免自我鎖權
    if (userId === actor.userId) {
      const selfProtectedRoles: UserRole[] = ['super_admin', 'admin']
      const removedSelfRole = selfProtectedRoles.find(
        (role) => targetRoles.includes(role) && !finalRoles.includes(role),
      )
      if (removedSelfRole) {
        return Response.json(
          { error: `您不能移除自己的${getUserRoleName(removedSelfRole)}權限` },
          { status: 400 },
        )
      }
    }

    // (4) 最後一個 super_admin 守衛：避免系統被清空到 0 個 super_admin
    if (removingSuperAdmin) {
      const { count, error: countError } = await admin
        .from('users')
        .select('*', { count: 'exact', head: true })
        .contains('roles', ['super_admin'])

      if (countError) {
        console.error('Failed to count super_admins', countError)
        return Response.json({ error: '驗證失敗，請稍後再試' }, { status: 500 })
      }
      if ((count ?? 0) <= 1) {
        return Response.json(
          { error: '不能移除系統最後一個 super_admin' },
          { status: 400 },
        )
      }
    }

    // (5) 通過所有檢查才寫入
    const { error: updateError } = await admin
      .from('users')
      .update({ roles: finalRoles })
      .eq('id', userId)

    if (updateError) {
      console.error('Failed to update roles', updateError)
      return Response.json({ error: '更新使用者權限失敗，請稍後再試' }, { status: 500 })
    }

    return Response.json({ success: true, roles: finalRoles })
  } catch (error) {
    return toRouteErrorResponse(error)
  }
}
