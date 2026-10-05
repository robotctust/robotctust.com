/**
 * 課程管理
 * @description 課程管理，包括學期、章節、課程、內容的增刪改查與重新排序
 * @author John Lin
 */

import { createAdminClient } from '@/app/utils/supabase/admin'
import {
  Chapter,
  ChapterTreeNode,
  Course,
  CourseContent,
  CourseContentType,
  CourseTreeNode,
  CourseWorkspacePayload,
  CurriculumOverviewPayload,
  CurriculumPayload,
  Semester,
  SemesterTreeNode,
  Program
} from '@/app/types/course-admin'

type ReorderTable = 'chapters' | 'courses' | 'course_contents'

interface ReorderItem {
  id: string
  order_index: number
}

interface CreateSemesterInput {
  name: string
  is_active?: boolean
}

interface UpdateSemesterInput {
  id: string
  name?: string
  is_active?: boolean
}

interface CreateChapterInput {
  semester_id: string
  title: string
}

interface UpdateChapterInput {
  id: string
  title?: string
  semester_id?: string
}

interface CreateCourseInput {
  chapter_id: string
  id?: string
  name: string
  description?: string
  order_index?: number
  reward_exp?: number
  is_published?: boolean
}

interface UpdateCourseInput {
  id: string
  new_id?: string
  chapter_id?: string
  name?: string
  description?: string | null
  order_index?: number
  reward_exp?: number
  is_published?: boolean
}

interface CreateCourseContentInput {
  course_id: string
  type: string
  content: string
  program_id?: string | null
}

interface UpdateCourseContentInput {
  id: string
  type?: string
  content?: string
  program_id?: string | null
}

const semesterColumns = 'id, name, is_active, created_at'
const chapterColumns = 'id, semester_id, title, order_index, created_at'
const courseColumns =
  'id, chapter_id, name, description, order_index, is_published, reward_exp, created_at'
const courseContentColumns =
  'id, course_id, type, content, program_id, order_index, created_at, programs(id, name, language, code_content, created_at)'

function sanitizeSlug(value: string): string {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  if (normalized) return normalized

  return `course-${Date.now().toString(36)}`
}

async function getNextOrderIndex(
  table: ReorderTable,
  filterColumn: string,
  filterValue: string,
): Promise<number> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from(table)
    .select('order_index')
    .eq(filterColumn, filterValue)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)

  return (data?.order_index || 0) + 1
}

async function fetchSemesters(): Promise<Semester[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('semesters')
    .select(semesterColumns)
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data || []) as Semester[]
}

