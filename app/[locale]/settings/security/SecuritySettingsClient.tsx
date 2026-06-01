'use client'

import { useState, useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { createClient } from '@/app/utils/supabase/client'
import { useToast } from '@/app/contexts/ToastContext'
import type { User } from '@supabase/supabase-js'
import styles from './security.module.scss'

/**
 * [Component] 帳號安全設定 Client 端
 * 涵蓋：密碼重設（寄信）、電子郵件更改
 */
export default function SecuritySettingsClient() {
  const locale = useLocale()
  const t = useTranslations('Settings.security')
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
      showToast(t('toast.resetSent'), 'success')
    } catch {
      showToast(t('toast.resetFailed'), 'error')
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

      showToast(t('toast.emailSent'), 'success')
      setShowEmailForm(false)
      setNewEmail('')
    } catch (err) {
      setEmailUpdateError(
        (err as { message?: string })?.message ||
          t('errors.emailUpdateDefault'),
      )
    } finally {
      setEmailUpdateLoading(false)
    }
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
      ) : hasEmailIdentity ? (
        <>
          {/* 密碼 */}
          <section className={styles.section}>
            <h2 className={styles.section_title}>{t('password.sectionTitle')}</h2>

            <div className={styles.item}>
              <div className={styles.item_info}>
                <span className={styles.item_label}>{t('password.label')}</span>
                <span className={styles.item_hint}>
                  {t('password.hint', { email: authUser?.email ?? '' })}
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
                  ? t('password.sent')
                  : resetPasswordState === 'loading'
                    ? t('password.sending')
                    : t('password.action')}
              </button>
            </div>
          </section>

          {/* 電子郵件 */}
          <section className={styles.section}>
            <h2 className={styles.section_title}>{t('email.sectionTitle')}</h2>

            <div className={styles.item}>
              <div className={styles.item_info}>
                <span className={styles.item_label}>{t('email.label')}</span>
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
                {showEmailForm ? t('email.cancel') : t('email.change')}
              </button>
            </div>

            {showEmailForm && (
              <div className={styles.email_form}>
                <div className={styles.email_form_row}>
                  <input
                    type="email"
                    className={styles.email_input}
                    placeholder={t('email.placeholder')}
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
                      ? t('email.confirming')
                      : t('email.confirm')}
                  </button>
                </div>
                <p className={styles.email_form_hint}>{t('email.hint')}</p>
                {emailUpdateError && (
                  <p className={styles.email_form_error}>{emailUpdateError}</p>
                )}
              </div>
            )}
          </section>
        </>
      ) : (
        /* Google OAuth 使用者 */
        <section className={styles.section}>
          <div className={styles.oauth_card}>
            <p className={styles.oauth_title}>{t('oauth.title')}</p>
            <p className={styles.oauth_desc}>{t('oauth.desc')}</p>
            <a
              href="https://myaccount.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.oauth_link}
            >
              {t('oauth.link')}
            </a>
          </div>
        </section>
      )}
    </div>
  )
}
