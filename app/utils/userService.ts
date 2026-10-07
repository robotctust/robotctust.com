'use server'

import { createClient } from './supabase/server'
import { createAdminClient } from './supabase/admin'

/**
 * 檢查 users 表某欄位的值是否已被其他帳號使用
 * 在伺服器以 admin client 查詢：RLS 只讓登入者讀自己那一列，瀏覽器端查不到別人
 * @param column - 要比對的欄位
 * @param value - 欲檢查的值
 * @returns {Promise<boolean>} 是否可用；未登入或查詢失敗一律回傳 false
 */
async function isAvailable(column: 'username' | 'student_id', value: string): Promise<boolean> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return false

    const { data, error } = await createAdminClient()
      .from('users')
      .select('id')
      .eq(column, value)
      .neq('id', user.id)
      .limit(1)
    if (error) throw error
    return data.length === 0
  } catch (error) {
    console.error(`檢查 ${column} 可用性時發生錯誤:`, error)
    return false
  }
}

/**
 * 檢查帳號名稱是否可用（排除目前登入的使用者）
 * @param username - 欲檢查的帳號名稱
 * @returns {Promise<boolean>} 是否可用
 */
export async function checkUsernameAvailable(username: string): Promise<boolean> {
  return isAvailable('username', username)
}

/**
 * 檢查學號是否可用（排除目前登入的使用者）
 * @param studentId - 欲檢查的學號
 * @returns {Promise<boolean>} 是否可用
 */
export async function checkStudentIdAvailable(studentId: string): Promise<boolean> {
  return isAvailable('student_id', studentId)
}
