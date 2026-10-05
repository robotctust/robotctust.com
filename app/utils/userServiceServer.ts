import { createClient as createServerClient } from './supabase/server'
import { createAdminClient } from './supabase/admin'
import {
  UserProfile,
  UserRole,
  DEFAULT_USER_STATS,
} from '../types/user'

/**
 * 將 Supabase 資料轉換為 UserProfile 格式
 * @param {Record<string, unknown>} data - Supabase 資料
 * @returns {UserProfile} UserProfile 格式
 */
function mapToUserProfile(data: Record<string, unknown>): UserProfile {
  // 獲取使用者統計資料
  const rawStats = data.user_stats
  const statsData = Array.isArray(rawStats) ? rawStats[0] : rawStats
  // 獲取使用者統計資料
  const stats = statsData
    ? {
        exp: (statsData as Record<string, number>).exp || 0,
        level: (statsData as Record<string, number>).level || 1,
        isPublic:
          (statsData as Record<string, boolean>).is_public ?? true,
      }
    : DEFAULT_USER_STATS

  return {
    uid: data.id as string,
    email: (data.email as string) || '',
    username: (data.username as string) || '',
    displayName:
      (data.display_name as string) || (data.username as string) || '',
    photoURL:
      (data.avatar_url as string) || '/assets/image/userEmptyAvatar.png',
    provider: (data.provider as 'email' | 'google') || 'email',
    createdAt: new Date((data.created_at as string) || new Date()),
    updatedAt: new Date((data.updated_at as string) || new Date()),
    roles: (data.roles as UserRole[]) || ['member'],
    bio: data.bio as string | undefined,
    backgroundURL: (data.background_url as string) || undefined,
    studentId: (data.student_id as string) || null,
    schoolIdentity:
      (data.school_identity as UserProfile['schoolIdentity']) || null,
    clubIdentity: (data.club_identity as UserProfile['clubIdentity']) || null,
    followersPublic: (data.followers_public as boolean) ?? true,
    followingPublic: (data.following_public as boolean) ?? true,
    stats,
  } as UserProfile
}

/**
 * 服務器端從 username 獲取使用者資料
 * @param {string} username - 使用者名稱
 * @returns {Promise<UserProfile | null>} 使用者資料
 */
export const getUserProfileByUsernameServer = async (
  username: string,
): Promise<UserProfile | null> => {
  try {
    // 建立 Supabase Client
    const supabase = await createServerClient()
    // 獲取使用者資料
    const { data, error } = await supabase
      .from('users')
      .select('*, user_stats(*)')
      .eq('username', username)
      .maybeSingle()

    if (error) {
      console.error('從 username 獲取使用者資料時發生錯誤:', error.message)
      return null
    }
    if (!data) return null

    // 轉換為 UserProfile 格式
    return mapToUserProfile(data as Record<string, unknown>)
  } catch (error) {
    console.error('從 username 獲取使用者資料時發生錯誤:', error)
    return null
  }
}

/**
 * 服務器端從 user id 獲取使用者資料
 * @param {string} uid - 使用者 ID
 * @returns {Promise<UserProfile | null>} 使用者資料
 */
export const getUserProfileByUidServer = async (
  uid: string,
): Promise<UserProfile | null> => {
  try {
    // 建立 Supabase Client
    const supabase = await createServerClient()
    // 獲取使用者資料
    const { data, error } = await supabase
      .from('users')
      .select('*, user_stats(*)')
      .eq('id', uid)
      .maybeSingle()

    if (error) {
      console.error('從 uid 獲取使用者資料時發生錯誤:', error.message)
      return null
    }
    if (!data) return null

    // 轉換為 UserProfile 格式
    return mapToUserProfile(data as Record<string, unknown>)
  } catch (error) {
    console.error('從 uid 獲取使用者資料時發生錯誤:', error)
    return null
  }
}

export type UserProfileResult =
  | { status: 'found'; profile: UserProfile }
  | { status: 'private' }
  | { status: 'not_found' }

/**
 * 服務器端從 username 獲取使用者資料，並區分帳號隱藏與不存在
 * @param {string} username - 使用者名稱
 * @returns {Promise<UserProfileResult>} 使用者資料
 */
export const getUserProfileStatusByUsername = async (
  username: string,
): Promise<UserProfileResult> => {
  try {
    // 建立 Supabase Client
    const supabase = await createServerClient()
    // 獲取使用者資料
    const { data, error } = await supabase
      .from('users')
      .select('*, user_stats(*)')
      .eq('username', username)
      .maybeSingle()

    if (error) {
      console.error('從 username 獲取使用者狀態時發生錯誤:', error.message)
      return { status: 'not_found' }
    }

    // 有資料，且 RLS 允許存取（帳號公開）
    if (data) {
      return {
        status: 'found',
        profile: mapToUserProfile(data as Record<string, unknown>),
      }
    }

    // 一般查詢回傳 null，透過 admin client（繞過 RLS）確認用戶是否存在
    const admin = createAdminClient()
    const { data: adminData } = await admin
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle()

    // 返回使用者狀態
    return adminData ? { status: 'private' } : { status: 'not_found' }
  } catch (error) {
    console.error('從 username 獲取使用者狀態時發生錯誤:', error)
    return { status: 'not_found' }
  }
}

/**
 * 服務器端從 uid 獲取使用者資料
 * @param {string} uid - 使用者 ID
 * @returns {Promise<UserProfile | null>} 使用者資料
 */
export const getUserProfileServer = async (
  uid: string,
): Promise<UserProfile | null> => {
  try {
    // 建立 Supabase Client
    const supabase = await createServerClient()
    // 獲取使用者資料
    const { data, error } = await supabase
      .from('users')
      .select('*, user_stats(*)')
      .eq('id', uid)
      .maybeSingle()

    if (error) {
      console.error('獲取使用者資料時發生錯誤:', error.message)
      return null
    }
    if (!data) return null

    // 轉換為 UserProfile 格式
    return mapToUserProfile(data as Record<string, unknown>)
  } catch (error) {
    console.error('獲取使用者資料時發生錯誤:', error)
    return null
  }
}
