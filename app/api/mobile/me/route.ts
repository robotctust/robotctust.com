import { NextRequest } from 'next/server'
import { createClient as createSupabaseJSClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/app/utils/supabase/admin'

/**
 * GET /api/mobile/me
 * 已登入會員的 profile 資料。
 *
 * Header: Authorization: Bearer <Supabase access token>
 * Response: MobileProfile | { error }
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: '未登入' }, { status: 401 })
    }
    const token = authHeader.slice('Bearer '.length).trim()
    if (!token) {
      return Response.json({ error: '未登入' }, { status: 401 })
    }

    // 用 anon key + 把 token 給 getUser 來驗證 / 取 user
    const verifier = createSupabaseJSClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      },
    )
    const { data: userData, error: userErr } = await verifier.auth.getUser(token)
    if (userErr || !userData?.user) {
      return Response.json({ error: '無效的 token' }, { status: 401 })
    }
    const userId = userData.user.id

    // 從 public.users + user_stats 取完整 profile
    const admin = createAdminClient()

    const [userRowRes, statsRowRes] = await Promise.all([
      admin
        .from('users')
        .select(
          'id, email, username, display_name, avatar_url, roles, club_identity, school_identity',
        )
        .eq('id', userId)
        .maybeSingle(),
      admin
        .from('user_stats')
        .select('exp, level')
        .eq('user_id', userId)
        .maybeSingle(),
    ])

    if (userRowRes.error) {
      console.error('mobile/me users fetch error:', userRowRes.error)
      return Response.json({ error: '讀取使用者資料失敗' }, { status: 500 })
    }

    if (!userRowRes.data) {
      // 帳號剛建立、public.users 還沒被 trigger 補上
      return Response.json({ error: '帳號資料尚未準備好，請稍後再試' }, { status: 404 })
    }

    const u = userRowRes.data
    const stats = statsRowRes.data ?? { exp: 0, level: 1 }

    return Response.json({
      uid: u.id,
      email: u.email,
      username: u.username,
      displayName: u.display_name || u.email,
      avatarUrl: u.avatar_url,
      roles: u.roles ?? ['member'],
      clubIdentity: u.club_identity,
      schoolIdentity: u.school_identity,
      stats: {
        exp: stats.exp ?? 0,
        level: stats.level ?? 1,
      },
    })
  } catch (error) {
    console.error('Mobile me error:', error)
    return Response.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
