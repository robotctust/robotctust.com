import { createClient as createServerClient } from './supabase/server'
import { createAdminClient } from './supabase/admin'

/**
 * 追蹤功能 server 端資料存取層
 *
 * 設計原則：對外的「追蹤數字」與「公開清單瀏覽」一律用 admin client（繞過 RLS）
 * 並在程式碼明確檢查可見性，與 userServiceServer.getUserProfileStatusByUsername
 * 相同模式；RLS 僅保護寫入與本人讀取。
 */

/** 追蹤清單中的單筆使用者（最小欄位） */
export interface FollowListItem {
  uid: string
  username: string
  displayName: string
  photoURL: string
}

/** 追蹤數字 */
export interface FollowCounts {
  followers: number
  following: number
}

export type FollowListResult =
  | { status: 'ok'; items: FollowListItem[] }
  | { status: 'private' }

const EMPTY_AVATAR = '/assets/image/userEmptyAvatar.png'

/**
 * 取得指定使用者的追蹤者數與追蹤中數（永遠公開）
 * @param targetUid 目標使用者 id
 */
export const getFollowCounts = async (
  targetUid: string,
): Promise<FollowCounts> => {
  try {
    const admin = createAdminClient()

    const [followersRes, followingRes] = await Promise.all([
      admin
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', targetUid),
      admin
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', targetUid),
    ])

    return {
      followers: followersRes.count ?? 0,
      following: followingRes.count ?? 0,
    }
  } catch (error) {
    console.error('取得追蹤數字時發生錯誤:', error)
    return { followers: 0, following: 0 }
  }
}

/**
 * 檢查 viewer 是否已追蹤 target
 * 使用 server client（RLS 允許本人讀取與自己相關的列）
 * @param viewerUid 觀看者 id
 * @param targetUid 目標使用者 id
 */
export const getFollowState = async (
  viewerUid: string,
  targetUid: string,
): Promise<boolean> => {
  try {
    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('follows')
      .select('follower_id', { head: false })
      .eq('follower_id', viewerUid)
      .eq('following_id', targetUid)
      .maybeSingle()

    if (error) {
      console.error('檢查追蹤狀態時發生錯誤:', error.message)
      return false
    }
    return !!data
  } catch (error) {
    console.error('檢查追蹤狀態時發生錯誤:', error)
    return false
  }
}

/**
 * 取得指定使用者的追蹤者 / 追蹤中清單，並依可見性設定把關
 * @param targetUid 目標使用者 id
 * @param type 'followers' 追蹤者 ｜ 'following' 追蹤中
 * @param viewerUid 觀看者 id（未登入為 null）
 */
export const getFollowListItems = async (
  targetUid: string,
  type: 'followers' | 'following',
  viewerUid: string | null,
): Promise<FollowListResult> => {
  try {
    const admin = createAdminClient()

    // 本人永遠可看自己的清單；他人需依可見性欄位判斷
    const isOwner = viewerUid === targetUid
    if (!isOwner) {
      const visibilityColumn =
        type === 'followers' ? 'followers_public' : 'following_public'
      const { data: target } = await admin
        .from('users')
        .select(visibilityColumn)
        .eq('id', targetUid)
        .maybeSingle()

      const isPublic =
        (target as Record<string, boolean> | null)?.[visibilityColumn] ?? true
      if (!isPublic) return { status: 'private' }
    }

    // followers：找出 following_id = target 的 follower；following：反之
    const matchColumn = type === 'followers' ? 'following_id' : 'follower_id'
    const joinColumn = type === 'followers' ? 'follower_id' : 'following_id'

    const { data, error } = await admin
      .from('follows')
      .select(
        `created_at, profile:users!follows_${joinColumn}_fkey(id, username, display_name, avatar_url)`,
      )
      .eq(matchColumn, targetUid)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('取得追蹤清單時發生錯誤:', error.message)
      return { status: 'ok', items: [] }
    }

    const items: FollowListItem[] = (data ?? [])
      .map((row) => {
        const raw = (row as Record<string, unknown>).profile
        const profile = (Array.isArray(raw) ? raw[0] : raw) as
          | Record<string, unknown>
          | null
          | undefined
        if (!profile) return null
        return {
          uid: profile.id as string,
          username: (profile.username as string) || '',
          displayName:
            (profile.display_name as string) ||
            (profile.username as string) ||
            '',
          photoURL: (profile.avatar_url as string) || EMPTY_AVATAR,
        }
      })
      .filter((item): item is FollowListItem => item !== null)

    return { status: 'ok', items }
  } catch (error) {
    console.error('取得追蹤清單時發生錯誤:', error)
    return { status: 'ok', items: [] }
  }
}
