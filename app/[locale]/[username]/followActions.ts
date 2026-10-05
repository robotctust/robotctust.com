'use server'

import { createClient } from '@/app/utils/supabase/server'
import {
  getFollowState,
  getFollowListItems,
  type FollowListResult,
} from '@/app/utils/followService'

/**
 * 追蹤功能 server actions（client 可呼叫）
 * 一律以 cookie session 驗證身分，再透過 RLS / service 把關。
 */

export interface FollowActionResult {
  success: boolean
  error?: string
}

/**
 * [Action] 追蹤指定使用者
 * @param targetUid 目標使用者 id
 */
export async function followUser(
  targetUid: string,
): Promise<FollowActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'unauthorized' }
  if (user.id === targetUid) return { success: false, error: 'self_follow' }

  // RLS 會擋下「對象非公開帳號」與「follower 非本人」的情況
  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: user.id, following_id: targetUid })

  // 重複追蹤（主鍵衝突）視為成功，維持冪等
  if (error && error.code !== '23505') {
    return { success: false, error: error.message }
  }
  return { success: true }
}

/**
 * [Action] 取消追蹤指定使用者
 * @param targetUid 目標使用者 id
 */
export async function unfollowUser(
  targetUid: string,
): Promise<FollowActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'unauthorized' }

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', targetUid)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

/**
 * [Action] 取得目前登入者是否已追蹤指定使用者
 * @param targetUid 目標使用者 id
 */
export async function fetchFollowState(targetUid: string): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return false
  return getFollowState(user.id, targetUid)
}

/**
 * [Action] 取得指定使用者的追蹤者 / 追蹤中清單（依可見性把關）
 * @param targetUid 目標使用者 id
 * @param type 'followers' ｜ 'following'
 */
export async function fetchFollowList(
  targetUid: string,
  type: 'followers' | 'following',
): Promise<FollowListResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return getFollowListItems(targetUid, type, user?.id ?? null)
}
