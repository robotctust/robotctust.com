'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { JSONContent } from '@tiptap/core'
import { Link, useRouter } from '@/i18n/navigation'
import Img from '@/app/components/Img/Img'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faArrowUpRightFromSquare,
  faSpinner,
  faTrash,
  faUpload,
} from '@fortawesome/free-solid-svg-icons'
import RichTextEditor from '@/app/components/RichText/RichTextEditor'
import { hasPendingUploads } from '@/app/components/RichText/imageUpload'
import { useToast } from '@/app/contexts/ToastContext'
import { useConfirm } from '@/app/components/Modal'
import { uploadImage } from '@/app/utils/media/client'
import type { ContentImageUploader } from '@/app/types/media'
import { CATEGORY_TO_SLUG, POST_CATEGORIES, PostCategory, PostStatus } from '@/app/types/post'
import { SerializedPost } from '@/app/types/serialized'
import styles from './editor.module.scss'

type SaveAction = 'save' | 'publish' | 'unpublish'

interface NewsEditorClientProps {
  post: SerializedPost
  /** 文章的 TipTap JSON 內文（serializePost 不含內文，另外傳） */
  content: JSONContent | null
}

/** 判斷有無未儲存變更用的快照 */
const snapshotOf = (fields: {
  title: string
  category: PostCategory
  coverImageUrl: string | null
  slug: string
  content: JSONContent | null
}) => JSON.stringify(fields)

/**
 * 文章編輯頁（手動存檔）
 * - 草稿：儲存草稿 / 發布；已發布：更新 / 取消發布。沒有變更時不能存。⌘S / Ctrl+S 儲存
 * - 存檔前等內文圖片上傳完成；送出載入時的 updated_at，別人改過會被伺服器擋下（409）
 * - 網址只有從沒發布過的文章能改
 */
