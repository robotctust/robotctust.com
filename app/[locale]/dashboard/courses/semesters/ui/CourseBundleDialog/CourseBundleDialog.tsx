'use client'

import { useRef, useState } from 'react'
import { Modal } from '@/app/components/Modal'
import type { SemesterTreeNode } from '@/app/types/course-admin'
import type { CourseBundle, CourseBundlePreview } from '@/app/types/course-bundle'
import { retargetBundle } from '@/app/utils/dashboard/courseBundleFormat'
import { COURSE_BUNDLE_GUIDE } from '@/app/utils/dashboard/courseBundleGuide'
import { requestJson } from '../../../client-utils'
import styles from './CourseBundleDialog.module.scss'

export type CourseBundleMode = 'import' | 'copy' | 'export'

const TITLES: Record<CourseBundleMode, string> = {
  import: '匯入課程 JSON',
  copy: '從其他學期複製課程',
  export: '匯出課程 JSON',
}

const API = '/api/dashboard/curriculum/bundle'

async function writeClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    throw new Error('瀏覽器不允許寫入剪貼簿，請檢查網站的剪貼簿權限')
  }
}

function allCourseIds(semester: SemesterTreeNode | undefined): Set<string> {
  return new Set(semester?.chapters.flatMap((ch) => ch.courses.map((c) => c.id)) ?? [])
}

/**
 * 課程包對話框
 * - import：貼上或選擇 JSON 檔 → 預覽 → 匯入到這個學期
 * - copy：選來源學期與課程 → 匯出並換掉 slug 裡的學期 → 預覽 → 匯入
 * - export：選課程 → 複製或下載 JSON
 */
