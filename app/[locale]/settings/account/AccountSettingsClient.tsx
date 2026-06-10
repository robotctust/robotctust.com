'use client'

import { useState, useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { createClient } from '@/app/utils/supabase/client'
import { useToast } from '@/app/contexts/ToastContext'
import type { User } from '@supabase/supabase-js'
import {
  SettingsSection,
  SettingsItem,
  Button,
  Input,
  ConfirmModal,
} from '@/app/components/Settings'
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
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  //* 更改電子郵件
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailUpdateLoading, setEmailUpdateLoading] = useState(false)
  const [emailUpdateError, setEmailUpdateError] = useState('')
  const [showEmailConfirm, setShowEmailConfirm] = useState(false)

  //* 匯出資料
  const [exporting, setExporting] = useState(false)

  //* 刪除帳號
  const [showDeleteModal, setShowDeleteModal] = useState(false)
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
   * [Function] 二次確認後寄送重設密碼郵件，完成後關閉彈窗
   */
  const handleResetConfirm = async () => {
    await handleResetPassword()
    setShowResetConfirm(false)
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
   * [Function] 二次確認後送出更改 Email，完成後關閉彈窗
   * 失敗時 inline 表單會顯示錯誤
   */
  const handleEmailConfirm = async () => {
    await handleUpdateEmail()
    setShowEmailConfirm(false)
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
   * ConfirmModal 已確保輸入字串等於 username 才會觸發
   */
  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      const result = await deleteAccount(username)
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
          <SettingsSection title={t('security.sectionTitle')}>
            {hasEmailIdentity ? (
              <>
                {/* 密碼 */}
                <SettingsItem
                  label={t('security.password.label')}
                  hint={t('security.password.hint', {
                    email: authUser?.email ?? '',
                  })}
                >
                  <Button
                    success={resetPasswordState === 'sent'}
                    onClick={() => setShowResetConfirm(true)}
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
                  </Button>
                </SettingsItem>

                {/* 電子郵件 */}
                <SettingsItem
                  label={t('security.email.label')}
                  hint={authUser?.email}
                  expanded={
                    showEmailForm ? (
                      <>
                        <div className={styles.email_form_row}>
                          <Input
                            type="email"
                            placeholder={t('security.email.placeholder')}
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            autoFocus
                          />
                          <Button
                            variant="primary"
                            onClick={() => {
                              setEmailUpdateError('')
                              setShowEmailConfirm(true)
                            }}
                            disabled={emailUpdateLoading || !newEmail.trim()}
                          >
                            {emailUpdateLoading
                              ? t('security.email.confirming')
                              : t('security.email.confirm')}
                          </Button>
                        </div>
                        <p className={styles.email_form_hint}>
                          {t('security.email.hint')}
                        </p>
                        {emailUpdateError && (
                          <p className={styles.email_form_error}>
                            {emailUpdateError}
                          </p>
                        )}
                      </>
                    ) : undefined
                  }
                >
                  <Button
                    onClick={() => {
                      setShowEmailForm((v) => !v)
                      setEmailUpdateError('')
                      setNewEmail('')
                    }}
                  >
                    {showEmailForm
                      ? t('security.email.cancel')
                      : t('security.email.change')}
                  </Button>
                </SettingsItem>
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
          </SettingsSection>

          {/* ── 匯出我的資料 ── */}
          <SettingsSection title={t('export.sectionTitle')}>
            <SettingsItem label={t('export.label')} hint={t('export.hint')}>
              <Button onClick={handleExport} disabled={exporting}>
                {exporting ? t('export.exporting') : t('export.action')}
              </Button>
            </SettingsItem>
          </SettingsSection>

          {/* ── 危險區域 ── */}
          <SettingsSection title={t('danger.sectionTitle')} variant="danger">
            <SettingsItem
              label={t('danger.label')}
              hint={t('danger.hint')}
              variant="danger"
            >
              <Button
                variant="danger-outline"
                onClick={() => setShowDeleteModal(true)}
              >
                {t('danger.action')}
              </Button>
            </SettingsItem>
          </SettingsSection>
        </>
      )}

      {/* 重設密碼 二次確認 Modal */}
      <ConfirmModal
        open={showResetConfirm}
        title={t('security.password.confirmModal.title')}
        description={t('security.password.confirmModal.desc', {
          email: authUser?.email ?? '',
        })}
        steps={t.raw('security.password.confirmModal.steps') as string[]}
        confirmLabel={
          resetPasswordState === 'loading'
            ? t('security.password.sending')
            : t('security.password.confirmModal.confirm')
        }
        cancelLabel={t('security.email.cancel')}
        onConfirm={handleResetConfirm}
        onClose={() => {
          if (resetPasswordState !== 'loading') setShowResetConfirm(false)
        }}
        loading={resetPasswordState === 'loading'}
      />

      {/* 更改 Email 二次確認 Modal */}
      <ConfirmModal
        open={showEmailConfirm}
        title={t('security.email.confirmModal.title')}
        description={t('security.email.confirmModal.desc', {
          email: newEmail.trim(),
        })}
        steps={t.raw('security.email.confirmModal.steps') as string[]}
        confirmLabel={
          emailUpdateLoading
            ? t('security.email.confirming')
            : t('security.email.confirmModal.confirm')
        }
        cancelLabel={t('security.email.cancel')}
        onConfirm={handleEmailConfirm}
        onClose={() => {
          if (!emailUpdateLoading) setShowEmailConfirm(false)
        }}
        loading={emailUpdateLoading}
      />

      {/* 刪除帳號確認 Modal */}
      <ConfirmModal
        open={showDeleteModal}
        variant="danger"
        title={t('danger.modal.title')}
        warning={t('danger.modal.warning')}
        consequences={[
          t('danger.modal.consequenceProfile'),
          t('danger.modal.consequencePosts'),
        ]}
        confirmationPhrase={username}
        confirmationHint={t('danger.modal.confirmHint', { username })}
        confirmationPlaceholder={t('danger.modal.placeholder')}
        confirmLabel={
          deleting ? t('danger.modal.deleting') : t('danger.modal.confirm')
        }
        cancelLabel={t('danger.modal.cancel')}
        onConfirm={handleDeleteAccount}
        onClose={closeDeleteModal}
        loading={deleting}
      />
    </div>
  )
}
