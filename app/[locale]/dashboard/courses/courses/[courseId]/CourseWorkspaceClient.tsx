'use client'

import { Link } from '@/i18n/navigation'
import { startTransition, useEffect, useMemo, useRef, useState } from 'react'
import type { DragDropEventHandlers } from '@dnd-kit/react'
import { Fragment } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChevronLeft,
  faGlobe,
  faLink,
  faLock,
  faPencil,
  faPlus,
  faSave,
  faTrash,
  faUpload,
  faGripLines,
} from '@fortawesome/free-solid-svg-icons'
import { DragDropProvider } from '@dnd-kit/react'
import { isSortableOperation, useSortable } from '@dnd-kit/react/sortable'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { uploadCourseImageToFirebaseStorage } from '@/app/utils/firebaseService'
import { Modal } from '@/app/[locale]/dashboard/components/Modal'
import {
  Course,
  CourseContent,
  CourseContentType,
  CourseWorkspacePayload,
} from '@/app/types/course-admin'
import {
  buildReorderRows,
  COURSE_CONTENT_TYPE_OPTIONS,
  fetchCourseWorkspace,
  requestJson,
} from '../../client-utils'
import styles from './course-workspace.module.scss'

/* --- Helpers --- */
function arrayMove<T>(array: T[], from: number, to: number): T[] {
  const newArray = [...array]
  const [removed] = newArray.splice(from, 1)
  newArray.splice(to, 0, removed)
  return newArray
}

function withRecalculatedOrder(contents: CourseContent[]): CourseContent[] {
  return contents.map((content, index) => ({
    ...content,
    order_index: index + 1,
  }))
}

interface CourseWorkspaceClientProps {
  courseId: string
}

/* --- Sortable Block Component --- */
interface SortableBlockProps {
  content: CourseContent
  index: number
  onEdit: (content: CourseContent) => void
  onDelete: (id: string) => void
}

function SortableBlock({ content, index, onEdit, onDelete }: SortableBlockProps) {
  const { ref, handleRef, isDragging } = useSortable({
    id: content.id,
    index,
  })

  const renderPreview = () => {
    switch (content.type) {
      case 'header1':
        return <h1 className={styles.previewH1}><span>{content.content}</span></h1>
      case 'header2':
        return <h2 className={styles.previewH2}>{content.content}</h2>
      case 'header3':
        return <h3 className={styles.previewH3}>{content.content}</h3>
      case 'text':
        return <p className={styles.previewText}>{content.content}</p>
      case 'markdown':
        return (
          <div className={styles.previewMarkdown}>
            <Markdown remarkPlugins={[remarkGfm]}>{content.content}</Markdown>
          </div>
        )
      case 'image':
        return (
          <div className={styles.previewImageContainer}>
            <img src={content.content} alt="Course Content" />
          </div>
        )
      case 'code':
        return (
          <div className={styles.previewCodeContainer}>
            <pre>{content.content}</pre>
          </div>
        )
      default:
        return <div>{content.content}</div>
    }
  }

  return (
    <div 
      ref={ref} 
      className={`${styles.blockItem} ${isDragging ? styles.isDragging : ''}`}
    >
      <div className={styles.blockControls}>
        <div ref={handleRef} className={styles.dragHandle} title="拖拽排序">
          <FontAwesomeIcon icon={faGripLines} />
        </div>
        <button 
          className={styles.controlBtn} 
          onClick={() => onEdit(content)}
          title="編輯"
        >
          <FontAwesomeIcon icon={faPencil} />
        </button>
        <button 
          className={`${styles.controlBtn} ${styles.danger}`} 
          onClick={() => onDelete(content.id)}
          title="刪除"
        >
          <FontAwesomeIcon icon={faTrash} />
        </button>
      </div>

      {renderPreview()}

      {content.program_id && (
        <div className={styles.programChip}>
          <FontAwesomeIcon icon={faLink} />
          <span>{content.program?.name || '關聯程式檔'}</span>
        </div>
      )}
    </div>
  )
}

