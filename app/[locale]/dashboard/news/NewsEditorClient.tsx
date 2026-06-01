'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import { useRouter } from '@/i18n/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faUpload,
  faTrash,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons'
import MarkdownEditor from '@/app/components/Markdown/MarkdownEditor'
import { useToast } from '@/app/contexts/ToastContext'
import { uploadPostImage } from '@/app/utils/postService'
import {
  POST_CATEGORIES,
  POST_CATEGORY_LABELS,
  PostCategory,
} from '@/app/types/post'
import { SerializedPost } from '@/app/types/serialized'
import styles from './editor.module.scss'

interface NewsEditorClientProps {
  postId?: string
}

export default function NewsEditorClient({ postId }: NewsEditorClientProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const isEditing = Boolean(postId)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<PostCategory>('社團活動')
  const [content, setContent] = useState('')
  const [slug, setSlug] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [removeCoverImage, setRemoveCoverImage] = useState(false)

  // UI state
  const [initialLoading, setInitialLoading] = useState(isEditing)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  // Load existing post when editing
  useEffect(() => {
    if (!isEditing || !postId) return

    async function loadPost() {
      try {
        const res = await fetch(`/api/dashboard/news/${postId}`)
        if (!res.ok) throw new Error('載入失敗')
        const post: SerializedPost = await res.json()
        setTitle(post.title)
        setCategory(post.category as PostCategory)
        setContent(post.contentMarkdown)
        setCoverImageUrl(post.coverImageUrl)
        setCoverPreview(post.coverImageUrl)
      } catch {
        showToast('載入文章失敗', 'error')
      } finally {
        setInitialLoading(false)
      }
    }

    void loadPost()
  }, [isEditing, postId, showToast])

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent)
  }, [])

  function handleFileSelect(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      showToast('圖片大小不能超過 5MB', 'error')
      return
    }
    setCoverImageFile(file)
    setCoverPreview(URL.createObjectURL(file))
    setRemoveCoverImage(false)
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) handleFileSelect(file)
  }

  function handleRemoveCover() {
    setCoverImageFile(null)
    setCoverPreview(null)
    setRemoveCoverImage(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit() {
    if (!title.trim()) {
      showToast('請輸入文章標題', 'error')
      return
    }
    if (!content.trim()) {
      showToast('請輸入文章內容', 'error')
      return
    }

    setIsSubmitting(true)
    try {
      let finalCoverImageUrl: string | null = coverImageUrl

      // Upload new cover image if selected
      if (coverImageFile) {
        const tempId = postId ?? `temp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
        finalCoverImageUrl = await uploadPostImage(tempId, coverImageFile)
      } else if (removeCoverImage) {
        finalCoverImageUrl = null
      }

      const payload = {
        title: title.trim(),
        contentMarkdown: content.trim(),
        category,
        coverImageUrl: finalCoverImageUrl,
        ...(!isEditing && slug.trim() ? { slug: slug.trim() } : {}),
        ...(isEditing && removeCoverImage ? { removeCoverImage: true } : {}),
      }

      const url = isEditing ? `/api/dashboard/news/${postId}` : '/api/dashboard/news'
      const method = isEditing ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '操作失敗')
      }

      showToast(isEditing ? '文章已更新' : '文章已發布', 'success')
      router.push('/dashboard/news')
    } catch (err) {
      showToast(err instanceof Error ? err.message : '操作失敗，請稍後再試', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (initialLoading) {
    return (
      <div className={styles.editorPage}>
        <div className={styles.editorHeader}>
          <div className={styles.headerLeft}>
            <span>載入中...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.editorPage}>
      {/* Header */}
      <header className={styles.editorHeader}>
        <div className={styles.headerLeft}>
          <Link href="/dashboard/news" className={styles.backButton}>
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>文章列表</span>
          </Link>
          <h1>{isEditing ? '編輯文章' : '新建文章'}</h1>
        </div>
        <div className={styles.headerActions}>
          <Link href="/dashboard/news" className="secondary-button">
            取消
          </Link>
          <button
            className="primary-button"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin />
                <span>儲存中...</span>
              </>
            ) : (
              <span>{isEditing ? '儲存變更' : '發布文章'}</span>
            )}
          </button>
        </div>
      </header>

      {/* Body: Left sidebar + Right editor */}
      <div className={styles.editorBody}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          {/* Title */}
          <div className={styles.fieldGroup}>
            <label htmlFor="post-title">文章標題</label>
            <input
              id="post-title"
              type="text"
              className={styles.textInput}
              placeholder="輸入文章標題..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Category */}
          <div className={styles.fieldGroup}>
            <label htmlFor="post-category">分類</label>
            <select
              id="post-category"
              className={styles.selectInput}
              value={category}
              onChange={(e) => setCategory(e.target.value as PostCategory)}
            >
              {POST_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {POST_CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Slug (new posts only) */}
          {!isEditing && (
            <div className={styles.fieldGroup}>
              <label htmlFor="post-slug">自訂網址 slug（選填）</label>
              <input
                id="post-slug"
                type="text"
                className={styles.textInput}
                placeholder="留空將自動生成 10 碼短網址"
                value={slug}
                onChange={(e) => setSlug(e.target.value.replace(/\s/g, '-'))}
              />
            </div>
          )}

          {/* Cover Image */}
          <div className={styles.fieldGroup}>
            <label>封面圖片</label>
            {coverPreview ? (
              <div className={styles.coverPreview}>
                <Image
                  src={coverPreview}
                  alt="封面預覽"
                  fill
                  style={{ objectFit: 'cover' }}
                />
                <div className={styles.coverOverlay}>
                  <button
                    type="button"
                    className="icon-button"
                    title="更換圖片"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FontAwesomeIcon icon={faUpload} />
                  </button>
                  <button
                    type="button"
                    className="icon-button-danger"
                    title="移除圖片"
                    onClick={handleRemoveCover}
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileInputChange}
                />
              </div>
            ) : (
              <div
                className={`${styles.coverUploadArea} ${dragOver ? styles.dragOver : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <FontAwesomeIcon icon={faUpload} style={{ marginBottom: 8, fontSize: '1.5rem', color: 'var(--foreground-secondary)' }} />
                <p>點擊或拖拽圖片到此處上傳</p>
                <p style={{ marginTop: 4, fontSize: '0.78rem' }}>最大 5MB，支援 JPG / PNG / WebP</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileInputChange}
                />
              </div>
            )}
          </div>
        </aside>

        {/* Markdown Editor */}
        <div className={styles.editorPanel}>
          <MarkdownEditor
            initialContent={content}
            onChange={handleContentChange}
            placeholder="在此輸入文章內容（支援 Markdown 語法）..."
          />
        </div>
      </div>
    </div>
  )
}
