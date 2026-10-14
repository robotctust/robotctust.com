/**
 * 課程包格式：驗證與 slug 處理
 * 純函式、不碰資料庫，後台頁面、API 與 scripts/course-bundle.ts 共用
 */

import type { CourseContentType } from '@/app/types/course-admin'
import type {
  CourseBundle,
  CourseBundleBlock,
  CourseBundleCourse,
  CourseBundleProgram,
} from '@/app/types/course-bundle'

export const COURSE_BLOCK_TYPES: CourseContentType[] = [
  'header1',
  'header2',
  'header3',
  'markdown',
  'text',
  'code',
  'image',
]

/** 課程 slug：小寫英數字，以單一連字號分隔 */
export const COURSE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const COURSE_SLUG_MAX = 100

/**
 * 轉成 slug（去掉重音符號與非英數字，空白轉連字號）
 * @returns 可能是空字串（例如全中文），呼叫端自行決定後備值
 */
export function toSlug(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * 複製到其他學期時換掉課程 slug 裡的學期：
 * slug 含來源學期（如 `robot-intro-114-2`）就換成目標學期，否則在後面加上目標學期
 */
export function retargetCourseSlug(
  id: string,
  fromSemesterName: string,
  toSemesterName: string,
): string {
  const from = toSlug(fromSemesterName)
  const to = toSlug(toSemesterName)
  if (!to) return id
  const index = from ? id.lastIndexOf(from) : -1
  if (index >= 0) return id.slice(0, index) + to + id.slice(index + from.length)
  return `${id}-${to}`
}

export function retargetBundle(
  bundle: CourseBundle,
  fromSemesterName: string,
  toSemesterName: string,
): CourseBundle {
  return {
    ...bundle,
    chapters: bundle.chapters.map((chapter) => ({
      ...chapter,
      courses: chapter.courses.map((course) => ({
        ...course,
        id: retargetCourseSlug(course.id, fromSemesterName, toSemesterName),
      })),
    })),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

/**
 * 檢查課程包格式
 * 只檢查格式本身；slug 是否已被使用要查資料庫，由 previewCourseBundle 負責
 * @returns 整理過的課程包（字串去頭尾空白），有錯誤時為 null
 */
export function validateCourseBundle(raw: unknown): {
  bundle: CourseBundle | null
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  if (!isRecord(raw)) {
    return { bundle: null, errors: ['最外層必須是 JSON 物件'], warnings }
  }
  if (raw.version !== 1) errors.push('version 必須是 1')
  if (!Array.isArray(raw.chapters) || raw.chapters.length === 0) {
    errors.push('chapters 必須是至少有一個章節的陣列')
    return { bundle: null, errors, warnings }
  }

  // 程式檔
  const programs: CourseBundleProgram[] = []
  const programKeys = new Set<string>()
  if (raw.programs !== undefined && !Array.isArray(raw.programs)) {
    errors.push('programs 必須是陣列')
  }
  const rawPrograms: unknown[] = Array.isArray(raw.programs) ? raw.programs : []
  rawPrograms.forEach((p, i) => {
    const at = `programs[${i}]`
    if (!isRecord(p)) return errors.push(`${at}：必須是物件`)
    if (!isNonEmptyString(p.key)) return errors.push(`${at}.key：必填`)
    if (programKeys.has(p.key)) errors.push(`${at}.key：「${p.key}」重複`)
    if (!isNonEmptyString(p.name)) errors.push(`${at}.name：必填`)
    if (!isNonEmptyString(p.code)) errors.push(`${at}.code：必填`)
    if (p.language != null && typeof p.language !== 'string') {
      errors.push(`${at}.language：必須是字串`)
    }
    programKeys.add(p.key)
    programs.push({
      key: p.key,
      name: String(p.name ?? '').trim(),
      language: typeof p.language === 'string' && p.language.trim() ? p.language.trim() : null,
      code: String(p.code ?? ''),
    })
  })

  // 章節、課程、區塊
  const usedPrograms = new Set<string>()
  const courseIds = new Set<string>()
  const chapters = (raw.chapters as unknown[]).map((c, ci) => {
    const at = `chapters[${ci}]`
    if (!isRecord(c)) {
      errors.push(`${at}：必須是物件`)
      return { title: '', courses: [] }
    }
    if (!isNonEmptyString(c.title)) errors.push(`${at}.title：必填`)
    if (!Array.isArray(c.courses) || c.courses.length === 0) {
      errors.push(`${at}.courses：必須是至少有一堂課程的陣列`)
    }
    const courses = (Array.isArray(c.courses) ? c.courses : []).map(
      (course: unknown, ki): CourseBundleCourse => {
        const cat = `${at}.courses[${ki}]`
        if (!isRecord(course)) {
          errors.push(`${cat}：必須是物件`)
          return { id: '', name: '', blocks: [] }
        }
        const id = typeof course.id === 'string' ? course.id.trim() : ''
        if (!COURSE_SLUG_PATTERN.test(id) || id.length > COURSE_SLUG_MAX) {
          errors.push(`${cat}.id：「${id}」不是有效的 slug（小寫英數字與連字號，最多 ${COURSE_SLUG_MAX} 字）`)
        } else if (courseIds.has(id)) {
          errors.push(`${cat}.id：「${id}」在課程包內重複`)
        }
        courseIds.add(id)
        if (!isNonEmptyString(course.name)) errors.push(`${cat}.name：必填`)
        if (course.description != null && typeof course.description !== 'string') {
          errors.push(`${cat}.description：必須是字串`)
        }
        if (
          course.reward_exp !== undefined &&
          !(Number.isInteger(course.reward_exp) && (course.reward_exp as number) >= 0)
        ) {
          errors.push(`${cat}.reward_exp：必須是 0 以上的整數`)
        }
        if (!Array.isArray(course.blocks)) errors.push(`${cat}.blocks：必須是陣列`)
        const rawBlocks: unknown[] = Array.isArray(course.blocks) ? course.blocks : []
        if (rawBlocks.length === 0) warnings.push(`${cat}：「${id}」沒有任何內容區塊`)

        const blocks = rawBlocks.map((b, bi): CourseBundleBlock => {
          const bat = `${cat}.blocks[${bi}]`
          if (!isRecord(b)) {
            errors.push(`${bat}：必須是物件`)
            return { type: 'text', content: '' }
          }
          const type = b.type as CourseContentType
          if (!COURSE_BLOCK_TYPES.includes(type)) {
            errors.push(`${bat}.type：不支援「${String(b.type)}」，只能是 ${COURSE_BLOCK_TYPES.join(' / ')}`)
          }
          if (!isNonEmptyString(b.content)) errors.push(`${bat}.content：必填`)
          const content = typeof b.content === 'string' ? b.content.trim() : ''
          if (type === 'image' && content && !/^https:\/\/\S+$/.test(content)) {
            errors.push(`${bat}.content：圖片必須是 https 網址`)
          }
          let program: string | null = null
          if (b.program != null) {
            if (typeof b.program !== 'string' || !programKeys.has(b.program)) {
              errors.push(`${bat}.program：找不到程式檔「${String(b.program)}」`)
            } else {
              program = b.program
              usedPrograms.add(b.program)
            }
          }
          return { type, content, program }
        })

        return {
          id,
          name: String(course.name ?? '').trim(),
          description:
            typeof course.description === 'string' && course.description.trim()
              ? course.description.trim()
              : null,
          reward_exp: typeof course.reward_exp === 'number' ? course.reward_exp : 0,
          blocks,
        }
      },
    )
    return { title: String(c.title ?? '').trim(), courses }
  })

  for (const key of programKeys) {
    if (!usedPrograms.has(key)) warnings.push(`programs：「${key}」沒有任何區塊使用，不會匯入`)
  }

  if (errors.length > 0) return { bundle: null, errors, warnings }
  return {
    bundle: {
      version: 1,
      chapters,
      programs: programs.filter((p) => usedPrograms.has(p.key)),
    },
    errors,
    warnings,
  }
}
