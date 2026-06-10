'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslations } from 'next-intl'
import styles from './LoginForm.module.scss'

// third-party utils
import { useQueryState, parseAsString } from 'nuqs'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'

// component
import GoogleLoginButton from '../GoogleLoginButton/GoogleLoginButton'
import { ForgotPasswordForm } from './ForgotPasswordForm'

// context
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'

// type
import { LoginFormData } from '../../types/user'

// icon
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'

interface LoginFormProps {
  onSwitchToRegister: () => void
  onClose?: () => void
  showCloseButton?: boolean
  next?: string
}

export function LoginForm({
  onSwitchToRegister,
  onClose,
  showCloseButton = true,
  next,
}: LoginFormProps) {
  const t = useTranslations('Login')
  const { showToast } = useToast()
  const { signInWithEmail, signInWithGoogle } = useAuth()
  const [emailQuery] = useQueryState('email', parseAsString.withDefault(''))
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [showForgotPassword, setShowForgotPassword] = useState(false)

  const loginSchema = useMemo(
    () =>
      yup.object({
        email: yup
          .string()
          .required(t('form.login.validation.emailRequired'))
          .email(t('form.login.validation.emailInvalid')),
        password: yup
          .string()
          .required(t('form.login.validation.passwordRequired'))
          .min(6, t('form.login.validation.passwordMinLength')),
      }),
    [t],
  )

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      email: emailQuery,
    },
  })

  const getErrorMessage = (errorMsg: string): string => {
    if (
      errorMsg.includes('Invalid credentials') ||
      errorMsg.includes('invalid_grant') ||
      errorMsg.includes('Invalid login credentials')
    ) {
      return t('form.login.errors.invalidCredentials')
    } else if (errorMsg.includes('Email not confirmed')) {
      return t('form.login.errors.emailNotConfirmed')
    } else if (errorMsg.includes('User not found')) {
      return t('form.login.errors.userNotFound')
    } else {
      return t('form.login.errors.default')
    }
  }

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true)
      setError('')
      await signInWithEmail(data.email, data.password)
      showToast(t('form.login.toast.success'), 'success')
      onClose?.()
    } catch (error) {
      console.error('Login failed:', error)
      setError(
        getErrorMessage((error as { message?: string })?.message || 'unknown'),
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true)
      setError('')
      // 成功提示改由 /auth/callback 種 cookie、抵達後由 AuthFlashToast 顯示
      // （此處 await 只代表「已發起整頁轉導」，並非登入成功）
      await signInWithGoogle(next)
    } catch (error) {
      console.error('Google sign-in failed:', error)
      setError(
        getErrorMessage((error as { message?: string })?.message || 'unknown'),
      )
      showToast(t('form.login.toast.googleFailed'), 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // 忘記密碼模式：替換整個表單內容
  if (showForgotPassword) {
    return (
      <ForgotPasswordForm
        onBack={() => setShowForgotPassword(false)}
        initialEmail={getValues('email')}
      />
    )
  }

  return (
    <>
      {/* 表單標題 */}
      <div className={styles.form_header}>
        <h2>{t('form.login.title')}</h2>
        {showCloseButton && (
          <button className={styles.close_button} onClick={onClose}>
            <FontAwesomeIcon icon={faXmark} />
          </button>
        )}
      </div>

      {error && <div className={styles.error_message}>{error}</div>}

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <div className={styles.form_group}>
          <label htmlFor="email">{t('form.login.email')}</label>
          <input
            id="email"
            type="email"
            {...register('email')}
            className={errors.email ? styles.error : ''}
            placeholder={t('form.login.emailPlaceholder')}
          />
          {errors.email && (
            <span className={styles.field_error}>{errors.email.message}</span>
          )}
        </div>

        <div className={styles.form_group}>
          <label htmlFor="password">{t('form.login.password')}</label>
          <input
            id="password"
            type="password"
            {...register('password')}
            className={errors.password ? styles.error : ''}
            placeholder={t('form.login.passwordPlaceholder')}
          />
          {errors.password && (
            <span className={styles.field_error}>
              {errors.password.message}
            </span>
          )}
        </div>

        <button
          type="button"
          className={styles.forgot_link}
          onClick={() => setShowForgotPassword(true)}
        >
          {t('form.forgotPassword.title')}？
        </button>

        <button
          type="submit"
          className={styles.submit_button}
          disabled={isLoading}
        >
          {isLoading ? t('form.login.submitting') : t('form.login.submit')}
        </button>
      </form>

      <div className={styles.divider}>
        <span className={styles.divider_line}></span>
        <span className={styles.divider_text}>{t('form.login.divider')}</span>
      </div>

      <GoogleLoginButton
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        mode="login"
      />

      <p className={styles.switch_form}>
        {t('form.login.switchToRegister')}{' '}
        <button type="button" onClick={onSwitchToRegister}>
          {t('form.login.registerLink')}
        </button>
      </p>
    </>
  )
}
