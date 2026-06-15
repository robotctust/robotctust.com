/**
 * 序列化類型定義
 * 用於處理 Next.js App Router 中的資料傳遞
 */

import { UserProfile } from './user'
import { Post, PostCategory } from './post'

//* 序列化後的使用者資料（所有 Date 轉為 string）
export interface SerializedUserProfile {
  uid: string
  email: string
  username: string
  displayName: string
  photoURL: string
  provider: 'email' | 'google'
  createdAt: string // Date -> string
  updatedAt: string // Date -> string
  roles: UserProfile['roles']
  // 新增社群功能相關欄位
  bio?: string
  backgroundURL?: string
  // 追蹤清單可見性
  followersPublic: boolean
  followingPublic: boolean
  // 統計資料
  stats: {
    exp: number
    level: number
    isPublic: boolean
  }
}

//* 序列化後的文章資料（所有 Date 轉為 string）
export interface SerializedPost {
  id: string
  title: string
  contentMarkdown: string
  category: PostCategory
  coverImageUrl: string | null
  authorId: string
  authorDisplayName: string
  authorUsername: string | null
  createdAt: string // Timestamp -> string
  updatedAt: string // Timestamp -> string
}

//* 將 UserProfile 序列化為可傳遞給客戶端的格式
export const serializeUserProfile = (
  user: UserProfile
): SerializedUserProfile => {
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }
}

//* 將序列化的使用者資料還原為 UserProfile
export const deserializeUserProfile = (
  serializedUser: SerializedUserProfile
): UserProfile => {
  return {
    ...serializedUser,
    createdAt: new Date(serializedUser.createdAt),
    updatedAt: new Date(serializedUser.updatedAt),
  }
}

//* 將 Post 序列化為可傳遞給客戶端的格式（timestamps 已是 ISO string，直接傳遞）
export const serializePost = (post: Post): SerializedPost => post

//* 將序列化的文章資料還原為 Post（timestamps 已是 ISO string，直接傳遞）
export const deserializePost = (serializedPost: SerializedPost): Post => serializedPost

//* 安全地序列化任何包含 Date 的物件
export const serializeDates = <T extends Record<string, unknown>>(
  obj: T
): T => {
  const serialized = { ...obj }

  for (const key in serialized) {
    const value = serialized[key]

    if (value instanceof Date) {
      // 將 Date 轉為 ISO 字串
      ;(serialized as Record<string, unknown>)[key] = value.toISOString()
    } else if (
      value &&
      typeof value === 'object' &&
      value !== null &&
      'toDate' in value &&
      typeof (value as { toDate: unknown }).toDate === 'function'
    ) {
      // 處理 Firestore Timestamp
      ;(serialized as Record<string, unknown>)[key] = (
        value as { toDate: () => Date }
      )
        .toDate()
        .toISOString()
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      // 遞迴處理巢狀物件
      ;(serialized as Record<string, unknown>)[key] = serializeDates(
        value as Record<string, unknown>
      )
    } else if (Array.isArray(value)) {
      // 處理陣列
      ;(serialized as Record<string, unknown>)[key] = value.map((item) =>
        item && typeof item === 'object'
          ? serializeDates(item as Record<string, unknown>)
          : item
      )
    }
  }

  return serialized
}

//* 安全地反序列化包含日期字串的物件
export const deserializeDates = <T extends Record<string, unknown>>(
  obj: T,
  dateFields: string[] = ['createdAt', 'updatedAt']
): T => {
  const deserialized = { ...obj }

  for (const field of dateFields) {
    if (deserialized[field] && typeof deserialized[field] === 'string') {
      try {
        ;(deserialized as Record<string, unknown>)[field] = new Date(
          deserialized[field] as string
        )
      } catch {
        console.warn(`無法解析日期欄位 ${field}:`, deserialized[field])
      }
    }
  }

  return deserialized
}

//* 檢查物件是否包含不可序列化的內容
export const hasUnserializableContent = (obj: unknown): boolean => {
  if (obj === null || obj === undefined) return false

  if (obj instanceof Date) return true

  // 檢查 Firestore Timestamp
  if (
    obj &&
    typeof obj === 'object' &&
    'toDate' in obj &&
    typeof (obj as { toDate: unknown }).toDate === 'function'
  ) {
    return true
  }

  if (typeof obj === 'function') return true

  if (Array.isArray(obj)) {
    return obj.some((item) => hasUnserializableContent(item))
  }

  if (typeof obj === 'object') {
    return Object.values(obj).some((value) => hasUnserializableContent(value))
  }

  return false
}

//* 清理物件以確保可以安全序列化
export const sanitizeForSerialization = <T>(obj: T): T => {
  if (hasUnserializableContent(obj)) {
    return serializeDates(obj as Record<string, unknown>) as T
  }
  return obj
}
