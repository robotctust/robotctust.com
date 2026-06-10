'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Modal } from '@/app/components/Modal'
import Button from './Button'
import Input from './Input'
import styles from './Settings.module.scss'

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
          <Button
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={isDanger ? 'danger-solid' : 'primary'}
            size="md"
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {description && <p className={styles.modal_desc}>{description}</p>}
      {warning && <p className={styles.modal_warning}>{warning}</p>}
      {steps && steps.length > 0 && (
        <ol className={styles.modal_steps}>
          {steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      )}
      {consequences && consequences.length > 0 && (
        <ul className={styles.modal_list}>
          {consequences.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      )}

      {confirmationPhrase !== undefined && (
        <>
          {confirmationHint && (
            <label className={styles.modal_confirm_label}>
              {confirmationHint}
            </label>
          )}
          <Input
            type="text"
            variant={isDanger ? 'danger' : 'default'}
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
