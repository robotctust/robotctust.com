'use client'

import { useMemo, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPlus,
  faTrash,
  faUsers,
} from '@fortawesome/free-solid-svg-icons'
import { Modal } from '@/app/[locale]/dashboard/components/Modal'
import {
  MembersOverviewPayload,
  SemesterWithMembers,
  MemberWithUser,
} from '@/app/types/member-admin'
import { fetchMembersOverview, requestJson } from './client-utils'
import { useToast } from '@/app/contexts/ToastContext'
import { Skeleton } from '@/app/components/Skeleton'
import styles from './members.module.scss'

type ModalState =
  | null
  | { kind: 'add-members'; semesterId: string; semesterName: string }

type DeleteState = null | {
  memberId: string
  studentId: string
  label: string
}

export default function MembersClient({
  initialOverview,
}: {
  initialOverview: MembersOverviewPayload
}) {
  const { showToast } = useToast()
  
  const [overview, setOverview] = useState<MembersOverviewPayload>(initialOverview)
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState<ModalState>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteState>(null)

  // Fields
  const [studentIdsInput, setStudentIdsInput] = useState('')

  async function loadOverview() {
    setLoading(true)
    try {
      const payload = await fetchMembersOverview()
      setOverview(payload)
    } catch (loadError) {
      showToast(loadError instanceof Error ? loadError.message : '讀取名單失敗', 'error')
    } finally {
      setLoading(false)
    }
  }

  const totals = useMemo(() => {
    return overview.semesters.reduce(
      (acc, semester) => {
        acc.semesterCount += 1
        acc.totalEntries += semester.members.length
        if (semester.is_active) {
          acc.activeMemberCount += semester.members.length
        }
        return acc
      },
      {
        semesterCount: 0,
        totalEntries: 0,
        activeMemberCount: 0,
      },
    )
  }, [overview.semesters])

  function resetModalFields() {
    setStudentIdsInput('')
  }

  function closeModal() {
    setModal(null)
    resetModalFields()
  }

  function openAddMembers(semesterId: string, semesterName: string) {
    resetModalFields()
    setModal({ kind: 'add-members', semesterId, semesterName })
  }

  async function handleSubmitModal() {
    if (!modal) return

    try {
      if (modal.kind === 'add-members') {
        if (!studentIdsInput.trim()) throw new Error('請至少輸入一筆學號')

        const studentIds = studentIdsInput
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)

        if (studentIds.length === 0) throw new Error('沒有有效的學號可以新增')

        const { added } = await requestJson<{ added: MemberWithUser[] }>(
          '/api/dashboard/members',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'add-members',
              semester_id: modal.semesterId,
              student_ids: studentIds,
            }),
          },
        )

        showToast(`成功新增 ${added.length} 筆社員紀錄`, 'success')
        
        // 重新讀取確保拉齊資料庫關聯 (Left join Users)
        await loadOverview()
      }

      closeModal()
    } catch (submitError) {
      showToast(submitError instanceof Error ? submitError.message : '儲存失敗', 'error')
    }
  }

  function promptDelete(memberId: string, studentId: string, name: string) {
    setDeleteTarget({
      memberId,
      studentId,
      label: name ? `${studentId} (${name})` : studentId,
    })
  }

  async function confirmDelete() {
    if (!deleteTarget) return

    try {
      await requestJson('/api/dashboard/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'delete-member',
          id: deleteTarget.memberId,
        }),
      })

      showToast(`已移除社員 ${deleteTarget.label}`, 'success')
      setOverview((prev) => ({
        semesters: prev.semesters.map((s) => ({
          ...s,
          members: s.members.filter((m) => m.id !== deleteTarget.memberId),
        })),
      }))

      setDeleteTarget(null)
    } catch (deleteError) {
      showToast(deleteError instanceof Error ? deleteError.message : '刪除失敗', 'error')
    }
  }

  const modalTitle = modal?.kind === 'add-members' ? '批次新增社員' : ''

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <h2>學期名單管理</h2>
          <p className={styles.heroDescription}>
            依照學期彙整社員名單，後續的課程系統與證書都會依照這些名單來核對存取權限。
          </p>
        </div>
      </header>

      <section className={styles.statsGrid}>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>總學期數</span>
          <strong className={styles.statValue}>{totals.semesterCount}</strong>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>當前學期社員</span>
          <strong className={styles.statValue}>
            {totals.activeMemberCount}
          </strong>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>累計名單數</span>
          <strong className={styles.statValue}>{totals.totalEntries}</strong>
        </article>
      </section>

      {loading && (
        <>
          <Skeleton variant="stat"    count={3} layout="row" />
          <Skeleton variant="section" count={1} />
        </>
      )}

      {!loading && overview.semesters.length === 0 && (
        <div className={styles.emptyState}>
          目前沒有任何學期。請先到「課程總覽」新增學期。
        </div>
      )}

      {!loading &&
        overview.semesters.map((semester: SemesterWithMembers) => (
          <section key={semester.id} className={styles.semesterSection}>
            <header className={styles.semesterHeader}>
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
                      <FontAwesomeIcon icon={faUsers} />
                      {semester.members.length} 位名單
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.sectionActions}>
                <button
                  className={styles.primaryButton}
                  onClick={() => openAddMembers(semester.id, semester.name)}
                >
                  <FontAwesomeIcon icon={faPlus} />
                  <span>批次匯入學號</span>
                </button>
              </div>
            </header>

            <div className={styles.memberList}>
              {semester.members.length === 0 ? (
                <div className={styles.inSectionEmpty}>
                  這個學期尚未加入任何名單，點擊上方匯入。
                </div>
              ) : (
                semester.members.map((member) => (
                  <article key={member.id} className={styles.memberCard}>
                    <div className={styles.memberInfo}>
                      <h4 className={styles.studentId}>{member.student_id}</h4>
                      {member.user ? (
                        <p className={styles.userName}>
                          {member.user.display_name}{' '}
                          <span className={styles.userUsername}>
                            (@{member.user.username})
                          </span>
                        </p>
                      ) : (
                        <span className={styles.unregistered}>尚未註冊</span>
                      )}
                    </div>
                    <div className={styles.memberActions}>
                      <button
                        className={styles.iconButtonDanger}
                        onClick={() =>
                          promptDelete(
                            member.id,
                            member.student_id,
                            member.user?.display_name || '',
                          )
                        }
                        aria-label={`移除 ${member.student_id}`}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        ))}

      <Modal isOpen={modal !== null} onClose={closeModal} title={modalTitle}>
        {modal?.kind === 'add-members' && (
          <div className={styles.modalForm}>
            <p className={styles.fieldHint}>
              準備新增學號至 <strong>{modal.semesterName}</strong>。
              請直接貼上所有的學號列表，一行代表一個學號。系統會自動去除空白與重複值，不會重複寫入。
            </p>
            <div className={styles.fieldGroup}>
              <textarea
                id="studentIds"
                className={styles.textareaInput}
                value={studentIdsInput}
                onChange={(e) => setStudentIdsInput(e.target.value)}
                placeholder="Ex. 1105xx001&#10;1105xx002&#10;1105xx003"
                autoFocus
              />
              <p className={styles.inputCount}>
                已輸入{' '}
                <strong>
                  {studentIdsInput.split('\n').map((l) => l.trim()).filter(Boolean).length}
                </strong>{' '}
                筆學號
              </p>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.cancelButton} onClick={closeModal}>
                取消
              </button>
              <button
                className={styles.primaryButton}
                onClick={handleSubmitModal}
              >
                處理並匯入
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="確認刪除"
      >
        {deleteTarget && (
          <div className={styles.confirmBody}>
            <p className={styles.confirmText}>
              確定要將 <strong>{deleteTarget.label}</strong> 從這個學期中移除嗎？
            </p>
            <p className={styles.fieldHint}>此操作無法復原，但您可以稍後再次加入同樣的學號。</p>
            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setDeleteTarget(null)}
              >
                取消
              </button>
              <button
                className={styles.dangerButton}
                onClick={confirmDelete}
              >
                確認移除
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
