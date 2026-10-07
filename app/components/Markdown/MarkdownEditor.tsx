'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import styles from './MarkdownEditor.module.scss'
import type { ContentImageUploader } from '@/app/types/media'
// component
import MarkdownRenderer from './MarkdownRenderer'
// icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faEye,
  faEyeSlash,
  faExpand,
  faCompress,
  faImage,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons'

export interface MarkdownEditorProps {
  initialContent?: string
  onChange?: (content: string) => void
  className?: string
  readOnly?: boolean
  hideToolbar?: boolean
  placeholder?: string
  /** 提供時啟用插圖（工具列按鈕、拖曳、貼上）；失敗時須拋出錯誤，編輯器會移除佔位 */
  onUploadImage?: ContentImageUploader
}

/**
 * [Component] Markdown 編輯器
 *
 * @param initialContent 初始內容
 * @param onChange 內容變更回調
 * @param className 自定義 CSS 類名
 * @param readOnly 是否為只讀模式
 * @param hideToolbar 是否隱藏工具列
 * @param placeholder 輸入框佔位符
 * @param onUploadImage 圖片上傳函式（提供時才啟用插圖）
 * @returns Markdown 編輯器
 */
const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  initialContent = '',
  onChange,
  className = '',
  readOnly = false,
  hideToolbar = false,
  placeholder = '在此輸入 Markdown 內容...',
  onUploadImage,
}) => {
  //* 核心狀態 - 只保留必要的狀態
  const [content, setContent] = useState<string>(initialContent)
  const [showPreview, setShowPreview] = useState<boolean>(true)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [isWideScreen, setIsWideScreen] = useState<boolean>(false)

  // textarea ref
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // 插圖用：上傳完成時以最新內容替換佔位文字
  const contentRef = useRef(content)
  contentRef.current = content
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [uploadingCount, setUploadingCount] = useState(0)

  //* 僅在 initialContent 確實變化且與當前內容不同時才更新
  useEffect(() => {
    if (initialContent !== content) {
      setContent(initialContent)
    }
  }, [initialContent])

  //* 內容變更處理 - 使用 useCallback 穩定引用
  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent)
      onChange?.(newContent)
    },
    [onChange]
  )

  //* 響應式設計檢測
  useEffect(() => {
    const checkScreenWidth = () => {
      setIsWideScreen(window.innerWidth >= 1024)
    }

    checkScreenWidth()
    window.addEventListener('resize', checkScreenWidth)

    return () => {
      window.removeEventListener('resize', checkScreenWidth)
    }
  }, [])

  //* 事件處理函數
  /**
   * 處理 Tab 鍵縮進
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        const textarea = e.target as HTMLTextAreaElement
        const start = textarea.selectionStart
        const end = textarea.selectionEnd

        const newContent =
          content.substring(0, start) + '  ' + content.substring(end)
        handleContentChange(newContent)

        // 恢復游標位置
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2
        }, 0)
      }
    },
    [content, handleContentChange]
  )

  /**
   * 插入圖片：先在游標處放佔位文字，上傳完成後換成真正網址（失敗則移除佔位）
   * 佔位的好處是上傳期間繼續編輯，圖片也會落在原本的位置
   * 每張圖獨立一段，相鄰多張會由 remarkImageGallery 組成輪播
   */
  const insertImages = useCallback(
    (files: File[]) => {
      if (!onUploadImage) return
      const images = files.filter((f) => f.type.startsWith('image/'))
      if (images.length === 0) return

      const jobs = images.map((file) => ({
        file,
        token: `![上傳中…](uploading:${crypto.randomUUID()})`,
        alt: file.name.replace(/\.[^.]+$/, '').replace(/[[\]]/g, ''),
      }))
      const textarea = textareaRef.current
      const current = contentRef.current
      const pos = textarea ? textarea.selectionEnd : current.length
      const before = current.slice(0, pos)
      const insert =
        (before && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : '') +
        jobs.map((j) => j.token).join('\n\n') +
        '\n\n'
      handleContentChange(before + insert + current.slice(pos))

      setUploadingCount((n) => n + jobs.length)
      jobs.forEach(({ file, token, alt }) => {
        onUploadImage(file)
          // Markdown 圖片語法沒有尺寸欄位，只用網址；TipTap 可把 width / height 寫進圖片節點
          .then(({ url }) => handleContentChange(contentRef.current.replace(token, `![${alt}](${url})`)))
          .catch(() => handleContentChange(contentRef.current.replace(`${token}\n\n`, '').replace(token, '')))
          .finally(() => setUploadingCount((n) => n - 1))
      })
    },
    [onUploadImage, handleContentChange]
  )

  /**
   * 切換預覽模式
   */
  const togglePreview = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setShowPreview(!showPreview)
    },
    [showPreview]
  )

  /**
   * 切換全螢幕模式
   */
  const toggleFullscreen = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsFullscreen(!isFullscreen)
    },
    [isFullscreen]
  )

  /**
   * 聚焦到編輯器
   */
  // const focusEditor = useCallback(() => {
  //   textareaRef.current?.focus()
  // }, [])

  //* 計算佈局類別
  const getLayoutClasses = () => {
    const baseClasses = [styles.container]

    if (isFullscreen) baseClasses.push(styles.fullscreen)
    if (className) baseClasses.push(className)

    return baseClasses.join(' ')
  }

  const getContentAreaClasses = () => {
    const baseClasses = [styles.contentArea]

    if (showPreview && isWideScreen) {
      baseClasses.push(styles.sideBySide)
    } else {
      baseClasses.push(styles.stacked)
    }

    if (isFullscreen) {
      baseClasses.push(styles.fullscreenHeight)
    } else {
      baseClasses.push(styles.normalHeight)
    }

    return baseClasses.join(' ')
  }

  return (
    <div className={getLayoutClasses()}>
      {/* 工具列 */}
      {!hideToolbar && (
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <button
              onClick={togglePreview}
              className={styles.previewButton}
              type="button"
            >
              <FontAwesomeIcon icon={showPreview ? faEyeSlash : faEye} />
              <span>{showPreview ? '隱藏預覽' : '顯示預覽'}</span>
            </button>
          </div>

          <div className={styles.toolbarRight}>
            {onUploadImage && !readOnly && (
              <>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    imageInputRef.current?.click()
                  }}
                  className={styles.previewButton}
                  type="button"
                  title="也可以直接拖曳或貼上圖片"
                >
                  <FontAwesomeIcon icon={uploadingCount > 0 ? faSpinner : faImage} spin={uploadingCount > 0} />
                  <span>{uploadingCount > 0 ? `上傳中（${uploadingCount}）` : '插入圖片'}</span>
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => {
                    insertImages(Array.from(e.target.files ?? []))
                    e.target.value = ''
                  }}
                />
              </>
            )}
            <button
              onClick={toggleFullscreen}
              className={styles.iconButton}
              type="button"
            >
              <FontAwesomeIcon icon={isFullscreen ? faCompress : faExpand} />
            </button>
          </div>
        </div>
      )}

      {/* 內容區域 */}
      <div className={getContentAreaClasses()}>
        {/* 編輯器區域 */}
        <div className={styles.editorSection}>
          <div className={styles.editorWrapper}>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={(e) => {
                const files = Array.from(e.clipboardData.files)
                if (onUploadImage && files.some((f) => f.type.startsWith('image/'))) {
                  e.preventDefault()
                  insertImages(files)
                }
              }}
              onDragOver={(e) => onUploadImage && e.preventDefault()}
              onDrop={(e) => {
                const files = Array.from(e.dataTransfer.files)
                if (onUploadImage && files.length > 0) {
                  e.preventDefault()
                  insertImages(files)
                }
              }}
              placeholder={placeholder}
              className={styles.textarea}
              readOnly={readOnly}
              disabled={readOnly}
            />
          </div>
        </div>

        {/* 預覽區域 */}
        {showPreview && (
          <div className={styles.previewSection}>
            <div className={styles.previewWrapper}>
              <MarkdownRenderer content={content} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MarkdownEditor
