'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBookOpen,
  faCalendarDays,
  faChevronDown,
  faChevronRight,
  faLayerGroup,
  faPencil,
  faPlus,
  faTrash,
  faUpRightFromSquare,
  faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons'
import ActionMenu from '@/app/components/ActionMenu/ActionMenu'
import { Table } from '@/app/components/Table'
import { Modal } from '../../components/Modal'
import { useToast } from '@/app/contexts/ToastContext'
import { Skeleton } from '@/app/components/Skeleton'
import {
  Chapter,
  ChapterTreeNode,
  Course,
  CourseTreeNode,
  CurriculumOverviewPayload,
  Semester,
  SemesterTreeNode,
} from '@/app/types/course-admin'
import {
  fetchCurriculumOverview,
  formatDashboardDate,
  requestJson,
  withRecalculatedStats,
} from '../client-utils'
import styles from './overview.module.scss'

type ModalState =
  | null
  | { kind: 'semester'; mode: 'create' }
  | { kind: 'semester'; mode: 'edit'; semester: SemesterTreeNode }
  | { kind: 'chapter'; mode: 'create'; semesterId: string }
  | { kind: 'chapter'; mode: 'edit'; chapter: ChapterTreeNode }
  | { kind: 'course'; mode: 'create'; chapterId: string }
  | { kind: 'course'; mode: 'edit'; course: CourseTreeNode; chapterId: string }

type DeleteState = null | {
  entity: 'semester' | 'chapter' | 'course'
  id: string
  label: string
  detail: string
}

