'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { createClient } from '@/app/utils/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import styles from './LoginForm.module.scss'

interface ForgotPasswordFormProps {
  onBack: () => void
  initialEmail?: string
}

/**
 * [Component] 忘記密碼表單
 * 使用者輸入電子郵件後，透過 Supabase 寄送密碼重設連結。
 */
export function ForgotPasswordForm({
  onBack,
  initialEmail = '',
}: ForgotPasswordFormProps) {
  const t = useTranslations('Login')
  const locale = useLocale()
  const [email, setEmail] = useState(initialEmail)
  const [isLoading, setIsLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setIsLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const resetPath = `/${locale}/auth/reset-password`
      const redirectTo = `${window.location.origin}/${locale}/auth/callback?next=${encodeURIComponent(resetPath)}`

      const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo },
      )

      if (supabaseError) throw supabaseError
      setIsSent(true)
    } catch (err) {
      setError(
        (err as { message?: string })?.message ||
          t('form.forgotPassword.errors.default'),
      )
    } finally {
      setIsLoading(false)
    }
  }

  // 已寄出：顯示確認畫面
  if (isSent) {
    return (
      <>
        <div className={styles.form_header}>
          <h2>{t('form.forgotPassword.title')}</h2>
        </div>
        <div className={styles.success_message}>
          {t('form.forgotPassword.sent', { email })}
        </div>
        <p className={styles.switch_form}>
          <button type="button" onClick={onBack}>
            <FontAwesomeIcon icon={faArrowLeft} />
            &nbsp;{t('form.forgotPassword.backToLogin')}
          </button>
        </p>
      </>
    )
  }

  return (
    <>
      <div className={styles.form_header}>
        <h2>{t('form.forgotPassword.title')}</h2>
      </div>

      <p className={styles.forgot_description}>
        {t('form.forgotPassword.description')}
      </p>

      {error && <div className={styles.error_message}>{error}</div>}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.form_group}>
          <label htmlFor="reset-email">
            {t('form.forgotPassword.email')}
          </label>
          <input
            id="reset-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('form.forgotPassword.emailPlaceholder')}
            required
            autoFocus
          />
        </div>

        <button
          type="submit"
          className={styles.submit_button}
          disabled={isLoading || !email.trim()}
        >
          {isLoading
            ? t('form.forgotPassword.submitting')
            : t('form.forgotPassword.submit')}
        </button>
      </form>

      <p className={styles.switch_form}>
        <button type="button" onClick={onBack}>
          <FontAwesomeIcon icon={faArrowLeft} />
          &nbsp;{t('form.forgotPassword.backToLogin')}
        </button>
      </p>
    </>
  )
}
