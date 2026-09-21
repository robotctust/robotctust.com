'use client'

import { useMemo, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowDown,
  faArrowUp,
  faLayerGroup,
  faPencil,
  faPlus,
  faTrash,
} from '@fortawesome/free-solid-svg-icons'
import { Modal } from '@/app/[locale]/dashboard/components/Modal'
import { Chapter, ChapterTreeNode, SemesterTreeNode } from '@/app/types/course-admin'
import {
  buildReorderRows,
  fetchCurriculumOverview,
  formatDashboardDate,
  requestJson,
} from '../client-utils'
import styles from './chapters.module.scss'

type ModalState =
  | null
  | { mode: 'create' }
  | { mode: 'edit'; chapter: ChapterTreeNode }

export default function ChaptersManagerClient({
  initialSemesters,
}: {
  initialSemesters: SemesterTreeNode[]
}) {
  const [semesters, setSemesters] = useState<SemesterTreeNode[]>(initialSemesters)
  // 預設選目前學期，沒有就選第一個
  const [selectedSemesterId, setSelectedSemesterId] = useState(
    () =>
      initialSemesters.find((semester) => semester.is_active)?.id ||
      initialSemesters[0]?.id ||
      '',
  )
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [modal, setModal] = useState<ModalState>(null)
  const [deleteTarget, setDeleteTarget] = useState<ChapterTreeNode | null>(null)
  const [title, setTitle] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const payload = await fetchCurriculumOverview()
      setSemesters(payload.semesters)
      setSelectedSemesterId((prev) => {
        if (prev && payload.semesters.some((semester) => semester.id === prev)) {
          return prev
        }

        return (
          payload.semesters.find((semester) => semester.is_active)?.id ||
          payload.semesters[0]?.id ||
          ''
        )
      })
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '讀取章節資料失敗')
    } finally {
      setLoading(false)
    }
  }

  const selectedSemester = useMemo(
    () => semesters.find((semester) => semester.id === selectedSemesterId) || null,
    [semesters, selectedSemesterId],
  )

  function openCreate() {
    setTitle('')
    setModal({ mode: 'create' })
  }

  function openEdit(chapter: ChapterTreeNode) {
    setTitle(chapter.title)
    setModal({ mode: 'edit', chapter })
  }

  function closeModal() {
    setModal(null)
    setTitle('')
  }

  async function handleSave() {
    if (!title.trim()) {
      setError('請輸入章節標題')
      return
    }

    if (!selectedSemesterId && modal?.mode === 'create') {
      setError('請先選擇學期')
      return
    }

    setError('')
    setMessage('')

    try {
      if (modal?.mode === 'edit') {
        const { chapter } = await requestJson<{ chapter: Chapter }>(
          '/api/dashboard/curriculum',
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'chapter',
              id: modal.chapter.id,
              title: title.trim(),
            }),
          },
        )
        closeModal()
        setMessage('章節更新成功')
        setSemesters((prev) =>
          prev.map((s) => ({
            ...s,
            chapters: s.chapters.map((c) => (c.id === chapter.id ? { ...c, ...chapter } : c)),
          })),
        )
      } else {
        const { chapter } = await requestJson<{ chapter: Chapter }>(
          '/api/dashboard/curriculum',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'chapter',
              semester_id: selectedSemesterId,
              title: title.trim(),
            }),
          },
        )
        const newChapterNode: ChapterTreeNode = { ...chapter, courses: [] }
        closeModal()
        setMessage('章節新增成功')
        setSemesters((prev) =>
          prev.map((s) => {
            if (s.id !== selectedSemesterId) return s
            return {
              ...s,
              chapters: [...s.chapters, newChapterNode],
              stats: { ...s.stats, chapterCount: s.stats.chapterCount + 1 },
            }
          }),
        )
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '儲存失敗')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setError('')
    setMessage('')

    try {
      await requestJson('/api/dashboard/curriculum', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'chapter',
          id: deleteTarget.id,
        }),
      })
      setMessage('章節刪除成功')
      setSemesters((prev) =>
        prev.map((s) => {
          const target = s.chapters.find((c) => c.id === deleteTarget.id)
          if (!target) return s
          const removedCourses = target.courses.length
          const removedPublished = target.courses.filter((c) => c.is_published).length
          return {
            ...s,
            chapters: s.chapters.filter((c) => c.id !== deleteTarget.id),
            stats: {
              chapterCount: s.stats.chapterCount - 1,
              courseCount: s.stats.courseCount - removedCourses,
              publishedCourseCount: s.stats.publishedCourseCount - removedPublished,
              draftCourseCount: s.stats.draftCourseCount - (removedCourses - removedPublished),
            },
          }
        }),
      )
      setDeleteTarget(null)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '刪除失敗')
    }
  }

  async function moveChapter(chapterId: string, direction: -1 | 1) {
    if (!selectedSemester) return

    const chapters = [...selectedSemester.chapters]
    const index = chapters.findIndex((chapter) => chapter.id === chapterId)
    const targetIndex = index + direction

    if (index < 0 || targetIndex < 0 || targetIndex >= chapters.length) return

    const [moved] = chapters.splice(index, 1)
    chapters.splice(targetIndex, 0, moved)

    setError('')
    setMessage('')

    const reorderedChapters = chapters.map((c, i) => ({ ...c, order_index: i + 1 }))
    setSemesters((prev) =>
      prev.map((s) => {
        if (s.id !== selectedSemesterId) return s
        return { ...s, chapters: reorderedChapters }
      }),
    )

    try {
      await requestJson('/api/dashboard/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'chapters',
          rows: buildReorderRows(chapters.map((chapter) => chapter.id)),
        }),
      })
      setMessage('章節排序已更新')
    } catch (reorderError) {
      setSemesters((prev) =>
        prev.map((s) => {
          if (s.id !== selectedSemesterId) return s
          return { ...s, chapters: selectedSemester.chapters }
        }),
      )
      setError(reorderError instanceof Error ? reorderError.message : '排序更新失敗')
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Curriculum Structure</p>
          <h2>章節管理</h2>
          <p>
            章節頁專注處理排序與命名。切換學期後，可以更精準地維護章節層級，讓總覽頁保持清爽。
          </p>
        </div>
      </section>

      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <label className={styles.selectLabel} htmlFor="selected-semester">
            管理中的學期
          </label>
          <select
            id="selected-semester"
            className={styles.selectInput}
            name="selectedSemester"
            value={selectedSemesterId}
            onChange={(event) => setSelectedSemesterId(event.target.value)}
          >
            {semesters.map((semester) => (
              <option key={semester.id} value={semester.id}>
                {semester.name}
              </option>
            ))}
          </select>
        </div>
        <button className={styles.primaryButton} onClick={openCreate}>
          <FontAwesomeIcon icon={faPlus} />
          <span>新增章節</span>
        </button>
      </div>

      {message ? (
        <div className={styles.message} aria-live="polite">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className={styles.errorMessage} aria-live="polite">
          {error}
        </div>
      ) : null}
      {loading ? <div className={styles.emptyState}>正在載入章節資料…</div> : null}

      {!loading && selectedSemester ? (
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleGroup}>
              <h3>{selectedSemester.name}</h3>
              <p>
                建立於 {formatDashboardDate(selectedSemester.created_at)}，目前共{' '}
                {selectedSemester.chapters.length} 個章節。
              </p>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.filterPill}>
                <FontAwesomeIcon icon={faLayerGroup} />
                {selectedSemester.stats.chapterCount} 個章節
              </span>
              <span className={styles.filterPill}>
                {selectedSemester.stats.courseCount} 堂課程
              </span>
            </div>
          </div>

          {selectedSemester.chapters.length === 0 ? (
            <div className={styles.emptyState}>這個學期尚未建立章節。</div>
          ) : (
            <div className={styles.chapterList}>
              {selectedSemester.chapters.map((chapter, index) => (
                <article key={chapter.id} className={styles.chapterCard}>
                  <div className={styles.chapterToggle}>
                    <div className={styles.chapterHeading}>
                      <span className={styles.chapterIndex}>{chapter.order_index}</span>
                      <div className={styles.chapterInfo}>
                        <h4>{chapter.title}</h4>
                        <p>{chapter.courses.length} 堂課程</p>
                      </div>
                    </div>
                    <div className={styles.chapterActions}>
                      <button
                        className={styles.iconButton}
                        disabled={index === 0}
                        onClick={() => void moveChapter(chapter.id, -1)}
                        aria-label={`將章節 ${chapter.title} 往上移動`}
                      >
                        <FontAwesomeIcon icon={faArrowUp} />
                      </button>
                      <button
                        className={styles.iconButton}
                        disabled={index === selectedSemester.chapters.length - 1}
                        onClick={() => void moveChapter(chapter.id, 1)}
                        aria-label={`將章節 ${chapter.title} 往下移動`}
                      >
                        <FontAwesomeIcon icon={faArrowDown} />
                      </button>
                      <button
                        className={styles.iconButton}
                        onClick={() => openEdit(chapter)}
                        aria-label={`編輯章節 ${chapter.title}`}
                      >
                        <FontAwesomeIcon icon={faPencil} />
                      </button>
                      <button
                        className={styles.iconButtonDanger}
                        onClick={() => setDeleteTarget(chapter)}
                        aria-label={`刪除章節 ${chapter.title}`}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <Modal
        isOpen={modal !== null}
        onClose={closeModal}
        title={modal?.mode === 'edit' ? '編輯章節' : '新增章節'}
        footer={
          <>
            <button className={styles.subtleButton} onClick={closeModal}>
              取消
            </button>
            <button className={styles.primaryButton} onClick={() => void handleSave()}>
              儲存
            </button>
          </>
        }
      >
        <div className={styles.modalForm}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="chapter-title">
              章節標題
            </label>
            <input
              id="chapter-title"
              name="chapterTitle"
              autoComplete="off"
              className={styles.textInput}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例如：DOM 與事件處理…"
            />
          </div>
          <p className={styles.fieldHint}>
            目前學期：
            {selectedSemester?.name || '尚未選擇'}
          </p>
        </div>
      </Modal>

      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="確認刪除章節"
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
            你即將刪除 <strong>{deleteTarget?.title}</strong>。
          </p>
          <p className={styles.fieldHint}>此章節底下的所有課程也會一併移除。</p>
        </div>
      </Modal>
    </div>
  )
}
