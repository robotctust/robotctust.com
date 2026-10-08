'use client'

import { useCallback, useState } from 'react'
import { useTranslations } from 'next-intl'
import ConfirmModal from './ConfirmModal'

export interface ConfirmOptions {
  /** 標題（已翻譯） */
  title: string
  description?: string
  /** 預設「確定」 */
  confirmLabel?: string
  /** 預設「取消」 */
  cancelLabel?: string
  /** 危險操作：紅色確認鈕 */
  variant?: 'default' | 'danger'
}

/**
 * 取代 window.confirm 的確認對話框：
 * const { confirm, dialog } = useConfirm()
 * if (!(await confirm({ title: '…' }))) return
 * 並把 {dialog} 放進元件的 JSX 裡
 */
export function useConfirm() {
  const t = useTranslations('Components.Modal')
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null)

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
    [],
  )

  const close = (ok: boolean) => {
    pending?.resolve(ok)
    setPending(null)
  }

  const dialog = pending && (
    <ConfirmModal
      open
      title={pending.title}
      description={pending.description}
      confirmLabel={pending.confirmLabel ?? t('confirm')}
      cancelLabel={pending.cancelLabel ?? t('cancel')}
      variant={pending.variant}
      onConfirm={() => close(true)}
      onClose={() => close(false)}
    />
  )

  return { confirm, dialog }
}
