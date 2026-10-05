'use client'

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCalendarDays,
  faPencil,
  faPlus,
  faTrash,
} from '@fortawesome/free-solid-svg-icons'
import { Modal } from '@/app/[locale]/dashboard/components/Modal'
import { Semester, SemesterTreeNode } from '@/app/types/course-admin'
import {
  fetchCurriculumOverview,
  formatDashboardDate,
  requestJson,
} from '../client-utils'
import styles from './semesters.module.scss'

type ModalState =
  | null
  | { mode: 'create' }
  | { mode: 'edit'; semester: SemesterTreeNode }

export default function SemestersManagerClient({
  initialSemesters,
}: {
  initialSemesters: SemesterTreeNode[]
}) {
  const [semesters, setSemesters] = useState<SemesterTreeNode[]>(initialSemesters)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [modal, setModal] = useState<ModalState>(null)
  const [deleteTarget, setDeleteTarget] = useState<SemesterTreeNode | null>(null)
  const [name, setName] = useState('')
  const [isActive, setIsActive] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const payload = await fetchCurriculumOverview()
      setSemesters(payload.semesters)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '讀取學期資料失敗')
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setName('')
    setIsActive(semesters.length === 0)
    setModal({ mode: 'create' })
  }

  function openEdit(semester: SemesterTreeNode) {
    setName(semester.name)
    setIsActive(semester.is_active)
    setModal({ mode: 'edit', semester })
  }

  function closeModal() {
    setModal(null)
    setName('')
    setIsActive(false)
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('請輸入學期名稱')
      return
    }

    setMessage('')
    setError('')

    try {
      if (modal?.mode === 'edit') {
        const { semester } = await requestJson<{ semester: Semester }>(
          '/api/dashboard/curriculum',
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'semester',
              id: modal.semester.id,
              name: name.trim(),
              is_active: isActive,
            }),
          },
        )
        closeModal()
        setMessage('學期更新成功')
        setSemesters((prev) =>
          prev
            .map((s) => {
              if (s.id === semester.id) return { ...s, ...semester }
              if (semester.is_active) return { ...s, is_active: false }
              return s
            })
            .sort((a, b) => {
              if (a.is_active !== b.is_active) return a.is_active ? -1 : 1
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            }),
        )
      } else {
        const { semester } = await requestJson<{ semester: Semester }>(
          '/api/dashboard/curriculum',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'semester',
              name: name.trim(),
              is_active: isActive,
            }),
          },
        )
        const newSemesterNode: SemesterTreeNode = {
          ...semester,
          chapters: [],
          stats: { chapterCount: 0, courseCount: 0, publishedCourseCount: 0, draftCourseCount: 0 },
        }
        closeModal()
        setMessage('學期新增成功')
        setSemesters((prev) => {
          const withDeactivated = semester.is_active
            ? prev.map((s) => ({ ...s, is_active: false }))
            : prev
          return [newSemesterNode, ...withDeactivated].sort((a, b) => {
            if (a.is_active !== b.is_active) return a.is_active ? -1 : 1
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          })
        })
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '儲存失敗')
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
          type: 'semester',
          id: deleteTarget.id,
        }),
      })
      setMessage('學期刪除成功')
      setSemesters((prev) => prev.filter((s) => s.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '刪除失敗')
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Curriculum Structure</p>
          <h2>學期管理</h2>
          <p>
            這裡專注維護課程週期本身。你可以調整名稱、切換啟用學期，並快速檢視各學期承載的章節與課程規模。
          </p>
        </div>
        <div className={styles.heroActions}>
          <button className={styles.primaryButton} onClick={openCreate}>
            <FontAwesomeIcon icon={faPlus} />
            <span>新增學期</span>
          </button>
        </div>
      </section>

      <section className={styles.summaryGrid}>
        <article className={styles.summaryCard}>
          <span className={styles.summaryLabel}>學期數量</span>
          <strong className={styles.summaryValue}>{semesters.length}</strong>
        </article>
        <article className={styles.summaryCard}>
          <span className={styles.summaryLabel}>目前啟用</span>
          <strong className={styles.summaryValue}>
            {semesters.find((semester) => semester.is_active)?.name || '尚未設定'}
          </strong>
        </article>
      </section>

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
      {loading ? <div className={styles.emptyState}>正在載入學期資料…</div> : null}
      {!loading && semesters.length === 0 ? (
        <div className={styles.emptyState}>尚未建立學期，先新增一個週期開始規劃。</div>
      ) : null}

      {!loading &&
        semesters.map((semester) => (
          <section key={semester.id} className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleGroup}>
                <div className={styles.semesterTitleRow}>
                  <h3>{semester.name}</h3>
                  {semester.is_active ? (
                    <span className={styles.activeBadge}>目前啟用</span>
                  ) : (
                    <span className={styles.mutedBadge}>未啟用</span>
                  )}
                </div>
                <p>建立時間：{formatDashboardDate(semester.created_at)}</p>
              </div>
              <div className={styles.sectionActions}>
                <button className={styles.subtleButton} onClick={() => openEdit(semester)}>
                  <FontAwesomeIcon icon={faPencil} />
                  <span>編輯</span>
                </button>
                <button
                  className={styles.dangerButton}
                  onClick={() => setDeleteTarget(semester)}
                >
                  <FontAwesomeIcon icon={faTrash} />
                  <span>刪除</span>
                </button>
              </div>
            </div>

            <div className={styles.metaRow}>
              <span className={styles.filterPill}>
                <FontAwesomeIcon icon={faCalendarDays} />
                {semester.stats.chapterCount} 個章節
              </span>
              <span className={styles.filterPill}>
                {semester.stats.courseCount} 堂課程
              </span>
              <span className={styles.publishedBadge}>
                已發布 {semester.stats.publishedCourseCount}
              </span>
              <span className={styles.draftBadge}>
                草稿 {semester.stats.draftCourseCount}
              </span>
            </div>
          </section>
        ))}

      <Modal
        isOpen={modal !== null}
        onClose={closeModal}
        title={modal?.mode === 'edit' ? '編輯學期' : '新增學期'}
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
            <label className={styles.fieldLabel} htmlFor="semester-name">
              學期名稱
            </label>
            <input
              id="semester-name"
              name="semesterName"
              autoComplete="off"
              className={styles.textInput}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="例如：113-2 培訓課程…"
            />
          </div>
          <label className={styles.checkboxRow} htmlFor="semester-active">
            <input
              id="semester-active"
              name="semesterIsActive"
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            <span>設為目前啟用學期</span>
          </label>
        </div>
      </Modal>

      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="確認刪除學期"
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
          <p className={styles.fieldHint}>
            刪除後會一併移除學期底下的章節與課程，請再次確認。
          </p>
        </div>
      </Modal>
    </div>
  )
}
