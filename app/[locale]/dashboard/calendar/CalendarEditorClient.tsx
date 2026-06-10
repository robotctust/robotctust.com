'use client'

import { useState, useEffect } from 'react'
import { useRouter } from '@/i18n/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSave, faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { Link } from '@/i18n/navigation'
import { useToast } from '@/app/contexts/ToastContext'
import { ScheduleEvent } from '@/app/types/Schedule'
import { SemesterOption } from '@/app/utils/scheduleService'
import styles from './calendar.module.scss'

const TYPE_OPTIONS: { value: ScheduleEvent['type']; label: string }[] = [
  { value: 'class', label: '課程（上課時間）' },
  { value: 'activity', label: '活動（社團活動）' },
  { value: 'event', label: '事件（社團行程）' },
  { value: 'competition', label: '競賽' },
  { value: 'school-event', label: '校務行事曆' },
]

interface Props {
  event?: ScheduleEvent
}

export default function CalendarEditorClient({ event }: Props) {
  const router = useRouter()
  const { showToast } = useToast()
  const isEdit = !!event

  const [title, setTitle] = useState(event?.title ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [type, setType] = useState<ScheduleEvent['type']>(event?.type ?? 'event')
  const [startDate, setStartDate] = useState(event?.startDateTime.date ?? '')
  const [startTime, setStartTime] = useState(event?.startDateTime.time ?? '00:00')
  const [endDate, setEndDate] = useState(event?.endDateTime.date ?? '')
  const [endTime, setEndTime] = useState(event?.endDateTime.time ?? '23:59')
  const [location, setLocation] = useState(event?.location ?? '')
  const [instructor, setInstructor] = useState(event?.instructor ?? '')
  const [priority, setPriority] = useState(event?.priority ?? 0)
  const [published, setPublished] = useState(event?.published ?? false)
  const [semesterId, setSemesterId] = useState<string>(event?.semesterId ?? '')
  const [semesters, setSemesters] = useState<SemesterOption[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/dashboard/semesters')
      .then((r) => r.json())
      .then((data: SemesterOption[]) => setSemesters(data))
      .catch(() => { /* 非必要欄位，靜默失敗 */ })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { showToast('請填寫事件標題', 'error'); return }
    if (!startDate) { showToast('請選擇開始日期', 'error'); return }
    if (!endDate) { showToast('請選擇結束日期', 'error'); return }
    if (endDate < startDate) { showToast('結束日期不能早於開始日期', 'error'); return }

    setSaving(true)
    try {
      const payload: Partial<ScheduleEvent> = {
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        startDateTime: { date: startDate, time: startTime },
        endDateTime: { date: endDate, time: endTime },
        location: location.trim() || undefined,
        instructor: instructor.trim() || undefined,
        priority,
        published,
        semesterId: semesterId || null,
      }

      const url = isEdit ? `/api/dashboard/calendar/${event.id}` : '/api/dashboard/calendar'
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '操作失敗')
      }

      showToast(isEdit ? '事件已更新' : '事件已建立', 'success')
      router.push('/dashboard/calendar')
    } catch (err) {
      showToast(err instanceof Error ? err.message : '操作失敗', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.editorContainer}>
      <header className={styles.editorHeader}>
        <Link href="/dashboard/calendar" className={styles.backLink}>
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>返回列表</span>
        </Link>
        <h1 className={styles.editorTitle}>{isEdit ? '編輯事件' : '新增事件'}</h1>
      </header>

      <form onSubmit={(e) => void handleSubmit(e)} className={styles.editorForm}>
        {/* 基本資訊 */}
        <section className={styles.formSection}>
          <h2 className={styles.sectionTitle}>基本資訊</h2>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              標題 <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="事件標題"
              className={styles.input}
              required
            />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>類型 <span className={styles.required}>*</span></label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ScheduleEvent['type'])}
                className={styles.select}
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>學期</label>
              <select
                value={semesterId}
                onChange={(e) => setSemesterId(e.target.value)}
                className={styles.select}
              >
                <option value="">— 不關聯學期 —</option>
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="事件描述（選填）"
              className={styles.textarea}
              rows={3}
            />
          </div>
        </section>

        {/* 時間 */}
        <section className={styles.formSection}>
          <h2 className={styles.sectionTitle}>時間</h2>
          <div className={styles.dateTimeRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>開始日期 <span className={styles.required}>*</span></label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>開始時間</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={styles.input}
              />
            </div>
          </div>
          <div className={styles.dateTimeRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>結束日期 <span className={styles.required}>*</span></label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>結束時間</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={styles.input}
              />
            </div>
          </div>
        </section>

        {/* 詳細資訊 */}
        <section className={styles.formSection}>
          <h2 className={styles.sectionTitle}>詳細資訊</h2>
          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>地點</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="事件地點（選填）"
                className={styles.input}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>負責人 / 講師</label>
              <input
                type="text"
                value={instructor}
                onChange={(e) => setInstructor(e.target.value)}
                placeholder="負責人或講師（選填）"
                className={styles.input}
              />
            </div>
          </div>
          <div className={styles.fieldGroup} style={{ maxWidth: 160 }}>
            <label className={styles.label}>優先級</label>
            <input
              type="number"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              min={0}
              max={100}
              className={styles.input}
            />
            <span className={styles.hint}>數字越小優先級越高</span>
          </div>
        </section>

        {/* 發布設定 */}
        <section className={styles.formSection}>
          <h2 className={styles.sectionTitle}>發布設定</h2>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className={styles.checkbox}
            />
            <span>發布此事件（勾選後前台行事曆即可看見）</span>
          </label>
        </section>

        <div className={styles.formActions}>
          <Link href="/dashboard/calendar" className="secondary-button">取消</Link>
          <button type="submit" className="primary-button" disabled={saving}>
            <FontAwesomeIcon icon={faSave} />
            <span>{saving ? '儲存中...' : isEdit ? '儲存變更' : '建立事件'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
