'use client'

import { useState, useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { createClient } from '@/app/utils/supabase/client'
import { useToast } from '@/app/contexts/ToastContext'
import type { User } from '@supabase/supabase-js'
import { exportMyData, deleteAccount } from './actions'
import styles from './account.module.scss'

interface AccountSettingsClientProps {
  /** 目前使用者的 username，供刪除帳號確認比對 */
  username: string
}

/**
 * [Component] 帳號設定 Client 端
 * 區塊：帳號安全（密碼 / Email）、匯出我的資料、危險區域（刪除帳號）
 */
export default function AccountSettingsClient({
  username,
}: AccountSettingsClientProps) {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations('Settings.account')
  const { showToast } = useToast()

  //* Auth 使用者資料
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)

  // 使用者是否擁有 email/password 登入方式
  const hasEmailIdentity =
    authUser?.identities?.some((i) => i.provider === 'email') ?? false

  //* 密碼重設
  const [resetPasswordState, setResetPasswordState] = useState<
    'idle' | 'loading' | 'sent'
  >('idle')

  //* 更改電子郵件
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailUpdateLoading, setEmailUpdateLoading] = useState(false)
  const [emailUpdateError, setEmailUpdateError] = useState('')

  //* 匯出資料
  const [exporting, setExporting] = useState(false)

  //* 刪除帳號
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  /**
   * [Effect] 載入 Auth 使用者資料
   */
  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setAuthUser(user)
      setLoadingUser(false)
    }
    load()
  }, [])

  /**
   * [Function] 寄送密碼重設郵件
   */
  const handleResetPassword = async () => {
    if (!authUser?.email) return
    setResetPasswordState('loading')

    try {
      const supabase = createClient()
      const resetPath = `/${locale}/auth/reset-password`
      const redirectTo = `${window.location.origin}/${locale}/auth/callback?next=${encodeURIComponent(resetPath)}`

      const { error } = await supabase.auth.resetPasswordForEmail(
        authUser.email,
        { redirectTo },
      )
      if (error) throw error

      setResetPasswordState('sent')
      showToast(t('security.toast.resetSent'), 'success')
    } catch {
      showToast(t('security.toast.resetFailed'), 'error')
      setResetPasswordState('idle')
    }
  }

  /**
   * [Function] 更改電子郵件
   */
  const handleUpdateEmail = async () => {
    if (!newEmail.trim()) return
    setEmailUpdateLoading(true)
    setEmailUpdateError('')

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        email: newEmail.trim(),
      })
      if (error) throw error

      showToast(t('security.toast.emailSent'), 'success')
      setShowEmailForm(false)
      setNewEmail('')
    } catch (err) {
      setEmailUpdateError(
        (err as { message?: string })?.message ||
          t('security.errors.emailUpdateDefault'),
      )
    } finally {
      setEmailUpdateLoading(false)
    }
  }

  /**
   * [Function] 匯出我的資料為 JSON 下載
   */
  const handleExport = async () => {
    setExporting(true)
    try {
      const result = await exportMyData()
      if (!result.success || !result.data) throw new Error(result.error)

      const blob = new Blob([JSON.stringify(result.data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `robot-ctust-data-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      showToast(t('export.toastSuccess'), 'success')
    } catch {
      showToast(t('export.toastFailed'), 'error')
    } finally {
      setExporting(false)
    }
  }

  /**
   * [Function] 永久刪除帳號
   */
  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      const result = await deleteAccount(deleteConfirm)
      if (!result.success) throw new Error(result.error)

      // 清除本地 session 後導回首頁
      const supabase = createClient()
      await supabase.auth.signOut()
      showToast(t('danger.toastSuccess'), 'success')
      router.push('/')
      router.refresh()
    } catch {
      showToast(t('danger.toastFailed'), 'error')
      setDeleting(false)
    }
  }

  const closeDeleteModal = () => {
    if (deleting) return
    setShowDeleteModal(false)
    setDeleteConfirm('')
  }

  return (
    <div className={styles.content}>
      {/* 頁面標題 */}
      <header className={styles.header}>
        <h1>{t('title')}</h1>
        <p>{t('subtitle')}</p>
      </header>

      {loadingUser ? (
        <div className={styles.loading}>{t('loading')}</div>
      ) : (
        <>
          {/* ── 帳號安全 ── */}
          <section className={styles.section}>
            <h2 className={styles.section_title}>
              {t('security.sectionTitle')}
            </h2>

            {hasEmailIdentity ? (
              <>
                {/* 密碼 */}
                <div className={styles.item}>
                  <div className={styles.item_info}>
                    <span className={styles.item_label}>
                      {t('security.password.label')}
                    </span>
                    <span className={styles.item_hint}>
                      {t('security.password.hint', {
                        email: authUser?.email ?? '',
                      })}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`${styles.action_button} ${resetPasswordState === 'sent' ? styles.sent : ''}`}
                    onClick={handleResetPassword}
                    disabled={
                      resetPasswordState === 'loading' ||
                      resetPasswordState === 'sent'
                    }
                  >
                    {resetPasswordState === 'sent'
                      ? t('security.password.sent')
                      : resetPasswordState === 'loading'
                        ? t('security.password.sending')
                        : t('security.password.action')}
                  </button>
                </div>

                {/* 電子郵件 */}
                <div className={styles.item}>
                  <div className={styles.item_info}>
                    <span className={styles.item_label}>
                      {t('security.email.label')}
                    </span>
                    <span className={styles.item_hint}>{authUser?.email}</span>
                  </div>
                  <button
                    type="button"
                    className={styles.action_button}
                    onClick={() => {
                      setShowEmailForm((v) => !v)
                      setEmailUpdateError('')
                      setNewEmail('')
                    }}
                  >
                    {showEmailForm
                      ? t('security.email.cancel')
                      : t('security.email.change')}
                  </button>
                </div>

                {showEmailForm && (
                  <div className={styles.email_form}>
                    <div className={styles.email_form_row}>
                      <input
                        type="email"
                        className={styles.email_input}
                        placeholder={t('security.email.placeholder')}
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        autoFocus
                      />
                      <button
                        type="button"
                        className={styles.confirm_button}
                        onClick={handleUpdateEmail}
                        disabled={emailUpdateLoading || !newEmail.trim()}
                      >
                        {emailUpdateLoading
                          ? t('security.email.confirming')
                          : t('security.email.confirm')}
                      </button>
                    </div>
                    <p className={styles.email_form_hint}>
                      {t('security.email.hint')}
                    </p>
                    {emailUpdateError && (
                      <p className={styles.email_form_error}>
                        {emailUpdateError}
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* Google OAuth 使用者 */
              <div className={styles.oauth_card}>
                <p className={styles.oauth_title}>{t('security.oauth.title')}</p>
                <p className={styles.oauth_desc}>{t('security.oauth.desc')}</p>
                <a
                  href="https://myaccount.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.oauth_link}
                >
                  {t('security.oauth.link')}
                </a>
              </div>
            )}
          </section>

          {/* ── 匯出我的資料 ── */}
          <section className={styles.section}>
            <h2 className={styles.section_title}>{t('export.sectionTitle')}</h2>
            <div className={styles.item}>
              <div className={styles.item_info}>
                <span className={styles.item_label}>{t('export.label')}</span>
                <span className={styles.item_hint}>{t('export.hint')}</span>
              </div>
              <button
                type="button"
                className={styles.action_button}
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? t('export.exporting') : t('export.action')}
              </button>
            </div>
          </section>

          {/* ── 危險區域 ── */}
          <section className={styles.section}>
            <h2 className={`${styles.section_title} ${styles.danger_title}`}>
              {t('danger.sectionTitle')}
            </h2>
            <div className={`${styles.item} ${styles.danger_item}`}>
              <div className={styles.item_info}>
                <span className={styles.item_label}>{t('danger.label')}</span>
                <span className={styles.item_hint}>{t('danger.hint')}</span>
              </div>
              <button
                type="button"
                className={styles.danger_button}
                onClick={() => setShowDeleteModal(true)}
              >
                {t('danger.action')}
              </button>
            </div>
          </section>
        </>
      )}

      {/* 刪除帳號確認 Modal */}
      {showDeleteModal && (
        <div
          className={styles.modal_overlay}
          onClick={closeDeleteModal}
          role="presentation"
        >
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3 className={styles.modal_title}>{t('danger.modal.title')}</h3>
            <p className={styles.modal_warning}>{t('danger.modal.warning')}</p>
            <ul className={styles.modal_list}>
              <li>{t('danger.modal.consequenceProfile')}</li>
              <li>{t('danger.modal.consequencePosts')}</li>
            </ul>
            <label className={styles.modal_confirm_label}>
              {t('danger.modal.confirmHint', { username })}
            </label>
            <input
              type="text"
              className={styles.modal_input}
              placeholder={t('danger.modal.placeholder')}
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              autoFocus
              disabled={deleting}
            />
            <div className={styles.modal_actions}>
              <button
                type="button"
                className={styles.modal_cancel}
                onClick={closeDeleteModal}
                disabled={deleting}
              >
                {t('danger.modal.cancel')}
              </button>
              <button
                type="button"
                className={styles.modal_confirm}
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirm.trim() !== username}
              >
                {deleting
                  ? t('danger.modal.deleting')
                  : t('danger.modal.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