export default function CoursesOverviewClient() {
  const { showToast } = useToast()
  const [overview, setOverview] = useState<CurriculumOverviewPayload>({
    semesters: [],
  })
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<ModalState>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteState>(null)
  const [expandedChapterIds, setExpandedChapterIds] = useState<string[]>([])

  const [semesterName, setSemesterName] = useState('')
  const [semesterIsActive, setSemesterIsActive] = useState(false)
  const [chapterTitle, setChapterTitle] = useState('')
  const [courseName, setCourseName] = useState('')
  const [courseSlug, setCourseSlug] = useState('')
  const [courseDescription, setCourseDescription] = useState('')
  const [courseRewardExp, setCourseRewardExp] = useState('0')
  const [courseIsPublished, setCourseIsPublished] = useState(false)
  const [courseOrderIndex, setCourseOrderIndex] = useState('0')

  async function loadOverview() {
    setLoading(true)

    try {
      const payload = await fetchCurriculumOverview()
      setOverview(payload)
      setExpandedChapterIds((prev) => {
        if (prev.length > 0) return prev

        return (
          payload.semesters
            .find((semester) => semester.is_active)
            ?.chapters.map((chapter) => chapter.id) || []
        )
      })
    } catch (loadError) {
      showToast(
        loadError instanceof Error ? loadError.message : '讀取課程總覽失敗',
        'error',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadOverview()
  }, [])

  const totals = useMemo(() => {
    return overview.semesters.reduce(
      (acc, semester) => {
        acc.semesterCount += 1
        acc.chapterCount += semester.stats.chapterCount
        acc.courseCount += semester.stats.courseCount
        acc.publishedCourseCount += semester.stats.publishedCourseCount
        acc.draftCourseCount += semester.stats.draftCourseCount
        return acc
      },
      {
        semesterCount: 0,
        chapterCount: 0,
        courseCount: 0,
        publishedCourseCount: 0,
        draftCourseCount: 0,
      },
    )
  }, [overview.semesters])

  const activeSemester =
    overview.semesters.find((semester) => semester.is_active) || null

  function resetModalFields() {
    setSemesterName('')
    setSemesterIsActive(false)
    setChapterTitle('')
    setCourseName('')
    setCourseSlug('')
    setCourseDescription('')
    setCourseRewardExp('0')
    setCourseIsPublished(false)
    setCourseOrderIndex('0')
  }

  function closeModal() {
    setModal(null)
    resetModalFields()
  }

  function openCreateSemester() {
    resetModalFields()
    setSemesterIsActive(overview.semesters.length === 0)
    setModal({ kind: 'semester', mode: 'create' })
  }

  function openEditSemester(semester: SemesterTreeNode) {
    resetModalFields()
    setSemesterName(semester.name)
    setSemesterIsActive(semester.is_active)
    setModal({ kind: 'semester', mode: 'edit', semester })
  }

  function openCreateChapter(semesterId: string) {
    resetModalFields()
    setModal({ kind: 'chapter', mode: 'create', semesterId })
  }

  function openEditChapter(chapter: ChapterTreeNode) {
    resetModalFields()
    setChapterTitle(chapter.title)
    setModal({ kind: 'chapter', mode: 'edit', chapter })
  }

  function openCreateCourse(chapterId: string) {
    resetModalFields()
    const chapter = overview.semesters
      .flatMap((s) => s.chapters)
      .find((ch) => ch.id === chapterId)
    const nextOrder = (chapter?.courses.length || 0) + 1
    setCourseOrderIndex(String(nextOrder))
    setModal({ kind: 'course', mode: 'create', chapterId })
  }

  function openEditCourse(course: CourseTreeNode, chapterId: string) {
    resetModalFields()
    setCourseName(course.name)
    setCourseSlug(course.id)
    setCourseDescription(course.description || '')
    setCourseRewardExp(String(course.reward_exp))
    setCourseIsPublished(course.is_published)
    setCourseOrderIndex(String(course.order_index))
    setModal({ kind: 'course', mode: 'edit', course, chapterId })
  }

  function toggleChapter(chapterId: string) {
    setExpandedChapterIds((prev) =>
      prev.includes(chapterId)
        ? prev.filter((id) => id !== chapterId)
        : [...prev, chapterId],
    )
  }

  async function handleSubmitModal() {
    if (!modal) return

    try {
      if (modal.kind === 'semester') {
        if (!semesterName.trim()) throw new Error('請輸入學期名稱')

        if (modal.mode === 'create') {
          const { semester } = await requestJson<{ semester: Semester }>(
            '/api/dashboard/curriculum',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'semester',
                name: semesterName.trim(),
                is_active: semesterIsActive,
              }),
            },
          )
          const newNode: SemesterTreeNode = {
            ...semester,
            chapters: [],
            stats: {
              chapterCount: 0,
              courseCount: 0,
              publishedCourseCount: 0,
              draftCourseCount: 0,
            },
          }
          showToast('學期新增成功', 'success')
          setOverview((prev) => ({
            semesters: [
              newNode,
              ...prev.semesters.map((s) =>
                semester.is_active ? { ...s, is_active: false } : s,
              ),
            ].sort((a, b) => {
              if (a.is_active !== b.is_active) return a.is_active ? -1 : 1
              return (
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
              )
            }),
          }))
        } else {
          const { semester } = await requestJson<{ semester: Semester }>(
            '/api/dashboard/curriculum',
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'semester',
                id: modal.semester.id,
                name: semesterName.trim(),
                is_active: semesterIsActive,
              }),
            },
          )
          showToast('學期更新成功', 'success')
          setOverview((prev) => ({
            semesters: prev.semesters
              .map((s) => {
                if (s.id === semester.id) return { ...s, ...semester }
                if (semester.is_active) return { ...s, is_active: false }
                return s
              })
              .sort((a, b) => {
                if (a.is_active !== b.is_active) return a.is_active ? -1 : 1
                return (
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime()
                )
              }),
          }))
        }
      } else if (modal.kind === 'chapter') {
        if (!chapterTitle.trim()) throw new Error('請輸入章節標題')

        if (modal.mode === 'create') {
          const { chapter } = await requestJson<{ chapter: Chapter }>(
            '/api/dashboard/curriculum',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'chapter',
                semester_id: modal.semesterId,
                title: chapterTitle.trim(),
              }),
            },
          )
          const newChapter: ChapterTreeNode = { ...chapter, courses: [] }
          showToast('章節新增成功', 'success')
          setOverview((prev) => ({
            semesters: prev.semesters.map((s) => {
              if (s.id !== modal.semesterId) return s
              return {
                ...s,
                chapters: [...s.chapters, newChapter],
                stats: { ...s.stats, chapterCount: s.stats.chapterCount + 1 },
              }
            }),
          }))
        } else {
          const { chapter } = await requestJson<{ chapter: Chapter }>(
            '/api/dashboard/curriculum',
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'chapter',
                id: modal.chapter.id,
                title: chapterTitle.trim(),
              }),
            },
          )
          showToast('章節更新成功', 'success')
          setOverview((prev) => ({
            semesters: prev.semesters.map((s) => ({
              ...s,
              chapters: s.chapters.map((c) =>
                c.id === chapter.id ? { ...c, ...chapter } : c,
              ),
            })),
          }))
        }
      } else if (modal.kind === 'course') {
        if (!courseName.trim()) throw new Error('請輸入課程名稱')

        const payload = {
          chapter_id: modal.chapterId,
          name: courseName.trim(),
          description: courseDescription.trim(),
          reward_exp: Number(courseRewardExp || 0),
          is_published: courseIsPublished,
          order_index: Number(courseOrderIndex || 0),
        }

        if (modal.mode === 'create') {
          const { course } = await requestJson<{ course: Course }>(
            '/api/dashboard/curriculum',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'course',
                ...payload,
                id: courseSlug.trim() || undefined,
              }),
            },
          )
          const newCourse: CourseTreeNode = { ...course, contents: [] }
          showToast('課程新增成功', 'success')
          setOverview((prev) => ({
            semesters: prev.semesters.map((s) =>
              withRecalculatedStats({
                ...s,
                chapters: s.chapters.map((ch) =>
                  ch.id === course.chapter_id
                    ? { ...ch, courses: [...ch.courses, newCourse] }
                    : ch,
                ),
              }),
            ),
          }))
        } else {
          const { course } = await requestJson<{ course: Course }>(
            '/api/dashboard/curriculum',
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'course',
                id: modal.course.id,
                ...payload,
              }),
            },
          )
          const oldChapterId = modal.chapterId
          showToast('課程更新成功', 'success')
          setOverview((prev) => {
            let existingContents = modal.course.contents

            return {
              semesters: prev.semesters.map((s) =>
                withRecalculatedStats({
                  ...s,
                  chapters: s.chapters.map((ch) => {
                    if (oldChapterId === course.chapter_id) {
                      if (ch.id !== course.chapter_id) return ch
                      return {
                        ...ch,
                        courses: ch.courses.map((c) =>
                          c.id === modal.course.id
                            ? { ...course, contents: existingContents }
                            : c,
                        ),
                      }
                    }

                    if (ch.id === oldChapterId) {
                      return {
                        ...ch,
                        courses: ch.courses.filter(
                          (c) => c.id !== modal.course.id,
                        ),
                      }
                    }

                    if (ch.id === course.chapter_id) {
                      return {
                        ...ch,
                        courses: [
                          ...ch.courses,
                          { ...course, contents: existingContents },
                        ],
                      }
                    }

                    return ch
                  }),
                }),
              ),
            }
          })
        }
      }

      closeModal()
    } catch (submitError) {
      showToast(submitError instanceof Error ? submitError.message : '儲存失敗', 'error')
    }
  }

  function promptDelete(
    entity: 'semester' | 'chapter' | 'course',
    id: string,
    label: string,
  ) {
    const detail =
      entity === 'semester'
        ? '刪除後會一併移除該學期底下的章節與課程。'
        : entity === 'chapter'
          ? '刪除後會一併移除章節內的所有課程。'
          : '課程刪除後將無法復原，內容區塊也會一起移除。'

    setDeleteTarget({ entity, id, label, detail })
  }

  async function confirmDelete() {
    if (!deleteTarget) return

    try {
      await requestJson('/api/dashboard/curriculum', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: deleteTarget.entity,
          id: deleteTarget.id,
        }),
      })
      showToast('刪除成功', 'success')

      if (deleteTarget.entity === 'semester') {
        setOverview((prev) => ({
          semesters: prev.semesters.filter((s) => s.id !== deleteTarget.id),
        }))
      } else if (deleteTarget.entity === 'chapter') {
        setOverview((prev) => ({
          semesters: prev.semesters.map((s) => {
            const target = s.chapters.find((c) => c.id === deleteTarget.id)
            if (!target) return s
            const removedCourses = target.courses.length
            const removedPublished = target.courses.filter(
              (c) => c.is_published,
            ).length
            return {
              ...s,
              chapters: s.chapters.filter((c) => c.id !== deleteTarget.id),
              stats: {
                chapterCount: s.stats.chapterCount - 1,
                courseCount: s.stats.courseCount - removedCourses,
                publishedCourseCount:
                  s.stats.publishedCourseCount - removedPublished,
                draftCourseCount:
                  s.stats.draftCourseCount -
                  (removedCourses - removedPublished),
              },
            }
          }),
        }))
      } else {
        setOverview((prev) => ({
          semesters: prev.semesters.map((s) =>
            withRecalculatedStats({
              ...s,
              chapters: s.chapters.map((ch) => ({
                ...ch,
                courses: ch.courses.filter((c) => c.id !== deleteTarget.id),
              })),
            }),
          ),
        }))
      }

      setDeleteTarget(null)
    } catch (deleteError) {
      showToast(deleteError instanceof Error ? deleteError.message : '刪除失敗', 'error')
    }
  }

  function patchCoursePublish(courseId: string, is_published: boolean) {
    setOverview((prev) => ({
      semesters: prev.semesters.map((s) =>
        withRecalculatedStats({
          ...s,
          chapters: s.chapters.map((ch) => ({
            ...ch,
            courses: ch.courses.map((c) =>
              c.id === courseId ? { ...c, is_published } : c,
            ),
          })),
        }),
      ),
    }))
  }

  async function togglePublish(course: CourseTreeNode) {
    const nextPublished = !course.is_published
    patchCoursePublish(course.id, nextPublished)

    try {
      await requestJson('/api/dashboard/curriculum', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'course-publish',
          course_id: course.id,
          is_published: nextPublished,
        }),
      })
      showToast(
        nextPublished
          ? `已發布「${course.name}」`
          : `已將「${course.name}」設為草稿`,
        'success',
      )
    } catch (toggleError) {
      patchCoursePublish(course.id, course.is_published)
      showToast(
        toggleError instanceof Error ? toggleError.message : '狀態更新失敗',
        'error',
      )
    }
  }

  const modalTitle = !modal
    ? ''
    : modal.kind === 'semester'
      ? modal.mode === 'create'
        ? '新增學期'
        : '編輯學期'
      : modal.kind === 'chapter'
        ? modal.mode === 'create'
          ? '新增章節'
          : '編輯章節'
        : modal.mode === 'create'
          ? '新增課程'
          : '編輯課程'

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <h2>課程總覽</h2>
          <p className={styles.heroDescription}>
            用一個頁面掌握整體課程架構與營運狀態。
          </p>
        </div>
        <div className={styles.heroActions}>
          <button className={styles.primaryButton} onClick={openCreateSemester}>
            <FontAwesomeIcon icon={faPlus} />
            <span>新增學期</span>
          </button>
          {/* <Link
            href="/dashboard/courses/courses"
            className={styles.secondaryLink}
          >
            <FontAwesomeIcon icon={faBookOpen} />
            <span>課程文庫</span>
          </Link>
          <Link
            href="/dashboard/verifications"
            className={styles.secondaryLink}
          >
            <FontAwesomeIcon icon={faWandMagicSparkles} />
            <span>課程審核</span>
          </Link> */}
        </div>
      </section>

      <section className={styles.statsGrid}>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>學期</span>
          <strong className={styles.statValue}>{totals.semesterCount}</strong>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>章節</span>
          <strong className={styles.statValue}>{totals.chapterCount}</strong>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>課程</span>
          <strong className={styles.statValue}>{totals.courseCount}</strong>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>已發布</span>
          <strong className={styles.statValue}>
            {totals.publishedCourseCount}
          </strong>
        </article>
      </section>

      {loading ? (
        <>
          <Skeleton variant="stat" count={4} layout="row" />
          <Skeleton variant="section" count={2} />
        </>
      ) : null}

      {!loading && overview.semesters.length === 0 ? (
        <div className={styles.emptyState}>
          目前尚未建立任何學期，先新增第一個學期開始規劃課程。
        </div>
      ) : null}

      {!loading &&
        overview.semesters.map((semester) => (
          <section key={semester.id} className={styles.semesterSection}>
            <div className={styles.semesterHeader}>
              <div className={styles.semesterTitleGroup}>
                <div className={styles.semesterTitleRow}>
                  <div className={styles.titleContent}>
                    <h3>{semester.name}</h3>
                    <span
                      className={`${styles.badge} ${
                        semester.is_active
                          ? styles.activeBadge
                          : styles.mutedBadge
                      }`}
                    >
                      {semester.is_active ? '當前學期' : '歷史學期'}
                    </span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaPill}>
                      <FontAwesomeIcon icon={faLayerGroup} />
                      {semester.stats.chapterCount} 個章節
                    </span>
                    <span className={styles.metaPill}>
                      <FontAwesomeIcon icon={faBookOpen} />
                      {semester.stats.courseCount} 堂課程
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.sectionActions}>
                <button
                  className={styles.subtleButton}
                  onClick={() => openEditSemester(semester)}
                >
                  <FontAwesomeIcon icon={faPencil} />
                  <span>編輯</span>
                </button>
                <button
                  className={styles.dangerButton}
                  onClick={() =>
                    promptDelete('semester', semester.id, semester.name)
                  }
                >
                  <FontAwesomeIcon icon={faTrash} />
                  <span>刪除</span>
                </button>
                <button
                  className={styles.primaryButton}
                  onClick={() => openCreateChapter(semester.id)}
                >
                  <FontAwesomeIcon icon={faPlus} />
                  <span>新增章節</span>
                </button>
              </div>
            </div>

            <div className={styles.chapterList}>
              {semester.chapters.length === 0 ? (
                <div className={styles.emptyState}>
                  這個學期還沒有章節，先建立一個章節來放入課程。
                </div>
              ) : (
                semester.chapters.map((chapter) => {
                  const isExpanded = expandedChapterIds.includes(chapter.id)

                  return (
                    <article
                      key={chapter.id}
                      className={`${styles.chapterCard} ${!isExpanded ? styles.collapsedChapterCard : ''}`}
                      onClick={() => toggleChapter(chapter.id)}
                    >
                      <div className={styles.chapterCardTop}>
                        <div
                          className={styles.titleGroup}
                          aria-expanded={isExpanded}
                          aria-controls={`chapter-panel-${chapter.id}`}
                        >
                          <div className={styles.chapterHeading}>
                            <span className={styles.chapterIndex}>
                              {chapter.order_index}
                            </span>
                            <div className={styles.chapterInfo}>
                              <h4>{chapter.title}</h4>
                              <p>{chapter.courses.length} 堂課程</p>
                            </div>
                          </div>

                          <div className={styles.chapterActions}>
                            <button
                              className={styles.iconButton}
                              onClick={(e) => {
                                e.stopPropagation()
                                openCreateCourse(chapter.id)
                              }}
                              aria-label={`在 ${chapter.title} 新增課程`}
                            >
                              <FontAwesomeIcon icon={faPlus} />
                            </button>
                            <button
                              className={styles.iconButton}
                              onClick={(e) => {
                                e.stopPropagation()
                                openEditChapter(chapter)
                              }}
                              aria-label={`編輯章節 ${chapter.title}`}
                            >
                              <FontAwesomeIcon icon={faPencil} />
                            </button>
                            <button
                              className={styles.iconButtonDanger}
                              onClick={(e) => {
                                e.stopPropagation()
                                promptDelete(
                                  'chapter',
                                  chapter.id,
                                  chapter.title,
                                )
                              }}
                              aria-label={`刪除章節 ${chapter.title}`}
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                            <FontAwesomeIcon
                              className={styles.chapterToggleIcon}
                              icon={isExpanded ? faChevronDown : faChevronRight}
                            />
                          </div>
                        </div>
                      </div>

                      {isExpanded ? (
                        <div
                          id={`chapter-panel-${chapter.id}`}
                          className={styles.chapterBody}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Table<CourseTreeNode>
                            columns={[
                              {
                                key: 'order_index',
                                header: '#',
                                sortable: true,
                                sortAccessor: (c) => c.order_index,
                                nowrap: true,
                                align: 'center',
                                width: '52px',
                                render: (c) => c.order_index,
                              },
                              {
                                key: 'name',
                                header: '課程名稱',
                                minWidth: '180px',
                                render: (c) => (
                                  <div className={styles.courseNameCell}>
                                    <span className={styles.courseSlug}>
                                      {c.id}
                                    </span>
                                    <span>{c.name}</span>
                                  </div>
                                ),
                              },
                              {
                                key: 'is_published',
                                header: '狀態',
                                sortable: true,
                                sortAccessor: (c) => (c.is_published ? 1 : 0),
                                filter: {
                                  options: [
                                    { label: '已發布', value: 'published' },
                                    { label: '草稿', value: 'draft' },
                                  ],
                                  accessor: (c) =>
                                    c.is_published ? 'published' : 'draft',
                                  placeholder: '全部狀態',
                                },
                                nowrap: true,
                                render: (c) => (
                                  <span
                                    className={
                                      c.is_published
                                        ? styles.publishedBadge
                                        : styles.draftBadge
                                    }
                                  >
                                    {c.is_published ? '已發布' : '草稿'}
                                  </span>
                                ),
                              },
                              {
                                key: 'reward_exp',
                                header: 'EXP',
                                sortable: true,
                                sortAccessor: (c) => c.reward_exp,
                                align: 'right',
                                nowrap: true,
                                render: (c) => (
                                  <span className={styles.metaPillExp}>
                                    EXP {c.reward_exp}
                                  </span>
                                ),
                              },
                              {
                                key: 'actions',
                                header: '操作',
                                nowrap: true,
                                render: (c) => (
                                  <div className={styles.courseTableActions}>
                                    <Link
                                      href={`/dashboard/courses/courses/${c.id}`}
                                      className={styles.workspaceLink}
                                    >
                                      <FontAwesomeIcon
                                        icon={faUpRightFromSquare}
                                      />
                                      <span>工作台</span>
                                    </Link>
                                    <ActionMenu ariaLabel={`操作 ${c.name}`}>
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault()
                                          void togglePublish(c)
                                        }}
                                      >
                                        <FontAwesomeIcon
                                          icon={faWandMagicSparkles}
                                        />
                                        <span>
                                          {c.is_published
                                            ? '轉為草稿'
                                            : '立即發布'}
                                        </span>
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault()
                                          openEditCourse(c, chapter.id)
                                        }}
                                      >
                                        <FontAwesomeIcon icon={faPencil} />
                                        <span>編輯課程</span>
                                      </button>
                                      <button
                                        data-danger="true"
                                        onClick={(e) => {
                                          e.preventDefault()
                                          promptDelete('course', c.id, c.name)
                                        }}
                                      >
                                        <FontAwesomeIcon icon={faTrash} />
                                        <span>刪除課程</span>
                                      </button>
                                    </ActionMenu>
                                  </div>
                                ),
                              },
                            ]}
                            data={chapter.courses}
                            rowKey={(c) => c.id}
                            loading={false}
                            emptyMessage="這個章節還沒有課程，現在就新增第一堂課。"
                            defaultSort={{ key: 'order_index', direction: 'asc' }}
                          />
                        </div>
                      ) : null}
                    </article>
                  )
                })
              )}
            </div>
          </section>
        ))}

      <Modal
        isOpen={modal !== null}
        onClose={closeModal}
        title={modalTitle}
        footer={
          <>
            <button className={styles.cancelButton} onClick={closeModal}>
              取消
            </button>
            <button
              className={styles.primaryButton}
              onClick={() => void handleSubmitModal()}
            >
              儲存
            </button>
          </>
        }
      >
        {modal?.kind === 'semester' ? (
          <div className={styles.modalForm}>
            <div className={styles.fieldGroup}>
              <label
                className={styles.fieldLabel}
                htmlFor="overview-semester-name"
              >
                學期名稱
              </label>
              <input
                id="overview-semester-name"
                name="semesterName"
                autoComplete="off"
                className={styles.textInput}
                value={semesterName}
                onChange={(event) => setSemesterName(event.target.value)}
                placeholder="例如：113-2 培訓課程…"
              />
            </div>
            <label
              className={styles.checkboxRow}
              htmlFor="overview-semester-active"
            >
              <input
                id="overview-semester-active"
                name="semesterIsActive"
                type="checkbox"
                checked={semesterIsActive}
                onChange={(event) => setSemesterIsActive(event.target.checked)}
              />
              <span>設為目前啟用學期</span>
            </label>
          </div>
        ) : null}

        {modal?.kind === 'chapter' ? (
          <div className={styles.modalForm}>
            <div className={styles.fieldGroup}>
              <label
                className={styles.fieldLabel}
                htmlFor="overview-chapter-title"
              >
                章節標題
              </label>
              <input
                id="overview-chapter-title"
                name="chapterTitle"
                autoComplete="off"
                className={styles.textInput}
                value={chapterTitle}
                onChange={(event) => setChapterTitle(event.target.value)}
                placeholder="例如：基礎概念與環境建立…"
              />
            </div>
          </div>
        ) : null}

        {modal?.kind === 'course' ? (
          <div className={styles.modalForm}>
            <div className={styles.fieldGroup}>
              <label
                className={styles.fieldLabel}
                htmlFor="overview-course-name"
              >
                課程名稱
              </label>
              <input
                id="overview-course-name"
                name="courseName"
                autoComplete="off"
                className={styles.textInput}
                value={courseName}
                onChange={(event) => setCourseName(event.target.value)}
                placeholder="例如：JavaScript 入門…"
              />
            </div>
            <div className={styles.fieldGroup}>
              <label
                className={styles.fieldLabel}
                htmlFor="overview-course-slug"
              >
                課程代碼 (Slug)
              </label>
              <input
                id="overview-course-slug"
                name="courseSlug"
                autoComplete="off"
                className={styles.textInput}
                value={courseSlug}
                disabled={modal?.mode === 'edit'}
                onChange={(event) => setCourseSlug(event.target.value)}
                placeholder="例如：javascript-intro"
              />
              <p className={styles.fieldHint}>
                {modal?.mode === 'create'
                  ? '自訂網址中顯示的 ID。若不填寫將由系統自動產生，建議使用小寫英文與連字號。'
                  : '課程代碼因為是資料庫的主鍵，建立後無法在此更改。'}
              </p>
            </div>
            <div className={styles.fieldGroup}>
              <label
                className={styles.fieldLabel}
                htmlFor="overview-course-description"
              >
                課程簡介
              </label>
              <textarea
                id="overview-course-description"
                name="courseDescription"
                autoComplete="off"
                className={styles.textareaInput}
                value={courseDescription}
                onChange={(event) => setCourseDescription(event.target.value)}
                placeholder="這堂課主要帶學員建立什麼基礎？…"
              />
            </div>
            <div className={styles.splitColumns}>
              <div className={styles.fieldGroup}>
                <label
                  className={styles.fieldLabel}
                  htmlFor="overview-course-exp"
                >
                  獎勵 EXP
                </label>
                <input
                  id="overview-course-exp"
                  name="courseRewardExp"
                  className={styles.textInput}
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={courseRewardExp}
                  onChange={(event) => setCourseRewardExp(event.target.value)}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label
                  className={styles.fieldLabel}
                  htmlFor="overview-course-order"
                >
                  排序指數
                </label>
                <input
                  id="overview-course-order"
                  name="courseOrderIndex"
                  className={styles.textInput}
                  type="number"
                  inputMode="numeric"
                  value={courseOrderIndex}
                  onChange={(event) => setCourseOrderIndex(event.target.value)}
                />
              </div>
            </div>
            <label
              className={styles.checkboxRow}
              htmlFor="overview-course-published"
            >
              <input
                id="overview-course-published"
                name="courseIsPublished"
                type="checkbox"
                checked={courseIsPublished}
                onChange={(event) => setCourseIsPublished(event.target.checked)}
              />
              <span>建立後立即發布</span>
            </label>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="確認刪除"
        maxWidth="520px"
        footer={
          <>
            <button
              className={styles.cancelButton}
              onClick={() => setDeleteTarget(null)}
            >
              取消
            </button>
            <button
              className={styles.primaryButton}
              data-danger="true"
              onClick={() => void confirmDelete()}
            >
              確認刪除
            </button>
          </>
        }
      >
        <div className={styles.confirmBody}>
          <p>
            你即將刪除 <strong>{deleteTarget?.label}</strong>。
          </p>
          <p className={styles.fieldHint}>{deleteTarget?.detail}</p>
        </div>
      </Modal>
    </div>
  )
}
