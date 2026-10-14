import type { CourseContentType } from '@/app/types/course-admin'

/**
 * 課程包：匯出、匯入、跨學期複製共用的 JSON 格式（格式說明見 courseBundleGuide.ts）
 */
export interface CourseBundle {
  version: 1
  chapters: CourseBundleChapter[]
  programs?: CourseBundleProgram[]
}

export interface CourseBundleChapter {
  title: string
  courses: CourseBundleCourse[]
}

export interface CourseBundleCourse {
  /** 課程 slug（網址），全站唯一 */
  id: string
  name: string
  description?: string | null
  reward_exp?: number
  blocks: CourseBundleBlock[]
}

export interface CourseBundleBlock {
  type: CourseContentType
  content: string
  /** 對應 programs[].key */
  program?: string | null
}

export interface CourseBundleProgram {
  /** 只在課程包內用來對應區塊，不會寫入資料庫 */
  key: string
  name: string
  language?: string | null
  code: string
}

/** 匯入前的預覽與檢查結果 */
export interface CourseBundlePreview {
  errors: string[]
  warnings: string[]
  chapters: {
    title: string
    /** 目標學期已有同名章節，課程會加在它後面 */
    existing: boolean
    courses: { id: string; name: string; blockCount: number }[]
  }[]
  programCount: number
  /** 需要複製到新課程資料夾的 R2 圖片數 */
  mediaCount: number
}
