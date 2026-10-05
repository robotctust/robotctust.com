'use client'

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSave } from '@fortawesome/free-solid-svg-icons'
import { useToast } from '@/app/contexts/ToastContext'
import { Modal } from '@/app/[locale]/dashboard/components/Modal'
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

const FORM_ID = 'calendar-event-form'

interface Props {
  event?: ScheduleEvent
  semesters: SemesterOption[]
  /** 新增時預設的學期（帶入列表目前篩選的學期） */
  defaultSemesterId?: string
  onClose: () => void
  onSaved: (event: ScheduleEvent) => void
}

/** 新增 / 編輯事件彈窗；每次開啟都重新掛載，表單狀態不需手動重置 */
export default function CalendarEventModal({ event, semesters, defaultSemesterId = '', onClose, onSaved }: Props) {
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
  const [semesterId, setSemesterId] = useState<string>(event ? event.semesterId ?? '' : defaultSemesterId)
  const [saving, setSaving] = useState(false)

  function changeStartDate(value: string) {
    setStartDate(value)
    // 結束日期未填或早於開始日期時，自動帶入同一天
    if (!endDate || endDate < value) setEndDate(value)
  }

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

      const res = await fetch(isEdit ? `/api/dashboard/calendar/${event.id}` : '/api/dashboard/calendar', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '操作失敗')

      showToast(isEdit ? '事件已更新' : '事件已建立', 'success')
      onSaved(data as ScheduleEvent)
    } catch (err) {
      showToast(err instanceof Error ? err.message : '操作失敗', 'error')
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEdit ? '編輯事件' : '新增事件'}
      maxWidth="680px"
      footer={
        <>
          <button type="button" className="secondary-button" onClick={onClose} disabled={saving}>取消</button>
          <button type="submit" form={FORM_ID} className="primary-button" disabled={saving}>
            <FontAwesomeIcon icon={faSave} />
            <span>{saving ? '儲存中...' : isEdit ? '儲存變更' : '建立事件'}</span>
          </button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={(e) => void handleSubmit(e)} className={styles.editorForm}>
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
            autoFocus
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

        <div className={styles.dateTimeRow}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>開始日期 <span className={styles.required}>*</span></label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => changeStartDate(e.target.value)}
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
              min={startDate || undefined}
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

        <label className={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className={styles.checkbox}
          />
          <span>發布此事件（勾選後前台行事曆即可看見）</span>
        </label>
      </form>
    </Modal>
  )
}
