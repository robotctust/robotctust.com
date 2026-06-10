'use server'

import { createClient } from '@/app/utils/supabase/server'
import { createAdminClient } from '@/app/utils/supabase/admin'

/**
 * [Action] 匯出目前登入者的所有資料（唯讀）
 *
 * 先以 cookie session 驗證身分，再用 admin client 嚴格依 user id 蒐集
 * 各表中屬於本人的資料，避免 RLS 在 join 時造成缺漏。
 */
export interface ExportDataResult {
  success: boolean
  data?: Record<string, unknown>
  error?: string
}

export async function exportMyData(): Promise<ExportDataResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'unauthorized' }

  const admin = createAdminClient()
  const uid = user.id

  const [profile, stats, achievements, verifications, posts, events] =
    await Promise.all([
      admin.from('users').select('*').eq('id', uid).maybeSingle(),
      admin.from('user_stats').select('*').eq('user_id', uid).maybeSingle(),
      admin
        .from('user_achievements')
        .select('*, achievements(*)')
        .eq('user_id', uid),
      admin.from('course_verifications').select('*').eq('user_id', uid),
      admin.from('posts').select('*').eq('author_id', uid),
      admin.from('schedule_events').select('*').eq('created_by', uid),
    ])

  return {
    success: true,
    data: {
      exported_at: new Date().toISOString(),
      account: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        providers: user.identities?.map((i) => i.provider) ?? [],
      },
      profile: profile.data,
      stats: stats.data,
      achievements: achievements.data ?? [],
      course_verifications: verifications.data ?? [],
      posts: posts.data ?? [],
      schedule_events: events.data ?? [],
    },
  }
}

/**
 * [Action] 永久刪除目前登入者的帳號
 *
 * 流程：
 * 1. 以 cookie session 驗證身分、取回 username 比對確認字串
 * 2. 把本人已發表文章的作者名快照匿名化（author_id 由 FK ON DELETE SET NULL 處理）
 * 3. admin.deleteUser → CASCADE 清除 public.users 及 user_stats / user_achievements
 *    / course_verifications(user_id)；verified_by 與 schedule_events.created_by 則 SET NULL
 *
 * 注意：Firebase Storage 上的頭像 / 背景圖檔不在此清除（待 storage 遷移後處理）。
 */
export interface DeleteAccountResult {
  success: boolean
  error?: string
}

/** 文章作者被刪除後顯示的匿名名稱（與語系無關的儲存值） */
const DELETED_AUTHOR_NAME = '已刪除使用者'

export async function deleteAccount(
  confirmation: string,
): Promise<DeleteAccountResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'unauthorized' }

  const admin = createAdminClient()
  const uid = user.id

  // 取回 username 比對確認字串，避免誤刪
  const { data: profile } = await admin
    .from('users')
    .select('username')
    .eq('id', uid)
    .maybeSingle()

  const username = profile?.username ?? ''
  if (!username || confirmation.trim() !== username) {
    return { success: false, error: 'confirmation_mismatch' }
  }

  // 匿名化已發表文章的作者名快照
  const { error: anonError } = await admin
    .from('posts')
    .update({ author_display_name: DELETED_AUTHOR_NAME })
    .eq('author_id', uid)
  if (anonError) return { success: false, error: anonError.message }

  // 刪除 auth 使用者，後續清理由 FK CASCADE / SET NULL 自動完成
  const { error: deleteError } = await admin.auth.admin.deleteUser(uid)
  if (deleteError) return { success: false, error: deleteError.message }

  return { success: true }
}
