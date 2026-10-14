/**
 * 課程包：匯出、匯入預覽與匯入
 * 跨學期複製 = 匯出 → 換 slug（retargetBundle）→ 匯入，所以只有這一條寫入路徑
 * 不做權限檢查：API 須先 requireDashboardAccess('courses')
 */

import { createAdminClient } from '@/app/utils/supabase/admin'
import {
  copyMedia,
  deleteMediaPrefix,
  newMediaFolder,
  parseMediaUrl,
} from '@/app/utils/media/r2'
import { toSlug, validateCourseBundle } from '@/app/utils/dashboard/courseBundleFormat'
import type { CourseContentType } from '@/app/types/course-admin'
import type {
  CourseBundle,
  CourseBundleChapter,
  CourseBundlePreview,
  CourseBundleProgram,
} from '@/app/types/course-bundle'

/** 可以預期的錯誤（格式、slug 重複），API 回 400 並顯示訊息 */
export class CourseBundleError extends Error {
  constructor(public readonly errors: string[]) {
    super(errors.join('\n'))
  }
}

/**
 * 匯出課程（依章節、課程順序），程式檔以內嵌程式碼匯出
 * @param courseIds - 要匯出的課程；所屬章節一併帶出標題
 */
export async function exportCourseBundle(courseIds: string[]): Promise<CourseBundle> {
  const admin = createAdminClient()
  const { data: courses, error } = await admin
    .from('courses')
    .select('id, chapter_id, name, description, reward_exp, order_index')
    .in('id', courseIds)
  if (error) throw new Error(error.message)
  if (!courses?.length) throw new CourseBundleError(['找不到要匯出的課程'])

  const [{ data: chapters, error: chapterError }, { data: contents, error: contentError }] =
    await Promise.all([
      admin
        .from('chapters')
        .select('id, title, order_index')
        .in('id', [...new Set(courses.map((c) => c.chapter_id))])
        .order('order_index'),
      admin
        .from('course_contents')
        .select('course_id, type, content, order_index, programs(id, name, language, code_content)')
        .in('course_id', courses.map((c) => c.id))
        .order('order_index'),
    ])
  if (chapterError) throw new Error(chapterError.message)
  if (contentError) throw new Error(contentError.message)

  // 程式檔 key 由檔名產生，重複時加序號
  const programKeys = new Map<string, string>()
  const programs: CourseBundleProgram[] = []
  for (const row of contents ?? []) {
    const p = row.programs as unknown as
      | { id: string; name: string; language: string | null; code_content: string }
      | null
    if (!p || programKeys.has(p.id)) continue
    const base = toSlug(p.name.replace(/\.[^.]+$/, '')) || 'program'
    let key = base
    for (let n = 2; programs.some((x) => x.key === key); n++) key = `${base}-${n}`
    programKeys.set(p.id, key)
    programs.push({ key, name: p.name, language: p.language, code: p.code_content })
  }

  const bundleChapters: CourseBundleChapter[] = (chapters ?? []).map((chapter) => ({
    title: chapter.title,
    courses: courses
      .filter((c) => c.chapter_id === chapter.id)
      .sort((a, b) => a.order_index - b.order_index)
      .map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        reward_exp: c.reward_exp,
        blocks: (contents ?? [])
          .filter((row) => row.course_id === c.id)
          .map((row) => {
            const p = row.programs as unknown as { id: string } | null
            return {
              type: row.type as CourseContentType,
              content: row.content,
              ...(p ? { program: programKeys.get(p.id) } : {}),
            }
          }),
      })),
  }))

  return { version: 1, chapters: bundleChapters, programs }
}

/**
 * 檢查課程包並列出匯入後的結果，不寫入任何資料
 * @param semesterId - 目標學期；同名章節會沿用，其餘新建
 */
export async function previewCourseBundle(
  raw: unknown,
  semesterId: string,
): Promise<CourseBundlePreview & { bundle: CourseBundle | null }> {
  const { bundle, errors, warnings } = validateCourseBundle(raw)
  const admin = createAdminClient()

  const { data: semester, error: semesterError } = await admin
    .from('semesters')
    .select('id')
    .eq('id', semesterId)
    .maybeSingle()
  if (semesterError) throw new Error(semesterError.message)
  if (!semester) errors.push('找不到目標學期')

  const empty = { errors, warnings, chapters: [], programCount: 0, mediaCount: 0 }
  if (!bundle || !semester) return { ...empty, bundle: null }

  const courseIds = bundle.chapters.flatMap((ch) => ch.courses.map((c) => c.id))
  const [{ data: taken, error: takenError }, { data: existingChapters, error: chapterError }] =
    await Promise.all([
      admin.from('courses').select('id').in('id', courseIds),
      admin.from('chapters').select('title').eq('semester_id', semesterId),
    ])
  if (takenError) throw new Error(takenError.message)
  if (chapterError) throw new Error(chapterError.message)
  for (const { id } of taken ?? []) {
    errors.push(`課程 slug「${id}」已被使用，請改一個`)
  }

  const existingTitles = new Set((existingChapters ?? []).map((ch) => ch.title))
  const preview: CourseBundlePreview = {
    errors,
    warnings,
    chapters: bundle.chapters.map((ch) => ({
      title: ch.title,
      existing: existingTitles.has(ch.title),
      courses: ch.courses.map((c) => ({ id: c.id, name: c.name, blockCount: c.blocks.length })),
    })),
    programCount: bundle.programs?.length ?? 0,
    mediaCount: bundle.chapters
      .flatMap((ch) => ch.courses.flatMap((c) => c.blocks))
      .filter((b) => b.type === 'image' && parseMediaUrl(b.content)).length,
  }
  return { ...preview, bundle: errors.length > 0 ? null : bundle }
}

