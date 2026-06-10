'use client'

import { useState, useEffect } from 'react'
import { Link } from '@/i18n/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faCode, faTrash } from '@fortawesome/free-solid-svg-icons'
import { Program } from '@/app/types/course-admin'
import { useToast } from '@/app/contexts/ToastContext'
import { Modal } from '@/app/[locale]/dashboard/components/Modal'
import { Skeleton } from '@/app/components/Skeleton'
import styles from './programs.module.scss'

export default function ProgramsListClient() {
  const { showToast } = useToast()
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Program | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function loadPrograms() {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard/programs')
      if (!res.ok) throw new Error('載入失敗')
      const data = await res.json()
      setPrograms(data)
    } catch (err) {
      showToast('載入程式檔案列表時發生錯誤', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPrograms()
  }, [])

  const filteredPrograms = programs.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.language?.toLowerCase().includes(search.toLowerCase())
  )

  function promptDelete(e: React.MouseEvent, program: Program) {
    e.preventDefault()
    e.stopPropagation()
    setDeleteTarget(program)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)

    try {
      const res = await fetch(`/api/dashboard/programs/${deleteTarget.id}`, { method: 'DELETE' })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || '刪除失敗')

      setPrograms(prev => prev.filter(p => p.id !== deleteTarget.id))
      showToast(`已刪除「${deleteTarget.name}」`, 'success')
      setDeleteTarget(null)
    } catch (err) {
      showToast(err instanceof Error ? err.message : '刪除失敗', 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>程式檔案庫 (Programs)</h1>
        <div className={styles.controls}>
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="搜尋程式名稱或語言..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="dashboard-input"
            />
          </div>
          <Link href="/dashboard/programs/new" className="primary-button">
            <FontAwesomeIcon icon={faPlus} />
            <span>新增程式檔案</span>
          </Link>
        </div>
      </header>

      {loading ? (
        <Skeleton variant="card" count={6} layout="grid" />
      ) : filteredPrograms.length === 0 ? (
        <div className={styles.emptyState}>
          <FontAwesomeIcon icon={faCode} size="3x" style={{ marginBottom: '16px' }} />
          <p>{search ? '找不到符合搜尋條件的程式檔案' : '目前還沒有任何程式檔案。'}</p>
        </div>
      ) : (
        <div className={styles.programsGrid}>
          {filteredPrograms.map((program) => (
            <Link
              key={program.id}
              href={`/dashboard/programs/${program.id}`}
              className={styles.programCard}
            >
              <div className={styles.programHeader}>
                <h2 className={styles.programName}>{program.name}</h2>
                <span className={styles.programLang}>{program.language || 'cpp'}</span>
              </div>
              <div className={styles.programPreview}>
                <pre>{program.code_content}</pre>
              </div>
              <div className={styles.programFooter}>
                <span>建立於 {new Date(program.created_at).toLocaleDateString()}</span>
                <button
                  onClick={(e) => promptDelete(e, program)}
                  className="icon-button-danger"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="確認刪除程式檔案"
        maxWidth="480px"
        footer={
          <>
            <button onClick={() => setDeleteTarget(null)} disabled={deleting}>
              取消
            </button>
            <button
              onClick={() => void confirmDelete()}
              disabled={deleting}
              data-danger="true"
            >
              {deleting ? '刪除中...' : '確認刪除'}
            </button>
          </>
        }
      >
        <p>
          你即將刪除 <strong>{deleteTarget?.name}</strong>。
        </p>
        <p style={{ marginTop: '8px', color: 'var(--foreground-secondary)', fontSize: '0.9rem' }}>
          若仍有課程內容引用此程式檔案，刪除將會失敗。
        </p>
      </Modal>
    </div>
  )
}
