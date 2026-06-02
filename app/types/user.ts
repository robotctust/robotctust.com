import { User } from '@supabase/supabase-js'

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'admin_course'
  | 'admin_achievement'
  | 'admin_verifications'
  | 'admin_news'
  | 'admin_accounts'
  | 'admin_members'
  | 'admin_calendar'
  | 'member'

export type SchoolIdentity = 'current_student' | 'teacher' | 'external' | 'alumni'
export type ClubIdentity = 'member' | 'non_member'

export interface UserProfile extends Record<string, unknown> {
  uid: string
  email: string
  username: string // 帳號名稱（英文大小寫、_、-）
  displayName: string // 暱稱（公開顯示名稱）
  photoURL: string
  provider: 'email' | 'google'
  createdAt: Date
  updatedAt: Date
  roles: UserRole[]
  // 新增社群功能相關欄位
  bio?: string // 個人簡介
  backgroundURL?: string // 背景圖片網址
  studentId?: string | null
  schoolIdentity?: SchoolIdentity | null
  clubIdentity?: ClubIdentity | null
  // 統計資料
  stats: {
    exp: number
    level: number
    isPublic: boolean
  }
}

export const ALL_ROLES: UserRole[] = [
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

export const getUserRoleName = (role: UserRole, t?: any) => {
  if (t) return t(role)
  switch (role) {
    case 'super_admin':
      return '超級管理員'
    case 'admin':
      return '管理員'
    case 'admin_course':
      return '課程管理員'
    case 'admin_achievement':
      return '成就管理員'
    case 'admin_verifications':
      return '課程驗證員'
    case 'admin_news':
      return '新聞發布員'
    case 'admin_accounts':
      return '帳號管理員'
    case 'admin_members':
      return '社員管理員'
    case 'admin_calendar':
      return '行事曆管理員'
    case 'member':
      return '一般會員'
  }
}

//* 預設使用者統計資料
export const DEFAULT_USER_STATS = {
  exp: 0,
  level: 1,
  isPublic: true,
}

export interface RegisterFormData {
  email?: string
  password?: string
  confirmPassword?: string
  username?: string // 修改為選填
  displayName?: string // 使其選填以免報錯
  photoURL?: string
  studentId?: string
  schoolIdentity?: SchoolIdentity
  clubIdentity?: ClubIdentity
}

export interface LoginFormData {
  email: string
  password: string
}

export interface AuthContextType {
  user: UserProfile | null
  loading: boolean
  getUserProfile: (uid: string) => Promise<UserProfile | null>
  getUserProfileByUsername: (username: string) => Promise<UserProfile | null>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signInWithGoogle: (next?: string) => Promise<void>
  signOut: () => Promise<void>
  register: (
    data: RegisterFormData,
  ) => Promise<{ requiresEmailConfirmation: boolean }>
  updateUserProfile: (
    uid: string,
    updateData: Partial<UserProfile>,
  ) => Promise<void>
  searchUsers: (
    searchTerm: string,
    limit?: number,
  ) => Promise<UserSearchResult[]>
  isAdmin: boolean
  isSuperAdmin: boolean
  isSemesterMember: boolean
  supabaseUser: User | null // 修改為 Supabase User 對象
  checkEmailExists: (email: string) => Promise<boolean>
}

export interface UpdateUserRolesData {
  uid: string
  roles?: UserRole[]
}

//* 更新使用者個人資料的資料結構
export interface UpdateUserProfileData {
  displayName?: string
  bio?: string
}

//* 使用者搜尋結果
export interface UserSearchResult {
  uid: string
  username: string
  displayName: string
  photoURL: string
  bio?: string
}

//* 建立完整使用者資料的輔助函數
export const createDefaultUserProfile = (
  firebaseUser: User,
  additionalData: Partial<UserProfile>,
): UserProfile => {
  return {
    uid: firebaseUser.id,
    email: firebaseUser.email || '',
    username: additionalData.username || '',
    displayName:
      additionalData.displayName || firebaseUser.user_metadata?.full_name || '',
    photoURL:
      additionalData.photoURL ||
      firebaseUser.user_metadata?.avatar_url ||
      '/assets/image/userEmptyAvatar.png',
    backgroundURL: additionalData.backgroundURL,
    provider: additionalData.provider || 'email',
    roles: ['member'],
    stats: DEFAULT_USER_STATS,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...additionalData,
  }
}
