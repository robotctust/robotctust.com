'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, Link } from '@/i18n/navigation'
import { createClient } from '@/app/utils/supabase/client'
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
  const [error, setError] = useState('')

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

    if (password.length < 8) {
      setError(t('errors.passwordMinLength'))
      return
    }
    if (password !== confirmPassword) {
      setError(t('errors.passwordMismatch'))
      return
    }

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
          </div>

          <button
            type="submit"
            className={styles.submit_button}
            disabled={submitState === 'loading'}
          >
            {submitState === 'loading' ? t('submitting') : t('submit')}
          </button>
        </form>
      </div>
    </div>
  )
}