export default function NewsEditorClient({ post, content: initialContent }: NewsEditorClientProps) {
  const t = useTranslations('Dashboard.News.editor')
  const tCategories = useTranslations('News.categories')
  const locale = useLocale()
  const router = useRouter()
  const { showToast } = useToast()
  const { confirm, dialog } = useConfirm()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 文章欄位
  const [title, setTitle] = useState(post.title)
  const [category, setCategory] = useState<PostCategory>(post.category)
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(post.coverImageUrl)
  const [slug, setSlug] = useState(post.id)
  const [content, setContent] = useState<JSONContent | null>(initialContent)
  const contentRef = useRef(initialContent)

  // 伺服器上的狀態（每次存檔後更新）
  const [postId, setPostId] = useState(post.id)
  const [status, setStatus] = useState<PostStatus>(post.status)
  const [publishedAt, setPublishedAt] = useState(post.publishedAt)
  const [updatedAt, setUpdatedAt] = useState(post.updatedAt)
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    snapshotOf({ title: post.title, category: post.category, coverImageUrl: post.coverImageUrl, slug: post.id, content: initialContent }),
  )

  // UI 狀態
  const [saving, setSaving] = useState<SaveAction | null>(null)
  const [waitingUploads, setWaitingUploads] = useState(false)
  const [coverUploading, setCoverUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const dirty = snapshotOf({ title, category, coverImageUrl, slug, content }) !== savedSnapshot
  const isPublished = status === 'published'

  // ─── 內文與上傳 ─────────────────────────────────────────

  // 存檔時若還有圖片在上傳，等它們完成（成功換成網址、失敗被移除都算完成）
  const uploadWaiters = useRef<(() => void)[]>([])
  const handleContentChange = useCallback((next: JSONContent) => {
    contentRef.current = next
    setContent(next)
    if (!hasPendingUploads(next)) uploadWaiters.current.splice(0).forEach((resolve) => resolve())
  }, [])
  const waitForUploads = () =>
    contentRef.current && hasPendingUploads(contentRef.current)
      ? new Promise<void>((resolve) => uploadWaiters.current.push(resolve))
      : Promise.resolve()

  const uploadPostImage = useCallback(
    (file: File) =>
      uploadImage(file, 'post', { mediaKey: post.mediaKey }).catch((err: Error) => {
        showToast(t('toast.uploadFailed', { name: file.name, message: err.message }), 'error')
        throw err
      }),
    [post.mediaKey, showToast, t],
  )
  const handleUploadContentImage = useCallback<ContentImageUploader>(uploadPostImage, [uploadPostImage])

  // 封面選了就上傳（舊封面在存檔後由伺服器清除）
  async function handleCoverFile(file: File) {
    if (!file.type.startsWith('image/')) return
    if (file.size > 20 * 1024 * 1024) {
      showToast(t('toast.coverTooLarge'), 'error')
      return
    }
    setCoverUploading(true)
    try {
      setCoverImageUrl((await uploadPostImage(file)).url)
    } catch {
      // 錯誤已提示
    } finally {
      setCoverUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ─── 存檔 ───────────────────────────────────────────────

  async function save(action: SaveAction) {
    if (saving) return
    if (
      action === 'unpublish' &&
      !(await confirm({
        title: t('confirmUnpublishTitle'),
        description: t('confirmUnpublish'),
        confirmLabel: t('actions.unpublish'),
        variant: 'danger',
      }))
    ) {
      return
    }
    setSaving(action)
    try {
      if (contentRef.current && hasPendingUploads(contentRef.current)) {
        setWaitingUploads(true)
        await waitForUploads()
        setWaitingUploads(false)
      }
      const sent = { title, category, coverImageUrl, slug, content: contentRef.current }
      const res = await fetch(`/api/dashboard/news/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...sent, action, expectedUpdatedAt: updatedAt }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || t('toast.error'))

      const saved = data.post as SerializedPost
      setStatus(saved.status)
      setPublishedAt(saved.publishedAt)
      setUpdatedAt(saved.updatedAt)
      setSavedSnapshot(snapshotOf(sent))
      if (saved.id !== postId) {
        setPostId(saved.id)
        router.replace(`/dashboard/news/${saved.id}`)
      }
      showToast(
        t(
          action === 'publish'
            ? 'toast.published'
            : action === 'unpublish'
              ? 'toast.unpublished'
              : saved.status === 'published'
                ? 'toast.updated'
                : 'toast.saved',
        ),
        'success',
      )
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('toast.error'), 'error')
    } finally {
      setWaitingUploads(false)
      setSaving(null)
    }
  }

  // ⌘S / Ctrl+S：儲存（草稿存草稿、已發布即更新）
  const saveRef = useRef(save)
  saveRef.current = save
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void saveRef.current('save')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // 有未儲存的變更時，關閉分頁 / 重新整理要確認
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  // ─── 畫面 ───────────────────────────────────────────────

  const saveState = saving
    ? t(waitingUploads ? 'saveState.waitingUploads' : 'saveState.saving')
    : dirty
      ? t('saveState.unsaved')
      : t('saveState.saved', {
          // 今天只顯示時間，其他日子加上日期
          time: new Date(updatedAt).toLocaleString(locale, {
            ...(new Date(updatedAt).toDateString() === new Date().toDateString()
              ? {}
              : { year: 'numeric', month: 'numeric', day: 'numeric' }),
            hour: '2-digit',
            minute: '2-digit',
          }),
        })

  const spinner = (action: SaveAction, label: string) =>
    saving === action ? (
      <>
        <FontAwesomeIcon icon={faSpinner} spin />
        <span>{label}</span>
      </>
    ) : (
      <span>{label}</span>
    )

  return (
    <div className={styles.editorPage}>
      <header className={styles.editorHeader}>
        <div className={styles.headerLeft}>
          <Link
            href="/dashboard/news"
            className={styles.backButton}
            onClick={async (e) => {
              if (!dirty) return
              e.preventDefault()
              const leave = await confirm({
                title: t('confirmLeaveTitle'),
                description: t('confirmLeave'),
                confirmLabel: t('confirmLeaveAction'),
                variant: 'danger',
              })
              if (leave) router.push('/dashboard/news')
            }}
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>{t('back')}</span>
          </Link>
          <h1>{t(isPublished ? 'titlePublished' : 'titleDraft')}</h1>
          <span className={`${styles.statusBadge} ${isPublished ? styles.published : ''}`}>
            {t(`status.${status}`)}
          </span>
          <span className={`${styles.saveState} ${dirty ? styles.unsaved : ''}`}>{saveState}</span>
        </div>
        <div className={styles.headerActions}>
          {isPublished ? (
            <>
              <Link href={`/news/${postId}`} target="_blank" className="secondary-button">
                <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
                <span>{t('actions.view')}</span>
              </Link>
              <button className="secondary-button" onClick={() => void save('unpublish')} disabled={!!saving}>
                {spinner('unpublish', t('actions.unpublish'))}
              </button>
              <button className="primary-button" onClick={() => void save('save')} disabled={!!saving || !dirty}>
                {spinner('save', t('actions.update'))}
              </button>
            </>
          ) : (
            <>
              <button className="secondary-button" onClick={() => void save('save')} disabled={!!saving || !dirty}>
                {spinner('save', t('actions.saveDraft'))}
              </button>
              <button className="primary-button" onClick={() => void save('publish')} disabled={!!saving}>
                {spinner('publish', t('actions.publish'))}
              </button>
            </>
          )}
        </div>
      </header>

      <div className={styles.editorBody}>
        {/* 文章設定 */}
        <aside className={styles.sidebar}>
          <div className={styles.fieldGroup}>
            <label htmlFor="post-title">{t('fields.title')}</label>
            <input
              id="post-title"
              type="text"
              className={styles.textInput}
              placeholder={t('fields.titlePlaceholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="post-category">{t('fields.category')}</label>
            <select
              id="post-category"
              className={styles.selectInput}
              value={category}
              onChange={(e) => setCategory(e.target.value as PostCategory)}
            >
              {POST_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {tCategories(CATEGORY_TO_SLUG[cat])}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="post-slug">{t('fields.slug')}</label>
            <div className={styles.slugInput}>
              <span>/news/</span>
              <input
                id="post-slug"
                type="text"
                value={slug}
                disabled={!!publishedAt}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              />
            </div>
            <p className={styles.fieldHint}>{t(publishedAt ? 'fields.slugLocked' : 'fields.slugHint')}</p>
          </div>

          <div className={styles.fieldGroup}>
            <label>{t('fields.cover')}</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleCoverFile(file)
              }}
            />
            {coverImageUrl || coverUploading ? (
              <div className={styles.coverPreview}>
                {coverImageUrl && (
                  <Img src={coverImageUrl} alt={t('fields.coverAlt')} fill style={{ objectFit: 'cover' }} />
                )}
                {coverUploading ? (
                  <div className={`${styles.coverOverlay} ${styles.visible}`}>
                    <FontAwesomeIcon icon={faSpinner} spin />
                  </div>
                ) : (
                  <div className={styles.coverOverlay}>
                    <button
                      type="button"
                      className="icon-button"
                      title={t('fields.coverChange')}
                      aria-label={t('fields.coverChange')}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FontAwesomeIcon icon={faUpload} />
                    </button>
                    <button
                      type="button"
                      className="icon-button-danger"
                      title={t('fields.coverRemove')}
                      aria-label={t('fields.coverRemove')}
                      onClick={() => setCoverImageUrl(null)}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div
                className={`${styles.coverUploadArea} ${dragOver ? styles.dragOver : ''}`}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragOver(false)
                  const file = e.dataTransfer.files[0]
                  if (file) void handleCoverFile(file)
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <FontAwesomeIcon icon={faUpload} className={styles.coverUploadIcon} />
                <p>{t('fields.coverHint')}</p>
                <p className={styles.fieldHint}>{t('fields.coverLimit')}</p>
              </div>
            )}
          </div>
        </aside>

        {/* 內文 */}
        <div className={styles.editorPanel}>
          <RichTextEditor
            content={initialContent}
            onChange={handleContentChange}
            onUploadImage={handleUploadContentImage}
            placeholder={t('contentPlaceholder')}
          />
        </div>
      </div>
      {dialog}
    </div>
  )
}
