'use client'

import { useEffect, useId, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import styles from './Modal.module.scss'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  /** 標題（已翻譯） */
  title: string
  children: ReactNode
  /** 底部操作列 slot（按鈕等） */
  footer?: ReactNode
  maxWidth?: string
  /**
   * 是否可關閉（點擊遮罩 / Esc / 關閉鈕）。
   * 處理中需鎖定互動時可傳 false。
   */
  dismissible?: boolean
  /** 是否顯示右上角關閉鈕 */
  showCloseButton?: boolean
  /**
   * compact 模式：手機上維持置中卡片與邊距，不做滿版。
   * 適合小型確認對話框；大型表單可維持預設（手機滿版）。
   */
  compact?: boolean
}

/**
 * [Component] 共用 Modal
 * 透過 createPortal 渲染至 document.body；玻璃模糊背板、置中、可選 footer。
 * 參考 dashboard 版 Modal 設計，抽為全站共用元件。
 */
export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = '600px',
  dismissible = true,
  showCloseButton = true,
  compact = false,
}: ModalProps) => {
  const titleId = useId()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, dismissible, onClose])

  if (!isOpen || !mounted) return null

  const handleOverlayClick = () => {
    if (dismissible) onClose()
  }

  return createPortal(
    <div
      className={`${styles.overlay} ${styles.visible} ${
        compact ? styles.compact : ''
      }`}
      onClick={(e) => e.target === e.currentTarget && handleOverlayClick()}
      tabIndex={-1}
      role="presentation"
    >
      <div
        className={`${styles.modal} ${styles.visible} ${
          compact ? styles.compact : ''
        }`}
        style={{ maxWidth }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={styles.header}>
          <h2 id={titleId}>{title}</h2>
          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              className={styles.closeButton}
              aria-label="關閉"
              disabled={!dismissible}
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          )}
        </div>

        <div className={styles.content}>
          <div className={styles.formContent}>{children}</div>
        </div>

        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export default Modal
