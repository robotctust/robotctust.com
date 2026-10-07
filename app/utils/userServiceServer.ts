import { createClient as createServerClient } from './supabase/server'
import { createAdminClient } from './supabase/admin'
import { createPublicClient } from './supabase/public'
import {
  UserProfile,
  PublicUserProfile,
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
  | { status: 'found'; profile: PublicUserProfile }
  | { status: 'private' }
  | { status: 'not_found' }

/** 個人頁用到的公開欄位；訪客（anon）在資料庫只被授權讀這些欄位 */
const PUBLIC_PROFILE_COLUMNS = 'id, username, display_name, avatar_url, background_url, bio'

type PublicProfileRow = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  background_url: string | null
  bio: string | null
}

function mapToPublicProfile(row: PublicProfileRow): PublicUserProfile {
  return {
    uid: row.id,
    username: row.username || '',
    displayName: row.display_name || row.username || '',
    photoURL: row.avatar_url || '/assets/image/userEmptyAvatar.png',
    bio: row.bio ?? undefined,
    backgroundURL: row.background_url || undefined,
  }
}

/**
 * 服務器端從 username 取得個人頁的公開資料，並區分帳號隱藏與不存在
 * 只讀公開欄位，email、學號、roles 不會離開資料庫
 * @param {string} username - 使用者名稱
 * @returns {Promise<UserProfileResult>} 使用者資料
 */
export const getUserProfileStatusByUsername = async (
  username: string,
): Promise<UserProfileResult> => {
  try {
    // 公開帳號：以訪客身分讀，RLS 只放行公開帳號
    const { data: publicRow, error } = await createPublicClient()
      .from('users')
      .select(PUBLIC_PROFILE_COLUMNS)
      .eq('username', username)
      .maybeSingle()
    if (error) throw error
    if (publicRow) {
      return { status: 'found', profile: mapToPublicProfile(publicRow) }
    }

    // 不公開的帳號只有本人看得到：RLS 只讓登入者讀自己那一列
    const supabase = await createServerClient()
    const { data: ownRow } = await supabase
      .from('users')
      .select(PUBLIC_PROFILE_COLUMNS)
      .eq('username', username)
      .maybeSingle()
    if (ownRow) {
      return { status: 'found', profile: mapToPublicProfile(ownRow) }
    }

    // 透過 admin client（繞過 RLS）只確認帳號是否存在
    const admin = createAdminClient()
    const { data: adminData } = await admin
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle()

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
