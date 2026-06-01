import { Metadata } from 'next'
import {
  getCourseWithContents,
  getPublishedCourseSummary,
} from '@/app/utils/courseService'
import {
  generateDescriptionFromMarkdown,
  metadata as buildMetadata,
} from '@/app/utils/metadata'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import styles from './courseDetail.module.scss'
import { createClient } from '@/app/utils/supabase/server'
import { isUserSemesterMember } from '@/app/utils/auth/membership'

// components
import { CourseContentRenderer } from './components/CourseContentRenderer'
import { TableOfContents } from './components/TableOfContents'
import { CourseVerification } from './components/CourseVerification'

interface CoursePageProps {
  params: Promise<{ slug: string }>
}

function buildCourseSeoDescription(
  course: NonNullable<Awaited<ReturnType<typeof getCourseWithContents>>>,
  fallback: string,
): string {
  const fromField = course.description?.trim()
  if (fromField) {
    return fromField.length > 160 ? `${fromField.slice(0, 157)}...` : fromField
  }
  const blocks = course.course_contents || []
  const textBlock = blocks.find(
    (b) =>
      b.type === 'markdown' ||
      b.type === 'header1' ||
      b.type === 'header2' ||
      b.type === 'header3',
  )
  if (textBlock?.content?.trim()) {
    return generateDescriptionFromMarkdown(textBlock.content, 160)
  }
  return fallback
}

export async function generateMetadata({
  params,
}: CoursePageProps): Promise<Metadata> {
  const { slug } = await params
  const [t, supabase] = await Promise.all([
    getTranslations('Courses'),
    createClient(),
  ])
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isMember = user ? await isUserSemesterMember() : false
  const course = isMember ? await getCourseWithContents(slug) : null
  const publicCourse = course ?? (await getPublishedCourseSummary(slug))

  if (!publicCourse) {
    notFound()
  }

  if (!course) {
    return buildMetadata({
      title: t('detail.titleTemplate', { name: publicCourse.name }),
      description: t('lockedCourse.description'),
      keywords: [publicCourse.name, ...t('lockedCourse.keywords').split(',')],
      url: `/courses/${slug}`,
      category: 'courses',
      noIndex: true,
    })
  }

  const description = buildCourseSeoDescription(
    course,
    t('detail.fallbackDescription', { name: course.name }),
  )

  return buildMetadata({
    title: t('detail.titleTemplate', { name: course.name }),
    description,
    keywords: [course.name, ...t('detail.keywords').split(',')],
    url: `/courses/${slug}`,
    type: 'article',
    category: 'courses',
  })
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isMember = user ? await isUserSemesterMember() : false
  const course = isMember ? await getCourseWithContents(slug) : null
  const publicCourse = course ?? (await getPublishedCourseSummary(slug))

  if (!publicCourse) {
    notFound()
  }

  if (!course) {
    return (
      <div className={styles.courseSplitLayout}>
        <div className={styles.mainContentArea}>
          <div className={styles.accessGuard}>
            <h1>{publicCourse.name}</h1>
            <p>
              這堂課的內容目前僅提供具社員權限的帳號查看。請登入符合權限的帳號後再繼續。
            </p>
            {!user && (
              <Link href={`/login?next=/courses/${slug}`} className={styles.accessLink}>
                前往登入
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }
  const contents = course.course_contents || []

  return (
    <div className={styles.courseSplitLayout}>
      <div className={styles.mainContentArea}>
        <div className={styles.courseHeader}>
          <h1>{course.name}</h1>
          {course.description && (
            <p className={styles.description}>{course.description}</p>
          )}
        </div>

        <div className={styles.articleBody}>
          <CourseContentRenderer contents={contents} />
          <CourseVerification courseId={course.id} />
        </div>
      </div>

      {/* Right Sidebar for Table of Contents */}
      <div className={styles.rightSidebar}>
        {/* We pass the contents so the TOC can parse the headers */}
        <TableOfContents contents={contents} />
      </div>
    </div>
  )
}
