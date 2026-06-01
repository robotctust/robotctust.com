'use client'

import { useState, useEffect, useMemo } from 'react'
import { Link } from '@/i18n/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faEdit, faTrash, faCalendar, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'
import { useToast } from '@/app/contexts/ToastContext'
import { Modal } from '@/app/[locale]/dashboard/components/Modal'
import { Skeleton } from '@/app/components/Skeleton'
import { ScheduleEvent } from '@/app/types/Schedule'
import styles from './calendar.module.scss'

const TYPE_LABELS: Record<ScheduleEvent['type'], string> = {
  'class': '課程',
  'competition': '競賽',
  'activity': '活動',
  'event': '事件',
  'school-event': '校務行事曆',
}

const TYPE_COLORS: Record<ScheduleEvent['type'], { bg: string; text: string; border: string }> = {
  'class': { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6', border: 'rgba(59,130,246,0.3)' },
  'competition': { bg: 'rgba(168,85,247,0.12)', text: '#a855f7', border: 'rgba(168,85,247,0.3)' },
  'activity': { bg: 'rgba(34,197,94,0.12)', text: '#22c55e', border: 'rgba(34,197,94,0.3)' },
  'event': { bg: 'rgba(239,68,68,0.12)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' },
  'school-event': { bg: 'rgba(107,114,128,0.12)', text: '#6b7280', border: 'rgba(107,114,128,0.3)' },
}

type TypeFilter = ScheduleEvent['type'] | 'all'
type PublishFilter = 'all' | 'published' | 'unpublished'
type SemesterFilter = string | 'all'

interface SemesterOpt { id: string; name: string }

export default function CalendarListClient() {
  const { showToast } = useToast()
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [semesters, setSemesters] = useState<SemesterOpt[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [publishFilter, setPublishFilter] = useState<PublishFilter>('all')
  const [semesterFilter, setSemesterFilter] = useState<SemesterFilter>('all')
  const [deleteTarget, setDeleteTarget] = useState<ScheduleEvent | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  async function loadEvents() {
    setLoading(true)
    try {
      const [evRes, semRes] = await Promise.all([
        fetch('/api/dashboard/calendar'),
        fetch('/api/dashboard/semesters'),
      ])
      if (!evRes.ok) throw new Error('載入失敗')
      setEvents(await evRes.json())
      if (semRes.ok) setSemesters(await semRes.json())
    } catch {
      showToast('載入事件列表時發生錯誤', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadEvents() }, [])

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const matchType = typeFilter === 'all' || ev.type === typeFilter
      const matchPublish =
        publishFilter === 'all' ||
        (publishFilter === 'published' && ev.published) ||
        (publishFilter === 'unpublished' && !ev.published)
      const matchSemester =
        semesterFilter === 'all' ||
        (semesterFilter === 'none' ? !ev.semesterId : ev.semesterId === semesterFilter)
      const matchSearch =
        !search ||
        ev.title.toLowerCase().includes(search.toLowerCase()) ||
        ev.location?.toLowerCase().includes(search.toLowerCase())
      return matchType && matchPublish && matchSemester && matchSearch
    })
  }, [events, typeFilter, publishFilter, semesterFilter, search])

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/dashboard/calendar/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '刪除失敗')
      }
      setEvents((prev) => prev.filter((e) => e.id !== deleteTarget.id))
      showToast(`已刪除「${deleteTarget.title}」`, 'success')
      setDeleteTarget(null)
    } catch (err) {
      showToast(err instanceof Error ? err.message : '刪除失敗', 'error')
    } finally {
      setDeleting(false)
    }
  }

  async function togglePublish(ev: ScheduleEvent) {
    setTogglingId(ev.id)
    try {
      const res = await fetch(`/api/dashboard/calendar/${ev.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !ev.published }),
      })
      if (!res.ok) throw new Error('更新失敗')
      const updated: ScheduleEvent = await res.json()
      setEvents((prev) => prev.map((e) => e.id === ev.id ? updated : e))
      showToast(updated.published ? `已發布「${ev.title}」` : `已取消發布「${ev.title}」`, 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : '更新失敗', 'error')
    } finally {
      setTogglingId(null)
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('zh-TW', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    })
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>行事曆管理</h1>
        <Link href="/dashboard/calendar/new" className="primary-button">
          <FontAwesomeIcon icon={faPlus} />
          <span>新增事件</span>
        </Link>
      </header>

      <div className={styles.filters}>
        <input
          type="text"
          placeholder="搜尋標題或地點..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          className={styles.filterSelect}
        >
          <option value="all">所有類型</option>
          {(Object.keys(TYPE_LABELS) as ScheduleEvent['type'][]).map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
          ))}
        </select>
        <select
          value={publishFilter}
          onChange={(e) => setPublishFilter(e.target.value as PublishFilter)}
          className={styles.filterSelect}
        >
          <option value="all">所有狀態</option>
          <option value="published">已發布</option>
          <option value="unpublished">未發布</option>
        </select>
        <select
          value={semesterFilter}
          onChange={(e) => setSemesterFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">所有學期</option>
          <option value="none">未關聯學期</option>
          {semesters.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <Skeleton variant="table-row" count={8} />
      ) : filteredEvents.length === 0 ? (
        <div className={styles.emptyState}>
          <FontAwesomeIcon icon={faCalendar} size="2x" style={{ marginBottom: 12 }} />
          <p>{search || typeFilter !== 'all' || publishFilter !== 'all' ? '找不到符合條件的事件' : '目前還沒有任何行事曆事件'}</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>標題</th>
                <th>類型</th>
                <th>學期</th>
                <th>開始日期</th>
                <th>結束日期</th>
                <th>地點</th>
                <th>狀態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((ev) => {
                const colors = TYPE_COLORS[ev.type]
                return (
                  <tr key={ev.id}>
                    <td className={styles.titleCell}>
                      <Link href={`/dashboard/calendar/${ev.id}`} className={styles.titleLink}>
                        {ev.title}
                      </Link>
                    </td>
                    <td>
                      <span
                        className={styles.typeBadge}
                        style={{
                          '--badge-bg': colors.bg,
                          '--badge-text': colors.text,
                          '--badge-border': colors.border,
                        } as React.CSSProperties}
                      >
                        {TYPE_LABELS[ev.type]}
                      </span>
                    </td>
                    <td className={styles.semesterCell}>
                      {ev.semesterName ?? <span className={styles.noSemester}>—</span>}
                    </td>
                    <td className={styles.dateCell}>{formatDate(ev.startDateTime.date)} {ev.startDateTime.time}</td>
                    <td className={styles.dateCell}>{formatDate(ev.endDateTime.date)} {ev.endDateTime.time}</td>
                    <td className={styles.locationCell}>{ev.location ?? '—'}</td>
                    <td>
                      <span className={ev.published ? styles.publishedBadge : styles.unpublishedBadge}>
                        {ev.published ? '已發布' : '未發布'}
                      </span>
                    </td>
                    <td className={styles.actionsCell}>
                      <div className={styles.actionButtons}>
                        <button
                          className="icon-button"
                          title={ev.published ? '取消發布' : '發布'}
                          disabled={togglingId === ev.id}
                          onClick={() => void togglePublish(ev)}
                        >
                          <FontAwesomeIcon icon={ev.published ? faEyeSlash : faEye} />
                        </button>
                        <Link
                          href={`/dashboard/calendar/${ev.id}`}
                          className="icon-button"
                          title="編輯事件"
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </Link>
                        <button
                          className="icon-button-danger"
                          title="刪除事件"
                          onClick={() => setDeleteTarget(ev)}
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="確認刪除事件"
        maxWidth="480px"
        footer={
          <>
            <button onClick={() => setDeleteTarget(null)} disabled={deleting}>取消</button>
            <button onClick={() => void confirmDelete()} disabled={deleting} data-danger="true">
              {deleting ? '刪除中...' : '確認刪除'}
            </button>
          </>
        }
      >
        <p>
          你即將刪除 <strong>「{deleteTarget?.title}」</strong>，此操作無法復原。
        </p>
      </Modal>
    </div>
  )
}
