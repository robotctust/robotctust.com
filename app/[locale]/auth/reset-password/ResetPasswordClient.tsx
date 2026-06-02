'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, Link } from '@/i18n/navigation'
import { createClient } from '@/app/utils/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faCircle, faCircleCheck } from '@fortawesome/free-solid-svg-icons'
import styles from './reset-password.module.scss'

type SessionState = 'loading' | 'valid' | 'invalid'
type SubmitState = 'idle' | 'loading' | 'success'

/**
 * [Component] 重設密碼 Client 端
 * 使用者到達此頁面時已完成 callback token 交換（有效 session）。
 * 呼叫 supabase.auth.updateUser 更新密碼。
 */
export default function ResetPasswordClient() {
  const t = useTranslations('ResetPassword')
  const router = useRouter()

  const [sessionState, setSessionState] = useState<SessionState>('loading')
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [error, setError] = useState('')

  const passwordRules = {
    length: password.length >= 8,
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/'`;~]/.test(password),
  }
  const allRulesValid = Object.values(passwordRules).every(Boolean)

  const passwordError = !password
    ? ''
    : !passwordRules.length
      ? t('errors.passwordMinLength')
      : !passwordRules.hasLowercase
        ? t('errors.passwordLowercase')
        : !passwordRules.hasUppercase
          ? t('errors.passwordUppercase')
          : !passwordRules.hasNumber
            ? t('errors.passwordNumber')
            : !passwordRules.hasSpecial
              ? t('errors.passwordSpecial')
              : ''

  // 頁面載入時確認是否有有效 session
  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setSessionState(session ? 'valid' : 'invalid')
    }
    checkSession()
  }, [])

  // confirmPassword 即時比對
  useEffect(() => {
    if (!confirmPassword) {
      setConfirmError('')
      return
    }
    setConfirmError(password !== confirmPassword ? t('errors.passwordMismatch') : '')
  }, [password, confirmPassword, t])

  // 成功後自動跳轉
  useEffect(() => {
    if (submitState !== 'success') return
    const timer = setTimeout(() => {
      router.replace('/profile')
    }, 2000)
    return () => clearTimeout(timer)
  }, [submitState, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!allRulesValid) return
    if (password !== confirmPassword) return

    setSubmitState('loading')

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setSubmitState('success')
    } catch (err) {
      setError(
        (err as { message?: string })?.message || t('errors.default'),
      )
      setSubmitState('idle')
    }
  }

  // 載入中
  if (sessionState === 'loading') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.loading}>載入中...</div>
        </div>
      </div>
    )
  }

  // Session 無效（連結已失效）
  if (sessionState === 'invalid') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>{t('title')}</h1>
          <p className={styles.invalid_message}>{t('invalidSession')}</p>
          <Link href="/login?mode=login" className={styles.link_button}>
            {t('requestAgain')}
          </Link>
        </div>
      </div>
    )
  }

  // 成功
  if (submitState === 'success') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>{t('title')}</h1>
          <p className={styles.success_message}>{t('success')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.description}>{t('description')}</p>

        {error && <div className={styles.error_message}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.form_group}>
            <label htmlFor="new-password">{t('password')}</label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('passwordPlaceholder')}
              required
              autoFocus
              autoComplete="new-password"
            />
            <div className={styles.password_rules}>
              <div className={`${styles.rule_item} ${passwordRules.length ? styles.valid : ''}`}>
                <FontAwesomeIcon icon={passwordRules.length ? faCircleCheck : faCircle} className={styles.rule_icon} />
                {t('rules.length')}
              </div>
              <div className={`${styles.rule_item} ${passwordRules.hasLowercase ? styles.valid : ''}`}>
                <FontAwesomeIcon icon={passwordRules.hasLowercase ? faCircleCheck : faCircle} className={styles.rule_icon} />
                {t('rules.lowercase')}
              </div>
              <div className={`${styles.rule_item} ${passwordRules.hasUppercase ? styles.valid : ''}`}>
                <FontAwesomeIcon icon={passwordRules.hasUppercase ? faCircleCheck : faCircle} className={styles.rule_icon} />
                {t('rules.uppercase')}
              </div>
              <div className={`${styles.rule_item} ${passwordRules.hasNumber ? styles.valid : ''}`}>
                <FontAwesomeIcon icon={passwordRules.hasNumber ? faCircleCheck : faCircle} className={styles.rule_icon} />
                {t('rules.number')}
              </div>
              <div className={`${styles.rule_item} ${passwordRules.hasSpecial ? styles.valid : ''}`}>
                <FontAwesomeIcon icon={passwordRules.hasSpecial ? faCircleCheck : faCircle} className={styles.rule_icon} />
                {t('rules.special')}
              </div>
            </div>
            {passwordError && (
              <span className={styles.field_error}>{passwordError}</span>
            )}
          </div>

          <div className={styles.form_group}>
            <label htmlFor="confirm-password">{t('confirmPassword')}</label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('confirmPasswordPlaceholder')}
              required
              autoComplete="new-password"
            />
            {confirmError && (
              <span className={styles.field_error}>{confirmError}</span>
            )}
          </div>

          <button
            type="submit"
            className={styles.submit_button}
            disabled={submitState === 'loading' || !allRulesValid || password !== confirmPassword || !confirmPassword}
          >
            {submitState === 'loading' ? t('submitting') : t('submit')}
          </button>
        </form>
      </div>
    </div>
  )
}
