'use client'

import { Link } from '@/i18n/navigation'
import { useRouter } from '@/i18n/navigation'
import { useEffect, useMemo, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowRight,
  faEye,
  faEyeSlash,
  faFolderOpen,
  faPlus,
  faSearch,
  faTrash,
} from '@fortawesome/free-solid-svg-icons'
import { Modal } from '@/app/[locale]/dashboard/components/Modal'
import { Course, CourseTreeNode, SemesterTreeNode } from '@/app/types/course-admin'
import {
  fetchCurriculumOverview,
  flattenCourses,
  requestJson,
  withRecalculatedStats,
} from '../client-utils'
import styles from './courses-library.module.scss'

export default function CoursesLibraryClient() {
  const router = useRouter()
  const [semesters, setSemesters] = useState<SemesterTreeNode[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [selectedSemesterId, setSelectedSemesterId] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'published' | 'draft'>('all')

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CourseTreeNode | null>(null)
  const [newCourseName, setNewCourseName] = useState('')
  const [newCourseChapterId, setNewCourseChapterId] = useState('')

  const allCourses = useMemo(() => flattenCourses(semesters), [semesters])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const payload = await fetchCurriculumOverview()
      setSemesters(payload.semesters)
      setNewCourseChapterId((prev) => prev || payload.semesters[0]?.chapters[0]?.id || '')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '讀取課程資料失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filteredCourses = useMemo(() => {
    return allCourses.filter(({ semester, course }) => {
      if (selectedSemesterId !== 'all' && semester.id !== selectedSemesterId) return false
      if (selectedStatus === 'published' && !course.is_published) return false
      if (selectedStatus === 'draft' && course.is_published) return false

      const keyword = search.trim().toLowerCase()
      if (!keyword) return true

      return (
        course.name.toLowerCase().includes(keyword) ||
        course.id.toLowerCase().includes(keyword) ||
        (course.description || '').toLowerCase().includes(keyword)
      )
    })
  }, [allCourses, search, selectedSemesterId, selectedStatus])

  function openCreate() {
    setNewCourseName('')
    const fallbackChapter = semesters[0]?.chapters[0]?.id || ''
    setNewCourseChapterId(fallbackChapter)
    setIsCreateModalOpen(true)
  }

  async function handleCreateSave() {
    if (!newCourseChapterId || !newCourseName.trim()) {
      setError('請完整填寫課程名稱與所屬章節')
      return
    }

    setMessage('')
    setError('')

    try {
      const { course } = await requestJson<{ course: Course }>('/api/dashboard/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'course',
          chapter_id: newCourseChapterId,
          name: newCourseName.trim(),
          description: '',
          reward_exp: 0,
          is_published: false,
        }),
      })
      setIsCreateModalOpen(false)
      setMessage('課程建立成功，前往工作台...')
      router.push(`/dashboard/courses/courses/${course.id}`)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '建立失敗')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setMessage('')
    setError('')

    try {
      await requestJson('/api/dashboard/curriculum', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'course',
          id: deleteTarget.id,
        }),
      })
      setMessage('課程已刪除')
      setSemesters((prev) =>
        prev.map((s) =>
          withRecalculatedStats({
            ...s,
            chapters: s.chapters.map((ch) => ({
              ...ch,
              courses: ch.courses.filter((c) => c.id !== deleteTarget.id),
            })),
          }),
        ),
      )
      setDeleteTarget(null)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '刪除失敗')
    }
  }

  function patchCoursePublish(courseId: string, is_published: boolean) {
    setSemesters((prev) =>
      prev.map((s) =>
        withRecalculatedStats({
          ...s,
          chapters: s.chapters.map((ch) => ({
            ...ch,
            courses: ch.courses.map((c) => (c.id === courseId ? { ...c, is_published } : c)),
          })),
        }),
      ),
    )
  }

  async function togglePublish(course: CourseTreeNode) {
    setMessage('')
    setError('')

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
      setMessage('課程狀態已更新')
    } catch (toggleError) {
      patchCoursePublish(course.id, course.is_published)
      setError(toggleError instanceof Error ? toggleError.message : '狀態更新失敗')
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Course Library</p>
          <h2>課程文庫</h2>
          <p>
            這裡負責搜尋、篩選與管理課程生命週期。先找到目標，再進入工作台做內容編輯，流程會更穩定。
          </p>
        </div>
        <div className={styles.heroActions}>
          <button className={styles.primaryButton} onClick={openCreate}>
            <FontAwesomeIcon icon={faPlus} />
            <span>新增課程</span>
          </button>
        </div>
      </section>

      <section className={styles.summaryGrid}>
        <article className={styles.summaryCard}>
          <span className={styles.summaryLabel}>課程總數</span>
          <strong className={styles.summaryValue}>{allCourses.length}</strong>
        </article>
        <article className={styles.summaryCard}>
          <span className={styles.summaryLabel}>目前篩選結果</span>
          <strong className={styles.summaryValue}>{filteredCourses.length}</strong>
        </article>
      </section>

      <div className={styles.filtersBar}>
        <div className={styles.searchBox}>
          <FontAwesomeIcon icon={faSearch} className={styles.searchIcon} />
          <label className={styles.srOnly} htmlFor="course-search">
            搜尋課程
          </label>
          <input
            id="course-search"
            name="courseSearch"
            type="text"
            autoComplete="off"
            placeholder="搜尋課程標題或 ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.selectGroup}>
          <label className={styles.srOnly} htmlFor="semester-filter">
            學期篩選
          </label>
          <select
            id="semester-filter"
            name="semesterFilter"
            value={selectedSemesterId}
            onChange={(e) => setSelectedSemesterId(e.target.value)}
          >
            <option value="all">所有學期</option>
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <label className={styles.srOnly} htmlFor="status-filter">
            狀態篩選
          </label>
          <select
            id="status-filter"
            name="statusFilter"
            value={selectedStatus}
            onChange={(e) =>
              setSelectedStatus(e.target.value as 'all' | 'published' | 'draft')
            }
          >
            <option value="all">所有狀態</option>
            <option value="published">已發布</option>
            <option value="draft">草稿</option>
          </select>
        </div>
      </div>

      {message && (
        <div className={styles.messageRow} aria-live="polite">
          {message}
        </div>
      )}
      {error && (
        <div className={styles.errorRow} aria-live="polite">
          {error}
        </div>
      )}

      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>載入課程中…</p>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className={styles.emptyState}>
          <FontAwesomeIcon icon={faFolderOpen} className={styles.emptyIcon} />
          <p>目前沒有符合條件的課程。</p>
          <button
            className={styles.subtleButton}
            onClick={() => {
              setSearch('')
              setSelectedSemesterId('all')
              setSelectedStatus('all')
            }}
          >
            清除篩選條件
          </button>
        </div>
      ) : (
        <div className={styles.courseGrid}>
          {filteredCourses.map(({ semester, chapter, course }) => (
            <div key={course.id} className={styles.courseCard}>
              <div className={styles.cardHeader}>
                <span
                  className={
                    course.is_published ? styles.badgePublished : styles.badgeDraft
                  }
                >
                  {course.is_published ? '已發布' : '草稿'}
                </span>

                <div className={styles.cardActions}>
                  <button
                    className={styles.iconButton}
                    onClick={(e) => {
                      e.preventDefault()
                      void togglePublish(course)
                    }}
                    aria-label={
                      course.is_published
                        ? `將 ${course.name} 轉為草稿`
                        : `發布課程 ${course.name}`
                    }
                  >
                    <FontAwesomeIcon icon={course.is_published ? faEyeSlash : faEye} />
                  </button>
                  <button
                    className={styles.iconButtonDanger}
                    onClick={(e) => {
                      e.preventDefault()
                      setDeleteTarget(course)
                    }}
                    aria-label={`刪除課程 ${course.name}`}
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </div>

              <Link href={`/dashboard/courses/courses/${course.id}`} className={styles.cardBody}>
                <h3 className={styles.courseTitle}>{course.name}</h3>
                <p className={styles.courseDesc}>
                  {course.description || '點擊進入工作台以新增課程描述…'}
                </p>

                <div className={styles.metaTags}>
                  <span className={styles.tag}>{semester.name}</span>
                  <span className={styles.tag}>{chapter.title}</span>
                  <span className={styles.tagExp}>EXP {course.reward_exp}</span>
                </div>
              </Link>

              <div className={styles.cardFooter}>
                <button
                  className={styles.subtleButton}
                  onClick={() => void togglePublish(course)}
                >
                  <FontAwesomeIcon icon={course.is_published ? faEyeSlash : faEye} />
                  <span>{course.is_published ? '轉為草稿' : '立即發布'}</span>
                </button>
                <Link href={`/dashboard/courses/courses/${course.id}`} className={styles.primaryLink}>
                  <span>進入工作台</span>
                  <FontAwesomeIcon icon={faArrowRight} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="建立新課程"
        maxWidth="500px"
        footer={
          <>
            <button className={styles.subtleButton} onClick={() => setIsCreateModalOpen(false)}>
              取消
            </button>
            <button className={styles.primaryButton} onClick={() => void handleCreateSave()}>
              建立並進入工作台
            </button>
          </>
        }
      >
        <div className={styles.formContext}>
          <div className={styles.formGroup}>
            <label htmlFor="new-course-name">課程名稱</label>
            <input
              id="new-course-name"
              name="newCourseName"
              type="text"
              autoComplete="off"
              placeholder="輸入課程名稱…"
              value={newCourseName}
              onChange={(e) => setNewCourseName(e.target.value)}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="new-course-chapter">所屬章節</label>
            <select
              id="new-course-chapter"
              name="newCourseChapter"
              value={newCourseChapterId}
              onChange={(e) => setNewCourseChapterId(e.target.value)}
            >
              {semesters.map((semester) => (
                <optgroup key={semester.id} label={semester.name}>
                  {semester.chapters.map((chapter) => (
                    <option key={chapter.id} value={chapter.id}>
                      {chapter.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="確認刪除課程"
        maxWidth="520px"
        footer={
          <>
            <button
              className={styles.subtleButton}
              onClick={() => setDeleteTarget(null)}
            >
              取消
            </button>
            <button className={styles.dangerButton} onClick={() => void handleDelete()}>
              確認刪除
            </button>
          </>
        }
      >
        <div className={styles.confirmBody}>
          <p>
            你即將刪除 <strong>{deleteTarget?.name}</strong>。
          </p>
          <p className={styles.formHint}>
            課程內容也會一併移除，確認後無法復原。
          </p>
        </div>
      </Modal>
    </div>
  )
}