/**
 * 匯入課程包到指定學期，課程一律為草稿
 * 沒有資料庫交易：先完整檢查，寫到一半失敗時刪掉這次建立的所有資料再拋出錯誤
 * @returns 建立的課程 slug
 */
export async function importCourseBundle(raw: unknown, semesterId: string): Promise<string[]> {
  const preview = await previewCourseBundle(raw, semesterId)
  if (!preview.bundle) throw new CourseBundleError(preview.errors)
  const bundle = preview.bundle

  const admin = createAdminClient()
  const created = { programIds: [] as string[], chapterIds: [] as string[], courseIds: [] as string[] }

  try {
    // 程式檔：每次匯入都建立新的一份，修改時不會影響其他學期的課程
    const programIds = new Map<string, string>()
    // 逐筆新增：批次 insert 回傳的順序沒有保證，對不回 key
    for (const p of bundle.programs ?? []) {
      const { data, error } = await admin
        .from('programs')
        .insert({ name: p.name, language: p.language, code_content: p.code })
        .select('id')
        .single()
      if (error) throw new Error(error.message)
      programIds.set(p.key, data.id)
      created.programIds.push(data.id)
    }

    const { data: existingChapters, error: chapterError } = await admin
      .from('chapters')
      .select('id, title, order_index')
      .eq('semester_id', semesterId)
    if (chapterError) throw new Error(chapterError.message)
    let nextChapterOrder = Math.max(0, ...(existingChapters ?? []).map((ch) => ch.order_index)) + 1

    for (const chapter of bundle.chapters) {
      let chapterId = existingChapters?.find((ch) => ch.title === chapter.title)?.id
      if (!chapterId) {
        const { data, error } = await admin
          .from('chapters')
          .insert({ semester_id: semesterId, title: chapter.title, order_index: nextChapterOrder++ })
          .select('id')
          .single()
        if (error) throw new Error(error.message)
        chapterId = data.id as string
        created.chapterIds.push(chapterId)
      }

      const { data: last, error: lastError } = await admin
        .from('courses')
        .select('order_index')
        .eq('chapter_id', chapterId)
        .order('order_index', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (lastError) throw new Error(lastError.message)
      let nextCourseOrder = (last?.order_index ?? 0) + 1

      for (const course of chapter.courses) {
        const { error } = await admin.from('courses').insert({
          id: course.id,
          chapter_id: chapterId,
          name: course.name,
          description: course.description ?? null,
          reward_exp: course.reward_exp ?? 0,
          order_index: nextCourseOrder++,
          is_published: false,
        })
        if (error) throw new Error(error.message)
        created.courseIds.push(course.id)

        // R2 圖片複製到新課程的資料夾；外部網址照舊
        const rows = await Promise.all(
          course.blocks.map(async (block, i) => ({
            course_id: course.id,
            type: block.type,
            content:
              block.type === 'image' && parseMediaUrl(block.content)
                ? await copyMedia(block.content, newMediaFolder('course', course.id))
                : block.content,
            program_id: block.program ? programIds.get(block.program) : null,
            order_index: i + 1,
          })),
        )
        if (rows.length > 0) {
          const { error: contentError } = await admin.from('course_contents').insert(rows)
          if (contentError) throw new Error(contentError.message)
        }
      }
    }

    return created.courseIds
  } catch (error) {
    await rollbackImport(created)
    throw error
  }
}

/** 刪除匯入到一半建立的資料（反向順序，避開外鍵） */
async function rollbackImport(created: {
  programIds: string[]
  chapterIds: string[]
  courseIds: string[]
}) {
  const admin = createAdminClient()
  const steps = [
    () => admin.from('course_contents').delete().in('course_id', created.courseIds),
    () => admin.from('courses').delete().in('id', created.courseIds),
    () => admin.from('chapters').delete().in('id', created.chapterIds),
    () => admin.from('programs').delete().in('id', created.programIds),
  ]
  for (const step of steps) {
    const { error } = await step()
    if (error) console.error('課程包匯入回復失敗', error)
  }
  await Promise.all(
    created.courseIds.map((id) => deleteMediaPrefix(`courses/${id}/`).catch(console.error)),
  )
}
