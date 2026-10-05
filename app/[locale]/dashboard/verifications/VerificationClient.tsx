'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import styles from './verification.module.scss'

// utils
import { createClient } from '@/app/utils/supabase/client'
import { useToast } from '@/app/contexts/ToastContext'
import { Modal } from '@/app/components/Modal'
import { Table, TableColumn } from '@/app/components/Table'

interface VerificationItem {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  user_id: string
  course_id: string
  users: {
    student_id: string | null
    display_name: string | null
    username: string | null
  } | null
  courses: {
    id: string
    name: string
  } | null
}

function formatSubmittedAt(iso: string) {
  return new Date(iso).toLocaleString('zh-TW', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * [Component] 課程審核中控台
 * @returns 課程審核中控台
 */
export default function VerificationClient({
  initialPending,
  initialProcessed,
}: {
  initialPending: VerificationItem[]
  initialProcessed: VerificationItem[]
}) {
  const { showToast } = useToast()
  // 建立 Supabase Client
  const supabase = useMemo(() => createClient(), [])
  // 待審核的課程驗證項目列表
  const [pendingRows, setPendingRows] = useState<VerificationItem[]>(initialPending)
  // 最近已處理的課程驗證項目列表
  const [processedRows, setProcessedRows] = useState<VerificationItem[]>(initialProcessed)
  // 正在處理的課程驗證項目 ID
  const [processingId, setProcessingId] = useState<string | null>(null)
  // 等待撤回確認的驗證單 ID
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null)
  // 本次 realtime 更新中新出現的 ID（用於 highlight 動畫）
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const prevPendingIdsRef = useRef<Set<string>>(
    new Set(initialPending.map((r) => r.id)),
  )

  /**
   * [Function] 獲取待審核的課程驗證項目
   * @param highlight 是否偵測並 highlight 新進的資料列（realtime 更新時傳 true）
   */
  const fetchPending = useCallback(async (highlight = false) => {
    try {
      const res = await fetch('/api/dashboard/verifications/pending')
      const data = (await res.json()) as
        | { rows: VerificationItem[] }
        | { error: string }

      if (!res.ok || 'error' in data) {
        throw new Error('error' in data ? data.error : '取得待審核清單失敗')
      }

      if (highlight) {
        const incoming = new Set(data.rows.map((r) => r.id))
        const fresh = [...incoming].filter((id) => !prevPendingIdsRef.current.has(id))
        if (fresh.length > 0) {
          setNewIds(new Set(fresh))
          // 2 秒後清除 highlight，避免重複觸發動畫
          setTimeout(() => setNewIds(new Set()), 2000)
        }
        prevPendingIdsRef.current = incoming
      } else {
        prevPendingIdsRef.current = new Set(data.rows.map((r) => r.id))
      }

      setPendingRows(data.rows)
    } catch (error) {
      console.error('Fetch pending error:', error)
    }
  }, [])

  /**
   * [Function] 獲取最近已處理的課程驗證項目
   */
  const fetchProcessed = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/verifications/processed')
      const data = (await res.json()) as
        | { rows: VerificationItem[] }
        | { error: string }

      if (!res.ok || 'error' in data) {
        throw new Error('error' in data ? data.error : '取得已處理清單失敗')
      }

      setProcessedRows(data.rows)
    } catch (error) {
      console.error('Fetch processed error:', error)
    }
  }, [])

  /**
   * [Effect] 監聽課程驗證變化（首屏資料由伺服器帶入，不必再抓）
   */
  useEffect(() => {
    // 建立 Supabase Channel
    const channel = supabase
      .channel('dashboard-verifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'course_verifications',
        },
        () => {
          void fetchPending(true)
          void fetchProcessed()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchPending, fetchProcessed])

  /**
   * [Function] 處理課程驗證項目 (核准/退回)
   */
  const handleAction = useCallback(
    async (id: string, action: 'approve' | 'reject') => {
      setProcessingId(id)

      try {
        const res = await fetch(`/api/dashboard/verifications/${id}/${action}`, {
          method: 'PATCH',
        })
        const data = (await res.json()) as { success?: boolean; error?: string }

        if (!res.ok || data.error) {
          throw new Error(
            data.error || `無法${action === 'approve' ? '核准' : '退回'}`,
          )
        }

        await Promise.all([fetchPending(), fetchProcessed()])
        showToast(
          `驗證單已${action === 'approve' ? '核准' : '退回'}`,
          'success',
        )
      } catch (error) {
        showToast(error instanceof Error ? error.message : '操作失敗', 'error')
      } finally {
        setProcessingId(null)
      }
    },
    [fetchPending, fetchProcessed, showToast],
  )

  const pendingColumns = useMemo<TableColumn<VerificationItem>[]>(
    () => [
      {
        key: 'created_at',
        header: '送審時間',
        nowrap: true,
        className: styles.timestamp,
        sortable: true,
        sortAccessor: (row) => new Date(row.created_at),
        render: (row) => formatSubmittedAt(row.created_at),
      },
      {
        key: 'course',
        header: '課程',
        className: styles.courseName,
        searchable: true,
        searchAccessor: (row) => row.courses?.name || row.course_id,
        render: (row) => row.courses?.name || row.course_id,
      },
      {
        key: 'student',
        header: '學員',
        searchable: true,
        searchAccessor: (row) =>
          [
            row.users?.display_name,
            row.users?.username,
            row.users?.student_id,
            row.user_id,
          ]
            .filter(Boolean)
            .join(' '),
        render: (row) => (
          <div className={styles.studentInfo}>
            <span className={styles.studentName}>
              {row.users?.display_name || row.users?.username || row.user_id}
            </span>
            <span className={styles.studentId}>
              {row.users?.student_id || '-'}
            </span>
          </div>
        ),
      },
      {
        key: 'actions',
        header: '操作',
        nowrap: true,
        className: styles.actionCell,
        render: (row) => (
          <div className={styles.actions}>
            <button
              type="button"
              disabled={processingId === row.id}
              onClick={() => void handleAction(row.id, 'approve')}
            >
              核准
            </button>
            <button
              type="button"
              disabled={processingId === row.id}
              onClick={() => void handleAction(row.id, 'reject')}
            >
              退回
            </button>
          </div>
        ),
      },
    ],
    [handleAction, processingId],
  )

  const processedColumns = useMemo<TableColumn<VerificationItem>[]>(
    () => [
      ...pendingColumns.slice(0, 3),
      {
        key: 'status',
        header: '狀態',
        className: styles.statusCell,
        render: (row) => (
          <span className={`${styles.statusBadge} ${styles[row.status]}`}>
            {row.status === 'approved' ? '已核准' : '已退回'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '操作',
        nowrap: true,
        className: styles.actionCell,
        render: (row) => (
          <div className={styles.actions}>
            <button
              type="button"
              disabled={processingId === row.id}
              onClick={() => setRevokeTarget(row.id)}
            >
              撤回
            </button>
          </div>
        ),
      },
    ],
    [pendingColumns, processingId],
  )

  /**
   * [Function] 撤回課程驗證項目（確認後執行）
   */
  async function confirmRevoke() {
    if (!revokeTarget) return
    const id = revokeTarget
    setRevokeTarget(null)
    setProcessingId(id)

    try {
      const res = await fetch(`/api/dashboard/verifications/${id}/revoke`, {
        method: 'PATCH',
      })
      const data = (await res.json()) as { success?: boolean; error?: string }

      if (!res.ok || data.error) {
        throw new Error(data.error || '無法撤回審核')
      }

      await Promise.all([fetchPending(), fetchProcessed()])
      showToast('已撤回，驗證單重新回到待審核清單', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '撤回失敗', 'error')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className={styles.wrapper}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <h2>課程審核中控台</h2>
          <p className={styles.heroDescription}>
            即時處理學員的課程完成驗證請求。
          </p>
        </div>
      </section>

      <section className={styles.statsGrid}>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>待審核請求</span>
          <strong className={styles.statValue}>{pendingRows.length}</strong>
        </article>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>待審核清單</h3>
        <Table<VerificationItem>
          columns={pendingColumns}
          data={pendingRows}
          rowKey={(row) => row.id}
          emptyMessage="目前沒有待審核請求。"
          rowClassName={(row) =>
            newIds.has(row.id) ? styles.newRow : undefined
          }
        />
      </section>

      <section className={styles.section} style={{ marginTop: '2rem' }}>
        <h3 className={styles.sectionTitle}>最近已認證紀錄</h3>
        <Table<VerificationItem>
          columns={processedColumns}
          data={processedRows}
          rowKey={(row) => row.id}
          emptyMessage="目前沒有已處理的紀錄。"
        />
      </section>

      <Modal
        isOpen={revokeTarget !== null}
        onClose={() => setRevokeTarget(null)}
        title="確認撤回"
        maxWidth="480px"
        compact
        footer={
          <>
            <button
              type="button"
              className={styles.modalCancelButton}
              onClick={() => setRevokeTarget(null)}
            >
              取消
            </button>
            <button
              type="button"
              className={styles.modalDangerButton}
              onClick={() => void confirmRevoke()}
            >
              確認撤回
            </button>
          </>
        }
      >
        <p>確定要撤回此審核紀錄嗎？該驗證單的狀態將會重設為待審核。</p>
      </Modal>
    </div>
  )
}