/* --- Main Component --- */
export default function CourseWorkspaceClient({
  courseId,
}: CourseWorkspaceClientProps) {
  const [workspace, setWorkspace] = useState<CourseWorkspacePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isSavingContent, setIsSavingContent] = useState(false)

  const [courseName, setCourseName] = useState('')
  const [courseDescription, setCourseDescription] = useState('')
  const [courseRewardExp, setCourseRewardExp] = useState('0')
  const [courseIsPublished, setCourseIsPublished] = useState(false)
  const [courseChapterId, setCourseChapterId] = useState('')

  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'unsynced' | 'error'>('synced')
  const syncRevisionRef = useRef(0)
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reorderTimeoutRef = useRef<number | null>(null)

  const [editingBlockId, setEditingBlockId] = useState<string | 'new' | null>(null)
  const [insertAtIndex, setInsertAtIndex] = useState<number | null>(null)
  const [editType, setEditType] = useState<CourseContentType>('markdown')
  const [editContent, setEditContent] = useState('')
  const [editProgramId, setEditProgramId] = useState('')
  const [isCreatingNewProgram, setIsCreatingNewProgram] = useState(false)
  const [newProgramName, setNewProgramName] = useState('')
  const [newProgramLang, setNewProgramLang] = useState('cpp')
  const [newProgramCode, setNewProgramCode] = useState('')
  const [deleteBlockId, setDeleteBlockId] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const imageFileInputRef = useRef<HTMLInputElement>(null)

  const isSettingsModified = useMemo(() => {
    if (!workspace) return false
    return (
      courseName !== workspace.course.name ||
      courseDescription !== (workspace.course.description || '') ||
      courseRewardExp !== String(workspace.course.reward_exp) ||
      courseIsPublished !== workspace.course.is_published ||
      courseChapterId !== workspace.course.chapter_id
    )
  }, [workspace, courseName, courseDescription, courseRewardExp, courseIsPublished, courseChapterId])

  function patchWorkspace(updater: (current: CourseWorkspacePayload) => CourseWorkspacePayload) {
    setWorkspace((current) => (current ? updater(current) : current))
  }

  function replaceContents(contents: CourseContent[]) {
    patchWorkspace((current) => ({
      ...current,
      course: {
        ...current.course,
        contents: withRecalculatedOrder(contents),
      },
    }))
  }

  function markSyncStatus(status: 'synced' | 'saving' | 'unsynced' | 'error') {
    syncRevisionRef.current += 1
    setSyncStatus(status)
    return syncRevisionRef.current
  }

  function resolveSyncStatus(
    revision: number,
    status: 'synced' | 'saving' | 'unsynced' | 'error',
  ) {
    if (syncRevisionRef.current === revision) {
      setSyncStatus(status)
    }
  }

  function resetEditorFields() {
    setEditType('markdown')
    setEditContent('')
    setEditProgramId('')
    setIsCreatingNewProgram(false)
    setNewProgramName('')
    setNewProgramLang('cpp')
    setNewProgramCode('')
  }

  async function loadWorkspace() {
    setLoading(true)
    setError('')
    try {
      const payload = await fetchCourseWorkspace(courseId)
      setWorkspace(payload)
      setCourseName(payload.course.name)
      setCourseDescription(payload.course.description || '')
      setCourseRewardExp(String(payload.course.reward_exp))
      setCourseIsPublished(payload.course.is_published)
      setCourseChapterId(payload.course.chapter_id)
      markSyncStatus('synced')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '載入工作台失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadWorkspace() }, [courseId])

  useEffect(() => {
    return () => {
      if (reorderTimeoutRef.current !== null) {
        window.clearTimeout(reorderTimeoutRef.current)
      }
    }
  }, [])

  // 核心同步邏輯：確保發送到 API 的內容與傳入的一致
  async function syncOrder(contents: CourseContent[]) {
    const revision = markSyncStatus('saving')
    const orderedContents = withRecalculatedOrder(contents)

    try {
      const reorderData = buildReorderRows(orderedContents.map((content) => content.id))
      await requestJson('/api/dashboard/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'course_contents',
          rows: reorderData,
        }),
      })

      replaceContents(orderedContents)
      resolveSyncStatus(revision, 'synced')
    } catch (moveError) {
      resolveSyncStatus(revision, 'error')
      setError('同步排序失敗，請檢查網路連線或重新整理頁面')
      throw moveError
    }
  }

  async function saveCourseSettings() {
    if (!courseName.trim()) { setError('請先輸入課程名稱'); return; }
    const revision = markSyncStatus('saving')
    try {
      const { course } = await requestJson<{ course: Course }>('/api/dashboard/curriculum', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'course',
          id: courseId,
          chapter_id: courseChapterId,
          name: courseName.trim(),
          description: courseDescription.trim(),
          reward_exp: Number(courseRewardExp || 0),
          is_published: courseIsPublished,
        }),
      })
      patchWorkspace((current) => ({
        ...current,
        course: {
          ...current.course,
          ...course,
          contents: current.course.contents,
        },
      }))
      resolveSyncStatus(revision, 'synced')
    } catch (saveError) {
      resolveSyncStatus(revision, 'error')
    }
  }

  // 自動儲存課程設定 (Debounced)
  useEffect(() => {
    if (!workspace || loading) return
    if (!isSettingsModified) return

    markSyncStatus('unsynced')
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)

    syncTimeoutRef.current = setTimeout(() => {
      void saveCourseSettings()
    }, 1500)

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
    }
  }, [courseName, courseDescription, courseRewardExp, courseIsPublished, courseChapterId])

  function openCreateBlock(index?: number) {
    resetEditorFields()
    setInsertAtIndex(typeof index === 'number' ? index : null)
    setEditingBlockId('new')
  }

  function openEditBlock(content: CourseContent) {
    setEditType(content.type)
    setEditContent(content.content)
    setEditProgramId(content.program_id || '')
    setEditingBlockId(content.id)
  }

  function closeEditor() {
    setEditingBlockId(null)
    setInsertAtIndex(null)
    resetEditorFields()
  }

  async function handleImageFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    markSyncStatus('saving')
    try {
      const url = await uploadCourseImageToFirebaseStorage(file, courseId)
      setEditContent(url)
      markSyncStatus('unsynced')
    } catch (uploadError) {
      setError('圖片上傳失敗')
      markSyncStatus('error')
    }
  }

  async function saveContentBlock() {
    if (!editContent.trim()) { setError('請輸入內容'); return; }
    setIsSavingContent(true)
    const revision = markSyncStatus('saving')
    try {
      let finalProgramId = editProgramId.trim() || null
      if (isCreatingNewProgram) {
        const res = await fetch('/api/dashboard/programs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newProgramName.trim(), language: newProgramLang, code_content: newProgramCode.trim() }),
        })
        const newP = await res.json()
        if (!res.ok) throw new Error(newP.error || '建立程式檔案失敗')
        finalProgramId = newP.id
        patchWorkspace(curr => ({ ...curr, programs: [newP, ...curr.programs] }))
      }

      const isNew = editingBlockId === 'new'
      const baseContents = workspace?.course.contents || []
      const { content } = await requestJson<{ content: CourseContent }>('/api/dashboard/curriculum', {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'content',
          id: isNew ? undefined : editingBlockId,
          course_id: isNew ? courseId : undefined,
          content_type: editType,
          content: editContent.trim(),
          program_id: finalProgramId,
        }),
      })

      let nextContents = [...baseContents]
      if (isNew) {
        if (insertAtIndex !== null) {
          nextContents.splice(insertAtIndex, 0, content)
        } else {
          nextContents.push(content)
        }
      } else {
        nextContents = nextContents.map((current) =>
          current.id === content.id ? { ...current, ...content } : current,
        )
      }

      replaceContents(nextContents)

      if (isNew) {
        await syncOrder(nextContents)
      } else {
        resolveSyncStatus(revision, 'synced')
      }

      closeEditor()
    } catch (saveError) {
      resolveSyncStatus(revision, 'error')
      setError('儲存內容失敗')
    } finally {
      setIsSavingContent(false)
    }
  }

  async function confirmDeleteContent() {
    if (!deleteBlockId) return
    const revision = markSyncStatus('saving')
    try {
      await requestJson('/api/dashboard/curriculum', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'content', id: deleteBlockId }),
      })

      const nextContents = workspace?.course.contents.filter((content) => content.id !== deleteBlockId) || []
      replaceContents(nextContents)
      await syncOrder(nextContents)

      resolveSyncStatus(revision, 'synced')
      setDeleteBlockId(null)
    } catch (deleteError) {
      resolveSyncStatus(revision, 'error')
      setError('刪除失敗')
    }
  }

  const handleDragEnd: DragDropEventHandlers['onDragEnd'] = (event) => {
    if (event.canceled || !workspace) {
      return
    }

    const { operation } = event
    if (!isSortableOperation(operation)) {
      return
    }

    if (!operation.source) {
      return
    }

    const oldIndex = operation.source.initialIndex
    const newIndex = operation.target?.index

    if (
      typeof newIndex !== 'number' ||
      oldIndex < 0 ||
      newIndex < 0 ||
      oldIndex === newIndex
    ) {
      return
    }

    const previousContents = workspace.course.contents
    const newContents = arrayMove(previousContents, oldIndex, newIndex)

    if (reorderTimeoutRef.current !== null) {
      window.clearTimeout(reorderTimeoutRef.current)
    }

    reorderTimeoutRef.current = window.setTimeout(() => {
      reorderTimeoutRef.current = null

      startTransition(() => {
        replaceContents(newContents)
      })

      void syncOrder(newContents).catch(() => {
        startTransition(() => {
          replaceContents(previousContents)
        })
      })
    }, 0)
  }

  const SyncIndicator = () => {
    const configs = {
      synced: { class: styles.synced, text: '已同步至雲端' },
      saving: { class: styles.saving, text: '同步中...' },
      unsynced: { class: styles.unsynced, text: '偵測到變更' },
      error: { class: styles.error, text: '同步失敗' }
    }
    const current = configs[syncStatus]

    return (
      <div className={styles.syncIndicator}>
        <div className={`${styles.syncDot} ${current.class}`} />
        <span>{current.text}</span>
      </div>
    )
  }

  const InsertPoint = ({ index }: { index: number }) => (
    <div className={styles.insertPoint}>
      <button 
        className={styles.insertBtn} 
        onClick={() => openCreateBlock(index)}
        title="在此插入內容"
      >
        <FontAwesomeIcon icon={faPlus} />
      </button>
    </div>
  )

  return (
    <div className={styles.workspace}>
      <header className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <Link href="/dashboard/courses" className={styles.backButton}>
            <FontAwesomeIcon icon={faChevronLeft} />
            <span>返回課程總覽</span>
          </Link>
        </div>
      </header>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>初始化工作台…</p>
        </div>
      ) : workspace ? (
        <div className={styles.editorMain}>
          <section className={styles.heroPanel}>
            <div className={styles.heroMain}>
              <p className={styles.eyebrow}>Focus Editing</p>
              <h1>{courseName || '未命名課程'}</h1>
              <p className={styles.heroDescription}>
                {workspace.chapters.find(ch => ch.id === courseChapterId)?.title || '未指定章節'}
              </p>
              <div className={styles.heroMeta}>
                <span className={styles.metaChip}>ID: {workspace.course.id}</span>
                <span className={courseIsPublished ? styles.statusPublished : styles.statusDraft}>
                  <FontAwesomeIcon icon={courseIsPublished ? faGlobe : faLock} />
                  <span>{courseIsPublished ? '已發布' : '草稿'}</span>
                </span>
              </div>
            </div>
            <div className={styles.heroActions}>
              <button 
                type="button" 
                className={styles.publishToggle} 
                onClick={() => setCourseIsPublished(!courseIsPublished)}
                aria-pressed={courseIsPublished}
              >
                <FontAwesomeIcon icon={courseIsPublished ? faGlobe : faLock} />
                <span>{courseIsPublished ? '切換為草稿' : '切換為發布'}</span>
              </button>
            </div>
          </section>

          <div className={styles.workspaceGrid}>
            <aside className={styles.settingsPanel}>
              <p className={styles.panelEyebrow}>Course Settings</p>
              <h2>課程設定</h2>
              <SyncIndicator />
              <div className={styles.fieldGroup}>
                <label>課程名稱</label>
                <input className={styles.textInput} value={courseName} onChange={(e) => setCourseName(e.target.value)} />
              </div>
              <div className={styles.fieldGroup}>
                <label>課程簡介</label>
                <textarea className={styles.textareaInput} value={courseDescription} onChange={(e) => setCourseDescription(e.target.value)} />
              </div>
              <div className={styles.fieldGrid}>
                <div className={styles.fieldGroup}>
                  <label>所屬章節</label>
                  <select className={styles.selectInput} value={courseChapterId} onChange={(e) => setCourseChapterId(e.target.value)}>
                    {workspace.semesters.map(s => (
                      <optgroup key={s.id} label={s.name}>
                        {workspace.chapters.filter(ch => ch.semester_id === s.id).map(ch => (
                          <option key={ch.id} value={ch.id}>{ch.title}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className={styles.fieldGroup}>
                  <label>獎勵 EXP</label>
                  <div className={styles.expInputWrapper}>
                    <input className={styles.textInput} type="number" value={courseRewardExp} onChange={(e) => setCourseRewardExp(e.target.value)} />
                    <span>EXP</span>
                  </div>
                </div>
              </div>
            </aside>

            <main className={styles.contentPanel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.panelEyebrow}>Content Flow</p>
                  <h2>內容編排</h2>
                </div>
                <button type="button" className={styles.subtleButton} onClick={() => openCreateBlock()}>
                  <FontAwesomeIcon icon={faPlus} />
                  <span>新增內容區塊</span>
                </button>
              </div>

              <DragDropProvider onDragEnd={handleDragEnd}>
                <div className={styles.blocksList}>
                  {workspace.course.contents.map((content, index) => (
                    <Fragment key={content.id}>
                      <InsertPoint index={index} />
                      <SortableBlock 
                        content={content} 
                        index={index} 
                        onEdit={openEditBlock}
                        onDelete={setDeleteBlockId}
                      />
                    </Fragment>
                  ))}
                  <div className={`${styles.insertPoint} ${styles.lastInsertPoint}`}>
                    <button className={styles.insertBtn} onClick={() => openCreateBlock()}>
                      <FontAwesomeIcon icon={faPlus} />
                    </button>
                  </div>
                </div>
              </DragDropProvider>
            </main>
          </div>
        </div>
      ) : null}

      <Modal
        isOpen={editingBlockId !== null}
        onClose={closeEditor}
        title={editingBlockId === 'new' ? '新增內容區塊' : '編輯內容區塊'}
        maxWidth="1000px"
        footer={
          <>
            <button className={styles.subtleButton} onClick={closeEditor}>取消</button>
            <button className={styles.primaryButton} onClick={() => void saveContentBlock()} disabled={isSavingContent}>
              <FontAwesomeIcon icon={faSave} />
              <span>{isSavingContent ? '儲存中…' : '儲存變更'}</span>
            </button>
          </>
        }
      >
        <div className={styles.modalFieldGrid}>
          <div className={styles.editorColumn}>
            <div className={styles.fieldGroup}>
              <label>區塊類型</label>
              <select className={styles.selectInput} value={editType} onChange={(e) => setEditType(e.target.value as CourseContentType)}>
                {COURSE_CONTENT_TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div className={styles.fieldGroup}>
              <label>內容 (內文)</label>
              {editType === 'image' ? (
                <div className={styles.imageInputGroup}>
                  <input className={styles.textInput} value={editContent} onChange={(e) => setEditContent(e.target.value)} placeholder="圖片連結..." />
                  <input type="file" ref={imageFileInputRef} className={styles.hiddenFileInput} onChange={handleImageFileSelect} />
                  <button className={styles.subtleButton} onClick={() => imageFileInputRef.current?.click()} disabled={isUploadingImage}>
                    <FontAwesomeIcon icon={faUpload} /> {isUploadingImage ? '上傳中...' : '選擇圖片'}
                  </button>
                  {editContent && <img src={editContent} className={styles.imagePreviewThumb} alt="Preview" />}
                </div>
              ) : (
                <textarea className={styles.editorTextarea} value={editContent} onChange={(e) => setEditContent(e.target.value)} placeholder="在此輸入內容..." />
              )}
            </div>
          </div>
          <div className={styles.editorColumn}>
            <div className={styles.fieldGroup}>
              <label>
                關聯程式檔案
                <button className={styles.inlineActionLink} onClick={() => setIsCreatingNewProgram(!isCreatingNewProgram)}>
                  {isCreatingNewProgram ? '選擇現有' : '建立新的'}
                </button>
              </label>
              {!isCreatingNewProgram ? (
                <select className={styles.selectInput} value={editProgramId} onChange={(e) => setEditProgramId(e.target.value)}>
                  <option value="">-- 不連結 --</option>
                  {workspace?.programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              ) : (
                <div className={styles.newProgramForm}>
                  <input className={styles.textInput} placeholder="檔名" value={newProgramName} onChange={(e) => setNewProgramName(e.target.value)} />
                  <textarea className={styles.programCodeInput} placeholder="程式碼..." value={newProgramCode} onChange={(e) => setNewProgramCode(e.target.value)} />
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={deleteBlockId !== null}
        onClose={() => setDeleteBlockId(null)}
        title="確認刪除內容區塊"
        maxWidth="400px"
        footer={
          <>
            <button className={styles.subtleButton} onClick={() => setDeleteBlockId(null)}>取消</button>
            <button className={styles.dangerButton} onClick={() => void confirmDeleteContent()}>確認刪除</button>
          </>
        }
      >
        <p>刪除後無法復原，確定要繼續嗎？</p>
      </Modal>
    </div>
  )
}
