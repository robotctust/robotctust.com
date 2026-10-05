'use client'

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from 'react'
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { createClient } from '../utils/supabase/client'
import {
  AuthContextType,
  UserProfile,
  RegisterFormData,
  DEFAULT_USER_STATS,
} from '../types/user'
import { isAdminRole, isSuperAdminRole } from '../utils/auth/roles'

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const supabase = useMemo(() => createClient(), [])
  const [user, setUser] = useState<UserProfile | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null)
  // 存放目前已登入使用者的 id，供 onAuthStateChange callback 讀取最新值，避免 stale closure
  const supabaseUserIdRef = useRef<string | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false)
  const [isSemesterMember, setIsSemesterMember] = useState<boolean>(false)
  const [loading, setLoading] = useState(true)

  //* 檢查使用者是否為學期社員
  const checkIsSemesterMember = useCallback(
    async (studentId: string | null): Promise<boolean> => {
      if (!studentId) return false
      try {
        const { data, error } = await supabase
          .from('semester_members')
          .select('id')
          .eq('student_id', studentId)
          .limit(1)
          .maybeSingle()

        if (error) {
          console.error('檢查社員身分時發生錯誤:', error.message)
          return false
        }

        return !!data
      } catch (error) {
        console.error('檢查社員身分時發生例外錯誤:', error)
        return false
      }
    },
    [supabase],
  )

  //* 避免資料查詢卡住造成整個 UI 一直 loading
  const resolveWithTimeout = useCallback(
    async <T,>(
      promise: Promise<T>,
      timeoutMs: number,
      fallback: T,
    ): Promise<T> => {
      let timerId: ReturnType<typeof setTimeout> | null = null
      try {
        return await Promise.race<T>([
          promise,
          new Promise<T>((resolve) => {
            timerId = setTimeout(() => {
              resolve(fallback)
            }, timeoutMs)
          }),
        ])
      } finally {
        if (timerId) clearTimeout(timerId)
      }
    },
    [],
  )

  //* 從 Supabase 獲取使用者資料並做對應的轉換
  const getUserProfile = useCallback(
    async (uid: string): Promise<UserProfile | null> => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*, user_stats(*)')
          .eq('id', uid)
          .maybeSingle()

        if (error) {
          console.error('獲取使用者資料時發生錯誤:', error.message)
          return null
        }

        if (!data) {
          console.warn(`User profile not found for uid: ${uid}`)
          return null
        }

        const statsData = Array.isArray(data.user_stats)
          ? data.user_stats[0]
          : data.user_stats
        const stats = statsData
          ? {
              exp: statsData.exp || 0,
              level: statsData.level || 1,
              isPublic: statsData.is_public ?? true,
            }
          : DEFAULT_USER_STATS

        return {
          uid: data.id,
          email: data.email || '',
          username: data.username || '',
          displayName:
            data.displayName || data.display_name || data.username || '',
          photoURL:
            data.photoURL ||
            data.avatar_url ||
            '/assets/image/userEmptyAvatar.png',
          provider: data.provider || 'email',
          createdAt: new Date(data.created_at || new Date()),
          updatedAt: new Date(data.updated_at || new Date()),
          roles: data.roles || ['member'],
          bio: data.bio,
          backgroundURL: data.background_url || null,
          studentId: data.student_id || null,
          schoolIdentity: data.school_identity || null,
          clubIdentity: data.club_identity || null,
          followersPublic: data.followers_public ?? true,
          followingPublic: data.following_public ?? true,
          stats,
        } as UserProfile
      } catch (error) {
        console.error('獲取使用者資料時發生例外錯誤:', error)
        return null
      }
    },
    [supabase],
  )

  //* 從 username 獲取使用者資料
  const getUserProfileByUsername = async (
    username: string,
  ): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single()

      if (error || !data) return null
      return getUserProfile(data.id)
    } catch (error) {
      console.error('從 username 獲取使用者資料時發生錯誤:', error)
      return null
    }
  }

  //* 電子郵件登入
  const signInWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        // 抓取包含 username 跟 stats 在內的個人資料
        const userProfile = await getUserProfile(data.user.id)
        setUser(userProfile)
      }
    } catch (error) {
      console.error('電子郵件登入失敗:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  //* Google 登入（如果已有設定好網址跟 Oauth 設定即可）
  const signInWithGoogle = async (next?: string) => {
    try {
      setLoading(true)
      const redirectTo = next
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
        : `${window.location.origin}/auth/callback`

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      })

      if (error) throw error
    } catch (error) {
      console.error('Google 登入失敗:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  //* 註冊新使用者
  const register = async (
    data: RegisterFormData,
  ): Promise<{ requiresEmailConfirmation: boolean }> => {
    try {
      setLoading(true)

      let finalUsername = data.username?.trim()
      // 如果未提供 username，則從 email 中提取 @ 之前的字串作為 username
      if ((!finalUsername || finalUsername === '') && data.email) {
        finalUsername = data.email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '_')
      }

      if (!data.email || !data.password) {
        throw new Error('請提供信箱與密碼')
      }

      const avatarUrl =
        data.photoURL?.trim() || '/assets/image/userEmptyAvatar.png'

      // 透過 options.data 將自訂的屬性（包含 username, displayName 與註冊身分）附加到 raw_user_meta_data 中
      // Supabase 的 Database Trigger 將根據這些屬性在 users table 建立對應的行
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            username: finalUsername,
            display_name: data.displayName || finalUsername,
            avatar_url: avatarUrl,
            student_id: data.studentId?.trim() || null,
            school_identity: data.schoolIdentity || null,
            club_identity: data.clubIdentity || null,
          },
        },
      })

      if (error) throw error

      // session 為 null 表示 Supabase 要求信箱驗證，尚未建立 session
      const requiresEmailConfirmation = !signUpData.session

      if (signUpData.user && !requiresEmailConfirmation) {
        const userProfile = await getUserProfile(signUpData.user.id)
        setUser(userProfile)
      }

      return { requiresEmailConfirmation }
    } catch (error) {
      console.error('註冊失敗:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  //* 登出
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      setSupabaseUser(null)
      supabaseUserIdRef.current = null
      setIsAdmin(false)
      setIsSuperAdmin(false)
      setIsSemesterMember(false)
    } catch (error) {
      console.error('登出失敗:', error)
      throw error
    }
  }

  //* 更新使用者個人資料
  const updateUserProfile = async (
    uid: string,
    updateData: Partial<UserProfile>,
  ): Promise<void> => {
    try {
      const payload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }

      if (updateData.username !== undefined) payload.username = updateData.username
      if (updateData.displayName !== undefined) {
        payload.display_name = updateData.displayName
      }
      if (updateData.photoURL !== undefined) payload.avatar_url = updateData.photoURL
      if (updateData.bio !== undefined) payload.bio = updateData.bio
      if (updateData.backgroundURL !== undefined) {
        payload.background_url = updateData.backgroundURL
      }
      if (updateData.studentId !== undefined) payload.student_id = updateData.studentId
      if (updateData.schoolIdentity !== undefined) {
        payload.school_identity = updateData.schoolIdentity
      }
      if (updateData.clubIdentity !== undefined) {
        payload.club_identity = updateData.clubIdentity
      }

      const { error } = await supabase
        .from('users')
        .update(payload)
        .eq('id', uid)

      if (error) throw error

      if (user && user.uid === uid) {
        setUser({ ...user, ...updateData })
      }
    } catch (error) {
      console.error('更新使用者資料時發生錯誤:', error)
      throw error
    }
  }

  //* 搜尋使用者
  const searchUsers = async (searchTerm: string, limit: number = 10) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url')
        // Supabase 提供 ilike，不分大小寫的模糊搜索
        .ilike('username', `%${searchTerm}%`)
        .limit(limit)

      if (error) throw error

      return (data || []).map(
        (doc: {
          id: string
          username: string
          display_name: string | null
          avatar_url: string | null
        }) => ({
          uid: doc.id,
          username: doc.username,
          displayName: doc.display_name || doc.username,
          photoURL: doc.avatar_url || '/assets/image/userEmptyAvatar.png',
        }),
      )
    } catch (error) {
      console.error('搜尋使用者時發生錯誤:', error)
      return []
    }
  }

  //* 檢查 Email 是否已註冊
  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      // 由於 public.users 沒有儲存 email，我們透過 RPC 函數並使用 security definer 來查詢 auth.users
      const { data, error } = await supabase.rpc('check_email_exists', {
        email_to_check: email,
      })

      if (error) {
        console.error('檢查 Email 是否存在時發生錯誤:', error.message)
        return false
      }

      return !!data
    } catch (error) {
      console.error('檢查 Email 是否存在時發生例外錯誤:', error)
      return false
    }
  }

  //* 監聽 Supabase 認證狀態變化
  useEffect(() => {
    let isMounted = true

    const syncAuthState = async (session: Session | null) => {
      if (!isMounted) return

      try {
        const currentSupabaseUser = session?.user || null
        setSupabaseUser(currentSupabaseUser)
        supabaseUserIdRef.current = currentSupabaseUser?.id ?? null

        if (currentSupabaseUser) {
          const userProfile = await resolveWithTimeout<UserProfile | null>(
            getUserProfile(currentSupabaseUser.id),
            8000,
            null,
          )
          if (!isMounted) return

          setUser(userProfile)

          const roles = userProfile?.roles
          setIsSuperAdmin(isSuperAdminRole(roles))
          setIsAdmin(isAdminRole(roles))

          if (userProfile?.studentId) {
            const isMember = await checkIsSemesterMember(userProfile.studentId)
            setIsSemesterMember(isMember)
          } else {
            setIsSemesterMember(false)
          }
        } else {
          setUser(null)
          setIsAdmin(false)
          setIsSuperAdmin(false)
          setIsSemesterMember(false)
        }
      } catch (error) {
        console.error('同步使用者狀態時發生錯誤:', error)
        if (!isMounted) return
        setUser(null)
        setSupabaseUser(null)
        supabaseUserIdRef.current = null
        setIsAdmin(false)
        setIsSuperAdmin(false)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    const initAuthState = async () => {
      try {
        const { data } = await resolveWithTimeout(
          supabase.auth.getSession(),
          8000,
          { data: { session: null }, error: null },
        )

        await syncAuthState(data.session)
      } catch (error) {
        console.error('初始化使用者狀態時發生例外錯誤:', error)
        if (isMounted) setLoading(false)
      }
    }

    initAuthState()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        // 焦點切換 / token 刷新時，Supabase 會重複觸發事件；若使用者未變則略過，
        // 避免重抓 profile 並產生新的 user 物件參考造成下游元件閃爍
        if (
          (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') &&
          session?.user?.id === supabaseUserIdRef.current
        ) {
          return
        }

        void syncAuthState(session)
      },
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [getUserProfile, supabase, resolveWithTimeout])

  const value: AuthContextType = {
    user,
    supabaseUser,
    loading,
    getUserProfile,
    getUserProfileByUsername,
    signInWithEmail,
    signInWithGoogle,
    signOut,
    register,
    updateUserProfile,
    searchUsers,
    isAdmin,
    isSuperAdmin,
    isSemesterMember,
    checkEmailExists,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
