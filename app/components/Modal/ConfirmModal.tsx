'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Modal from './Modal'
import styles from './ConfirmModal.module.scss'

interface ConfirmModalProps {
  open: boolean
  /** 標題（已翻譯） */
  title: string
  /** 中性說明段落（非危險，用於操作引導） */
  description?: string
  /** 引導步驟（有序清單） */
  steps?: string[]
  /** 紅色警示句 */
  warning?: string
  /** 後果條列 */
  consequences?: string[]
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onClose: () => void
  /** 處理中：鎖定互動 */
  loading?: boolean
  /** 危險樣式（紅色確認鈕與輸入框） */
  variant?: 'default' | 'danger'
  /** 需輸入此字串才能啟用確認鈕 */
  confirmationPhrase?: string
  confirmationHint?: ReactNode
  confirmationPlaceholder?: string
}

/**
 * [Component] 通用確認彈窗
 * 以共用 Modal 為基底，內容為警示 / 後果 / 輸入確認，footer 為取消 + 確認鈕。
 */
export default function ConfirmModal({
  open,
  title,
  description,
  steps,
  warning,
  consequences,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onClose,
  loading = false,
  variant = 'default',
  confirmationPhrase,
  confirmationHint,
  confirmationPlaceholder,
}: ConfirmModalProps) {
  const [confirmInput, setConfirmInput] = useState('')

  // 關閉時清空輸入
  useEffect(() => {
    if (!open) setConfirmInput('')
  }, [open])

  const isDanger = variant === 'danger'
  const confirmDisabled =
    loading ||
    (confirmationPhrase !== undefined &&
      confirmInput.trim() !== confirmationPhrase)

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={title}
      maxWidth="420px"
      compact
      dismissible={!loading}
      showCloseButton={false}
      footer={
        <>
          <button type="button" className="secondary-button" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={isDanger ? 'danger-button' : 'primary-button'}
            onClick={onConfirm}
            disabled={confirmDisabled}
            aria-busy={loading}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      {description && <p className={styles.desc}>{description}</p>}
      {warning && <p className={styles.warning}>{warning}</p>}
      {steps && steps.length > 0 && (
        <ol className={styles.list}>
          {steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      )}
      {consequences && consequences.length > 0 && (
        <ul className={styles.list}>
          {consequences.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      )}

      {confirmationPhrase !== undefined && (
        <>
          {confirmationHint && (
            <label className={styles.confirmLabel}>
              {confirmationHint}
            </label>
          )}
          <input
            type="text"
            className={`${styles.input} ${isDanger ? styles.danger : ''}`}
            placeholder={confirmationPlaceholder}
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            autoFocus
            disabled={loading}
          />
        </>
      )}
    </Modal>
  )
}