async function fetchChapters(semesterIds?: string[]): Promise<Chapter[]> {
  if (semesterIds && semesterIds.length === 0) return []

  const admin = createAdminClient()
  let query = admin
    .from('chapters')
    .select(chapterColumns)
    .order('order_index', { ascending: true })

  if (semesterIds && semesterIds.length > 0) {
    query = query.in('semester_id', semesterIds)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return (data || []) as Chapter[]
}

async function fetchCourses(chapterIds?: string[]): Promise<Course[]> {
  if (chapterIds && chapterIds.length === 0) return []

  const admin = createAdminClient()
  let query = admin
    .from('courses')
    .select(courseColumns)
    .order('order_index', { ascending: true })

  if (chapterIds && chapterIds.length > 0) {
    query = query.in('chapter_id', chapterIds)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return (data || []) as Course[]
}

async function fetchCourseContents(courseIds?: string[]): Promise<CourseContent[]> {
  if (courseIds && courseIds.length === 0) return []

  const admin = createAdminClient()
  let query = admin
    .from('course_contents')
    .select(courseContentColumns)
    .order('order_index', { ascending: true })

  if (courseIds && courseIds.length > 0) {
    query = query.in('course_id', courseIds)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return (data || []).map((content: any) => ({
    ...content,
    program: content.programs,
  })) as CourseContent[]
}

async function fetchPrograms(): Promise<Program[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('programs')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data || []) as Program[]
}

function buildSemesterTree(
  semesters: Semester[],
  chapters: Chapter[],
  courses: Course[],
  contents: CourseContent[],
): SemesterTreeNode[] {
  const courseMap = new Map<string, CourseTreeNode>()

  for (const course of courses) {
    courseMap.set(course.id, { ...course, contents: [] })
  }

  for (const content of contents) {
    const course = courseMap.get(content.course_id)
    if (course) {
      course.contents.push(content)
    }
  }

  const chapterMap = new Map<string, ChapterTreeNode>()
  for (const chapter of chapters) {
    chapterMap.set(chapter.id, { ...chapter, courses: [] })
  }

  for (const course of courses) {
    const chapter = chapterMap.get(course.chapter_id)
    const courseNode = courseMap.get(course.id)
    if (chapter && courseNode) {
      chapter.courses.push(courseNode)
    }
  }

  return semesters.map((semester) => {
    const semesterChapters = chapters
      .filter((chapter) => chapter.semester_id === semester.id)
      .map((chapter) => chapterMap.get(chapter.id))
      .filter((chapter): chapter is ChapterTreeNode => Boolean(chapter))

    const semesterCourses = semesterChapters.flatMap((chapter) => chapter.courses)

    return {
      ...semester,
      chapters: semesterChapters,
      stats: {
        chapterCount: semesterChapters.length,
        courseCount: semesterCourses.length,
        publishedCourseCount: semesterCourses.filter((course) => course.is_published)
          .length,
        draftCourseCount: semesterCourses.filter((course) => !course.is_published)
          .length,
      },
    }
  })
}

export async function getCurriculumOverview(): Promise<CurriculumOverviewPayload> {
  const semesters = await fetchSemesters()

  if (semesters.length === 0) {
    return { semesters: [] }
  }

  const chapters = await fetchChapters(semesters.map((semester) => semester.id))
  const courses = await fetchCourses(chapters.map((chapter) => chapter.id))
  const contents = await fetchCourseContents(courses.map((course) => course.id))

  return {
    semesters: buildSemesterTree(semesters, chapters, courses, contents),
  }
}

export async function getCurriculumTree(
  semesterId?: string | null,
): Promise<CurriculumPayload> {
  const overview = await getCurriculumOverview()
  const selectedSemester =
    overview.semesters.find((semester) => semester.id === semesterId) ||
    overview.semesters.find((semester) => semester.is_active) ||
    overview.semesters[0]

  return {
    semesters: overview.semesters.map(({ chapters, stats, ...semester }) => semester),
    chapters: selectedSemester?.chapters || [],
  }
}

export async function getCourseWorkspace(
  courseId: string,
): Promise<CourseWorkspacePayload> {
  const admin = createAdminClient()
  const { data: courseRow, error: courseError } = await admin
    .from('courses')
    .select(courseColumns)
    .eq('id', courseId)
    .maybeSingle()

  if (courseError || !courseRow) {
    throw new Error(courseError?.message || '找不到課程')
  }

  const course = courseRow as Course

  const [contents, chapters, semesters, programs] = await Promise.all([
    fetchCourseContents([course.id]),
    fetchChapters(),
    fetchSemesters(),
    fetchPrograms(),
  ])

  const chapter = chapters.find((row) => row.id === course.chapter_id)
  if (!chapter) {
    throw new Error('找不到課程對應章節')
  }

  return {
    semesters,
    chapters,
    programs,
    course: {
      ...course,
      semester_id: chapter.semester_id,
      contents,
    },
  }
}

export async function createSemester(
  input: CreateSemesterInput,
): Promise<Semester> {
  const admin = createAdminClient()
  const semesters = await fetchSemesters()
  const shouldActivate = input.is_active || semesters.length === 0

  if (shouldActivate) {
    const { error: resetError } = await admin
      .from('semesters')
      .update({ is_active: false })
      .eq('is_active', true) // id 為 uuid，不能用 neq('id', '')，會觸發 22P02
    if (resetError) throw new Error(resetError.message)
  }

  const { data, error } = await admin
    .from('semesters')
    .insert({
      name: input.name,
      is_active: shouldActivate,
    })
    .select(semesterColumns)
    .single()

  if (error) throw new Error(error.message)

  return data as Semester
}

export async function updateSemester(
  input: UpdateSemesterInput,
): Promise<Semester> {
  const admin = createAdminClient()

  if (input.is_active) {
    const { error: resetError } = await admin
      .from('semesters')
      .update({ is_active: false })
      .neq('id', input.id)
    if (resetError) throw new Error(resetError.message)
  }

  const nextValues: Partial<Semester> = {}
  if (typeof input.name === 'string') nextValues.name = input.name
  if (typeof input.is_active === 'boolean') nextValues.is_active = input.is_active

  const { data, error } = await admin
    .from('semesters')
    .update(nextValues)
    .eq('id', input.id)
    .select(semesterColumns)
    .single()

  if (error) throw new Error(error.message)

  return data as Semester
}

export async function deleteSemester(id: string): Promise<void> {
  const admin = createAdminClient()
  const chapters = await fetchChapters([id])
  const chapterIds = chapters.map((chapter) => chapter.id)
  const courses = await fetchCourses(chapterIds)
  const courseIds = courses.map((course) => course.id)

  if (courseIds.length > 0) {
    const { error: contentDeleteError } = await admin
      .from('course_contents')
      .delete()
      .in('course_id', courseIds)
    if (contentDeleteError) throw new Error(contentDeleteError.message)

    const { error: verificationDeleteError } = await admin
      .from('course_verifications')
      .delete()
      .in('course_id', courseIds)
    if (verificationDeleteError) throw new Error(verificationDeleteError.message)

    const { error: courseDeleteError } = await admin
      .from('courses')
      .delete()
      .in('id', courseIds)
    if (courseDeleteError) throw new Error(courseDeleteError.message)
  }

  if (chapterIds.length > 0) {
    const { error: chapterDeleteError } = await admin
      .from('chapters')
      .delete()
      .in('id', chapterIds)
    if (chapterDeleteError) throw new Error(chapterDeleteError.message)
  }

  const { error } = await admin.from('semesters').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function createChapter(
  input: CreateChapterInput,
): Promise<Chapter> {
  const admin = createAdminClient()
  const order_index = await getNextOrderIndex(
    'chapters',
    'semester_id',
    input.semester_id,
  )
  const { data, error } = await admin
    .from('chapters')
    .insert({
      semester_id: input.semester_id,
      title: input.title,
      order_index,
    })
    .select(chapterColumns)
    .single()

  if (error) throw new Error(error.message)

  return data as Chapter
}

export async function updateChapter(
  input: UpdateChapterInput,
): Promise<Chapter> {
  const admin = createAdminClient()
  const nextValues: Partial<Chapter> = {}

  if (typeof input.title === 'string') nextValues.title = input.title

  if (input.semester_id) {
    nextValues.semester_id = input.semester_id
    nextValues.order_index = await getNextOrderIndex(
      'chapters',
      'semester_id',
      input.semester_id,
    )
  }

  const { data, error } = await admin
    .from('chapters')
    .update(nextValues)
    .eq('id', input.id)
    .select(chapterColumns)
    .single()

  if (error) throw new Error(error.message)

  return data as Chapter
}

export async function deleteChapter(id: string): Promise<void> {
  const admin = createAdminClient()
  const courses = await fetchCourses([id])
  const courseIds = courses.map((course) => course.id)

  if (courseIds.length > 0) {
    const { error: contentDeleteError } = await admin
      .from('course_contents')
      .delete()
      .in('course_id', courseIds)
    if (contentDeleteError) throw new Error(contentDeleteError.message)

    const { error: verificationDeleteError } = await admin
      .from('course_verifications')
      .delete()
      .in('course_id', courseIds)
    if (verificationDeleteError) throw new Error(verificationDeleteError.message)

    const { error: courseDeleteError } = await admin
      .from('courses')
      .delete()
      .in('id', courseIds)
    if (courseDeleteError) throw new Error(courseDeleteError.message)
  }

  const { error } = await admin.from('chapters').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function createCourse(input: CreateCourseInput): Promise<Course> {
  const admin = createAdminClient()
  const order_index =
    typeof input.order_index === 'number'
      ? input.order_index
      : await getNextOrderIndex('courses', 'chapter_id', input.chapter_id)
  const generatedId = sanitizeSlug(input.id?.trim() || input.name)

  const { data, error } = await admin
    .from('courses')
    .insert({
      id: generatedId,
      chapter_id: input.chapter_id,
      name: input.name,
      description: input.description || null,
      order_index,
      reward_exp: input.reward_exp || 0,
      is_published: input.is_published || false,
    })
    .select(courseColumns)
    .single()

  if (error) throw new Error(error.message)

  return data as Course
}

export async function updateCourse(input: UpdateCourseInput): Promise<Course> {
  const admin = createAdminClient()
  const nextValues: Partial<Course> = {}

  if (typeof input.new_id === 'string' && input.new_id.trim() !== '') {
    nextValues.id = sanitizeSlug(input.new_id)
  }

  if (typeof input.name === 'string') nextValues.name = input.name
  if (typeof input.description !== 'undefined') {
    nextValues.description = input.description || null
  }
  if (typeof input.reward_exp === 'number') nextValues.reward_exp = input.reward_exp
  if (typeof input.is_published === 'boolean') {
    nextValues.is_published = input.is_published
  }
  if (typeof input.order_index === 'number') {
    nextValues.order_index = input.order_index
  }
  if (input.chapter_id) {
    nextValues.chapter_id = input.chapter_id
    if (typeof input.order_index !== 'number') {
      nextValues.order_index = await getNextOrderIndex(
        'courses',
        'chapter_id',
        input.chapter_id,
      )
    }
  }

  const { data, error } = await admin
    .from('courses')
    .update(nextValues)
    .eq('id', input.id)
    .select(courseColumns)
    .single()

  if (error) throw new Error(error.message)

  return data as Course
}

export async function deleteCourse(id: string): Promise<void> {
  const admin = createAdminClient()

  const { error: contentDeleteError } = await admin
    .from('course_contents')
    .delete()
    .eq('course_id', id)
  if (contentDeleteError) throw new Error(contentDeleteError.message)

  const { error: verificationDeleteError } = await admin
    .from('course_verifications')
    .delete()
    .eq('course_id', id)
  if (verificationDeleteError) throw new Error(verificationDeleteError.message)

  const { error } = await admin.from('courses').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function createCourseContent(
  input: CreateCourseContentInput,
): Promise<CourseContent> {
  const admin = createAdminClient()
  const order_index = await getNextOrderIndex(
    'course_contents',
    'course_id',
    input.course_id,
  )
  const { data, error } = await admin
    .from('course_contents')
    .insert({
      course_id: input.course_id,
      type: input.type,
      content: input.content,
      order_index,
      program_id: input.program_id || null,
    })
    .select(courseContentColumns)
    .single()

  if (error) throw new Error(error.message)

  return data as CourseContent
}

export async function updateCourseContent(
  input: UpdateCourseContentInput,
): Promise<CourseContent> {
  const admin = createAdminClient()
  const nextValues: Partial<CourseContent> = {}

  if (typeof input.type === 'string') {
    nextValues.type = input.type as CourseContentType
  }
  if (typeof input.content === 'string') nextValues.content = input.content
  if (typeof input.program_id !== 'undefined') {
    nextValues.program_id = input.program_id || null
  }

  const { data, error } = await admin
    .from('course_contents')
    .update(nextValues)
    .eq('id', input.id)
    .select(courseContentColumns)
    .single()

  if (error) throw new Error(error.message)

  return data as CourseContent
}

export async function deleteCourseContent(id: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.from('course_contents').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function reorderItems(
  table: ReorderTable,
  rows: ReorderItem[],
): Promise<void> {
  const admin = createAdminClient()

  await Promise.all(
    rows.map(async (row) => {
      const { error } = await admin
        .from(table)
        .update({ order_index: row.order_index })
        .eq('id', row.id)

      if (error) throw new Error(error.message)
    }),
  )
}

export async function updateCoursePublishState(
  courseId: string,
  isPublished: boolean,
): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('courses')
    .update({ is_published: isPublished })
    .eq('id', courseId)

  if (error) throw new Error(error.message)
}