export default function CourseBundleDialog({
  mode,
  semester,
  semesters,
  onClose,
  onImported,
}: {
  mode: CourseBundleMode
  /** import / copy 的目標學期；export 的來源學期 */
  semester: SemesterTreeNode
  semesters: SemesterTreeNode[]
  onClose: () => void
  onImported: (courseIds: string[]) => void
}) {
  const sources = semesters.filter((s) => s.id !== semester.id && s.stats.courseCount > 0)
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? '')
  const pickFrom = mode === 'export' ? semester : sources.find((s) => s.id === sourceId)
  const [selected, setSelected] = useState(() => allCourseIds(pickFrom))
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<CourseBundlePreview | null>(null)
  const [bundle, setBundle] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function run(task: () => Promise<void>) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await task()
    } catch (taskError) {
      setError(taskError instanceof Error ? taskError.message : '操作失敗')
    } finally {
      setBusy(false)
    }
  }

  async function exportSelected(): Promise<CourseBundle> {
    const { bundle } = await requestJson<{ bundle: CourseBundle }>(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'export', courseIds: [...selected] }),
    })
    return bundle
  }

  const handlePreview = () =>
    run(async () => {
      let next: unknown
      if (mode === 'copy') {
        next = retargetBundle(await exportSelected(), pickFrom!.name, semester.name)
      } else {
        try {
          next = JSON.parse(text)
        } catch {
          throw new Error('不是有效的 JSON，請檢查括號、引號與逗號')
        }
      }
      const { preview } = await requestJson<{ preview: CourseBundlePreview }>(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview', semesterId: semester.id, bundle: next }),
      })
      setBundle(next)
      setPreview(preview)
    })

  const handleImport = () =>
    run(async () => {
      const { courseIds } = await requestJson<{ courseIds: string[] }>(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import', semesterId: semester.id, bundle }),
      })
      onImported(courseIds)
    })

  const handleExport = (target: 'clipboard' | 'download') =>
    run(async () => {
      const json = JSON.stringify(await exportSelected(), null, 2)
      if (target === 'clipboard') {
        await writeClipboard(json)
        setNotice('已複製到剪貼簿')
        return
      }
      const link = document.createElement('a')
      link.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
      link.download = `courses-${semester.name}.json`
      link.click()
      URL.revokeObjectURL(link.href)
    })

  const copyGuide = () =>
    run(async () => {
      await writeClipboard(COURSE_BUNDLE_GUIDE)
      setNotice('已複製 AI 指南，貼給 AI 並說明要寫的課程內容即可')
    })

  function toggle(ids: string[], checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => (checked ? next.add(id) : next.delete(id)))
      return next
    })
  }

  const inPreview = preview !== null && mode !== 'export'
  const canImport = inPreview && preview.errors.length === 0

  const footer = (
    <>
      {inPreview ? (
        <button className="secondary-button" onClick={() => setPreview(null)} disabled={busy}>
          返回修改
        </button>
      ) : (
        <button className="secondary-button" onClick={onClose} disabled={busy}>
          取消
        </button>
      )}
      {mode === 'export' ? (
        <>
          <button
            className="secondary-button"
            onClick={() => void handleExport('clipboard')}
            disabled={busy || selected.size === 0}
          >
            複製 JSON
          </button>
          <button
            className="primary-button"
            onClick={() => void handleExport('download')}
            disabled={busy || selected.size === 0}
          >
            下載 JSON
          </button>
        </>
      ) : inPreview ? (
        <button
          className="primary-button"
          onClick={() => void handleImport()}
          disabled={busy || !canImport}
        >
          {busy ? '處理中…' : mode === 'copy' ? '確認複製' : '確認匯入'}
        </button>
      ) : (
        <button
          className="primary-button"
          onClick={() => void handlePreview()}
          disabled={busy || (mode === 'copy' ? selected.size === 0 : !text.trim())}
        >
          {busy ? '檢查中…' : '預覽'}
        </button>
      )}
    </>
  )

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={TITLES[mode]}
      maxWidth="720px"
      dismissible={!busy}
      footer={footer}
    >
      <div className={styles.body}>
        {inPreview ? (
          <PreviewView preview={preview} semesterName={semester.name} />
        ) : mode === 'import' ? (
          <>
            <p className={styles.hint}>
              匯入到「{semester.name}」。課程一律存成草稿；章節標題與這個學期既有的章節相同時，課程會加在那個章節的最後。
            </p>
            <div className={styles.toolbar}>
              <button className="secondary-button button-sm" onClick={() => void copyGuide()}>
                複製 AI 指南
              </button>
              <button className="secondary-button button-sm" onClick={() => fileRef.current?.click()}>
                選擇 JSON 檔
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                hidden
                onChange={async (event) => {
                  const file = event.target.files?.[0]
                  if (file) setText(await file.text())
                  event.target.value = ''
                }}
              />
            </div>
            <textarea
              className={styles.jsonInput}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder='{ "version": 1, "chapters": [ … ] }'
              spellCheck={false}
              aria-label="課程 JSON"
            />
          </>
        ) : (
          <>
            {mode === 'copy' ? (
              sources.length === 0 ? (
                <p className={styles.hint}>其他學期還沒有課程可以複製。</p>
              ) : (
                <>
                  <p className={styles.hint}>
                    複製到「{semester.name}」。課程存成草稿；程式檔與網站上的圖片會另存一份，之後修改不會影響原本的學期；學生的驗證紀錄不會複製。
                  </p>
                  <label className={styles.field}>
                    <span>來源學期</span>
                    <select
                      className={styles.select}
                      value={sourceId}
                      onChange={(event) => {
                        setSourceId(event.target.value)
                        setSelected(allCourseIds(sources.find((s) => s.id === event.target.value)))
                      }}
                    >
                      {sources.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}（{s.stats.courseCount} 堂課程）
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )
            ) : (
              <p className={styles.hint}>
                匯出的 JSON 可以交給 AI 修改，再用「匯入」建立成新課程（slug 要改成沒用過的）。
              </p>
            )}
            {pickFrom ? (
              <ul className={styles.tree}>
                {pickFrom.chapters
                  .filter((ch) => ch.courses.length > 0)
                  .map((chapter) => {
                    const ids = chapter.courses.map((c) => c.id)
                    const checkedCount = ids.filter((id) => selected.has(id)).length
                    return (
                      <li key={chapter.id}>
                        <label className={styles.chapterRow}>
                          <input
                            type="checkbox"
                            checked={checkedCount === ids.length}
                            ref={(el) => {
                              if (el) el.indeterminate = checkedCount > 0 && checkedCount < ids.length
                            }}
                            onChange={(event) => toggle(ids, event.target.checked)}
                          />
                          <span>{chapter.title}</span>
                        </label>
                        <ul>
                          {chapter.courses.map((course) => (
                            <li key={course.id}>
                              <label className={styles.courseRow}>
                                <input
                                  type="checkbox"
                                  checked={selected.has(course.id)}
                                  onChange={(event) => toggle([course.id], event.target.checked)}
                                />
                                <span>{course.name}</span>
                                <code>{course.id}</code>
                              </label>
                            </li>
                          ))}
                        </ul>
                      </li>
                    )
                  })}
              </ul>
            ) : null}
          </>
        )}

        {notice ? (
          <p className={styles.notice} aria-live="polite">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  )
}

function PreviewView({
  preview,
  semesterName,
}: {
  preview: CourseBundlePreview
  semesterName: string
}) {
  const courseCount = preview.chapters.reduce((n, ch) => n + ch.courses.length, 0)
  return (
    <>
      {preview.errors.length > 0 ? (
        <div className={styles.errorBox} role="alert">
          <strong>有 {preview.errors.length} 個問題需要修正：</strong>
          <ul>
            {preview.errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className={styles.hint}>
          將在「{semesterName}」建立 {courseCount} 堂課程（草稿）
          {preview.programCount > 0 ? `、${preview.programCount} 個程式檔` : ''}
          {preview.mediaCount > 0 ? `，並複製 ${preview.mediaCount} 張圖片` : ''}。
        </p>
      )}
      {preview.warnings.length > 0 ? (
        <ul className={styles.warningList}>
          {preview.warnings.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}
      <ul className={styles.tree}>
        {preview.chapters.map((chapter, index) => (
          <li key={index}>
            <div className={styles.chapterRow}>
              <span>{chapter.title}</span>
              <span className={chapter.existing ? 'badge badge-neutral' : 'badge badge-brand'}>
                {chapter.existing ? '加入既有章節' : '新章節'}
              </span>
            </div>
            <ul>
              {chapter.courses.map((course) => (
                <li key={course.id} className={styles.courseRow}>
                  <span>{course.name}</span>
                  <code>{course.id}</code>
                  <span className={styles.meta}>{course.blockCount} 個區塊</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </>
  )
}
