'use client'

import React, { useMemo, useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { useForm } from 'react-hook-form'
import { useTranslations } from 'next-intl'
import styles from './RegisterForm.module.scss'

// third-party utils
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'

// components
import GoogleLoginButton from '../GoogleLoginButton/GoogleLoginButton'

// contexts
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'

// utils
import { uploadUserAvatarToFirebaseStorage } from '../../utils/firebaseService'

// types
import {
  ClubIdentity,
  RegisterFormData,
  SchoolIdentity,
} from '../../types/user'

// icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faXmark,
  faChevronLeft,
  faChevronRight,
  faCheck,
  faCircle,
  faCircleCheck,
} from '@fortawesome/free-solid-svg-icons'

interface RegisterFormProps {
  onSwitchToLogin: (email?: string) => void
  onClose?: () => void
  showCloseButton?: boolean
  next?: string
}

interface FormData {
  email: string
  password: string
  confirmPassword: string
  username?: string
  displayName?: string
  schoolIdentity: SchoolIdentity
  clubIdentity: ClubIdentity
  studentId?: string
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSwitchToLogin,
  onClose,
  showCloseButton = true,
  next,
}) => {
  const t = useTranslations('Login')
  const { register: registerUser, signInWithGoogle, checkEmailExists } = useAuth()
  const { showToast } = useToast()

  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [emailSent, setEmailSent] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [previewImage, setPreviewImage] = useState<string>(
    '/assets/image/userEmptyAvatar.svg',
  )
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const schoolIdentityOptions = useMemo(
    () => [
      { value: 'current_student' as SchoolIdentity, label: t('form.register.step4.schoolIdentityOptions.current_student') },
      { value: 'teacher' as SchoolIdentity, label: t('form.register.step4.schoolIdentityOptions.teacher') },
      { value: 'external' as SchoolIdentity, label: t('form.register.step4.schoolIdentityOptions.external') },
      { value: 'alumni' as SchoolIdentity, label: t('form.register.step4.schoolIdentityOptions.alumni') },
    ],
    [t],
  )

  const clubIdentityOptions = useMemo(
    () => [
      { value: 'member' as ClubIdentity, label: t('form.register.step4.clubIdentityOptions.member') },
      { value: 'non_member' as ClubIdentity, label: t('form.register.step4.clubIdentityOptions.non_member') },
    ],
    [t],
  )

  const registerSchema: yup.ObjectSchema<FormData> = useMemo(
    () =>
      yup.object({
        email: yup
          .string()
          .required(t('form.register.validation.emailRequired'))
          .email(t('form.register.validation.emailInvalid')),
        password: yup
          .string()
          .required(t('form.register.validation.passwordRequired'))
          .min(8, t('form.register.validation.passwordMinLength'))
          .matches(/[a-z]/, t('form.register.validation.passwordLowercase'))
          .matches(/[A-Z]/, t('form.register.validation.passwordUppercase'))
          .matches(/[0-9]/, t('form.register.validation.passwordNumber'))
          .matches(
            /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/'`;~]/,
            t('form.register.validation.passwordSpecial'),
          ),
        confirmPassword: yup
          .string()
          .required(t('form.register.validation.confirmPasswordRequired'))
          .oneOf([yup.ref('password')], t('form.register.validation.confirmPasswordMismatch')),
        username: yup
          .string()
          .optional()
          .matches(/^[a-z0-9_]*$/, t('form.register.validation.usernamePattern'))
          .min(3, t('form.register.validation.usernameMinLength'))
          .max(20, t('form.register.validation.usernameMaxLength')),
        displayName: yup
          .string()
          .optional()
          .max(20, t('form.register.validation.displayNameMaxLength')),
        schoolIdentity: yup
          .mixed<SchoolIdentity>()
          .oneOf(
            schoolIdentityOptions.map((o) => o.value),
            t('form.register.validation.schoolIdentityRequired'),
          )
          .required(t('form.register.validation.schoolIdentityRequired')),
        clubIdentity: yup
          .mixed<ClubIdentity>()
          .oneOf(
            clubIdentityOptions.map((o) => o.value),
            t('form.register.validation.clubIdentityRequired'),
          )
          .required(t('form.register.validation.clubIdentityRequired')),
        studentId: yup
          .string()
          .trim()
          .max(20, t('form.register.validation.studentIdMaxLength'))
          .matches(/^[A-Za-z0-9_-]*$/, t('form.register.validation.studentIdPattern'))
          .when('schoolIdentity', {
            is: 'current_student',
            then: (schema) => schema.required(t('form.register.validation.studentIdRequired')),
            otherwise: (schema) => schema.optional(),
          }),
      }),
    [t, schoolIdentityOptions, clubIdentityOptions],
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    trigger,
    clearErrors,
    setValue,
  } = useForm<FormData>({
    resolver: yupResolver(registerSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })

  const watchPassword = watch('password') ?? ''
  const watchEmail = watch('email') ?? ''
  const watchUsername = watch('username') ?? ''
  const watchDisplayName = watch('displayName') ?? ''
  const watchSchoolIdentity = watch('schoolIdentity')
  const watchClubIdentity = watch('clubIdentity')
  const watchStudentId = watch('studentId') ?? ''
  const isCurrentStudent = watchSchoolIdentity === 'current_student'

  const passwordRules = {
    length: watchPassword.length >= 8,
    hasLowercase: /[a-z]/.test(watchPassword),
    hasUppercase: /[A-Z]/.test(watchPassword),
    hasNumber: /[0-9]/.test(watchPassword),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/'`;~]/.test(watchPassword),
  }

  useEffect(() => {
    if (watchPassword) trigger('password')
  }, [watchPassword, trigger])

  useEffect(() => {
    if (watch('confirmPassword')) trigger('confirmPassword')
  }, [watch('confirmPassword'), watchPassword, trigger])

  useEffect(() => {
    if (!watchEmail) { clearErrors('email'); return }
    const timer = setTimeout(() => trigger('email'), 1500)
    return () => clearTimeout(timer)
  }, [watchEmail, trigger, clearErrors])

  useEffect(() => {
    if (!watchUsername) { clearErrors('username'); return }
    const timer = setTimeout(() => trigger('username'), 1500)
    return () => clearTimeout(timer)
  }, [watchUsername, trigger, clearErrors])

  useEffect(() => {
    if (!watchDisplayName) { clearErrors('displayName'); return }
    const timer = setTimeout(() => trigger('displayName'), 1500)
    return () => clearTimeout(timer)
  }, [watchDisplayName, trigger, clearErrors])

  useEffect(() => {
    if (watchSchoolIdentity !== 'current_student') {
      clearErrors('studentId')
      setValue('studentId', '')
    }
  }, [watchSchoolIdentity, clearErrors, setValue])

  const getErrorMessage = (errorMessage: string): string => {
    if (errorMessage.includes('使用者名稱已存在')) return t('form.register.errors.usernameTaken')
    if (errorMessage.includes('User already registered')) return t('form.register.errors.emailRegistered')
    if (errorMessage.includes('student_id') || errorMessage.includes('學號')) return t('form.register.errors.studentIdBound')
    if (errorMessage.toLowerCase().includes('password')) return t('form.register.errors.passwordWeak')
    return t('form.register.errors.default', { message: errorMessage })
  }

  const handleNextStep = async () => {
    let fieldsToValidate: (keyof FormData)[] = []
    if (step === 1) fieldsToValidate = ['email']
    if (step === 2) fieldsToValidate = ['password', 'confirmPassword']
    if (step === 3) fieldsToValidate = ['username', 'displayName']

    const result = await trigger(fieldsToValidate)
    if (result) {
      if (step === 1) {
        setIsLoading(true)
        try {
          const emailExists = await checkEmailExists(watchEmail)
          if (emailExists) {
            showToast(t('form.register.toast.emailDetected'), 'info')
            onSwitchToLogin(watchEmail)
            return
          }
        } catch (err) {
          console.error('Email check error:', err)
        } finally {
          setIsLoading(false)
        }
      }
      setStep(step + 1)
      setError('')
    }
  }

  const handlePrevStep = () => {
    setStep(step - 1)
    setError('')
  }

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError(t('form.register.errors.avatarTooLarge'))
        return
      }
      if (!file.type.startsWith('image/')) {
        setError(t('form.register.errors.avatarInvalidType'))
        return
      }
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setPreviewImage(result)
        setAvatarFile(file)
      }
      reader.readAsDataURL(file)
    }
  }

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true)
      setError('')

      let avatarURL = '/assets/image/userEmptyAvatar.png'
      if (avatarFile) {
        avatarURL = await uploadUserAvatarToFirebaseStorage(avatarFile, data.email)
      }

      const registerData: RegisterFormData = {
        email: data.email!,
        password: data.password!,
        username: data.username?.trim(),
        displayName: data.displayName?.trim(),
        photoURL: avatarURL,
        schoolIdentity: data.schoolIdentity,
        clubIdentity: data.clubIdentity,
        studentId: data.studentId?.trim(),
      }

      const { requiresEmailConfirmation } = await registerUser(registerData)
      if (requiresEmailConfirmation) {
        setEmailSent(true)
        showToast(t('form.register.toast.emailSent'), 'success')
      } else {
        showToast(t('form.register.toast.success'), 'success')
        onClose?.()
      }
    } catch (error) {
      console.error('Registration failed:', error)
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
      await signInWithGoogle(next)
      showToast(t('form.register.toast.googleSuccess'), 'success')
      onClose?.()
    } catch (err: unknown) {
      setError(
        getErrorMessage((err as { message?: string })?.message || 'unknown'),
      )
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className={styles.email_sent}>
        <div className={styles.form_header}>
          <h2>{t('form.register.emailVerification.title')}</h2>
          {showCloseButton && (
            <button className={styles.close_button} onClick={onClose}>
              <FontAwesomeIcon icon={faXmark} />
            </button>
          )}
        </div>
        <p className={styles.email_sent_text}>
          {t('form.register.emailVerification.text')}
        </p>
        <Link href="/login" className={styles.submit_button}>
          {t('form.register.emailVerification.goToLogin')}
        </Link>
      </div>
    )
  }

  return (
    <>
      {step > 1 && (
        <button
          className={styles.back_button}
          onClick={handlePrevStep}
          disabled={isLoading}
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
      )}

      <div className={styles.stepper}>
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`${styles.step_item} ${step >= s ? styles.active : ''}`}
          >
            {s > 1 && <div className={styles.step_line} />}
            <span className={styles.step_dot}>
              {step > s ? <FontAwesomeIcon icon={faCheck} /> : s}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        {/* Step 1: Email */}
        {step === 1 && (
          <div className={styles.step_content}>
            <div className={styles.register_options}>
              <GoogleLoginButton
                onClick={handleGoogleSignIn}
                mode="register"
                disabled={isLoading}
              />
              <div className={styles.divider}>
                <span className={styles.divider_line}></span>
                <span className={styles.divider_text}>
                  {t('form.register.step1.emailDivider')}
                </span>
              </div>
            </div>

            <div className={styles.form_group}>
              <label htmlFor="email">
                {t('form.register.step1.email')}{' '}
                <span className={styles.required}>*</span>
              </label>
              <input
                id="email"
                type="email"
                autoFocus
                {...register('email')}
                className={errors.email ? styles.error : ''}
                placeholder="email@example.com"
              />
              {errors.email && (
                <span className={styles.field_error}>
                  {errors.email.message}
                </span>
              )}
            </div>

            <label className={styles.terms_checkbox}>
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
              />
              <span>
                {t.rich('form.register.step1.agreeTerms', {
                  terms: (chunks) => (
                    <Link href="/terms" target="_blank" rel="noopener noreferrer">
                      {chunks}
                    </Link>
                  ),
                  privacy: (chunks) => (
                    <Link href="/privacy" target="_blank" rel="noopener noreferrer">
                      {chunks}
                    </Link>
                  ),
                })}
              </span>
            </label>

            <button
              type="button"
              className={styles.next_button}
              onClick={handleNextStep}
              disabled={!watchEmail || !!errors.email || !agreeTerms}
            >
              {t('form.register.steps.next')}{' '}
              <FontAwesomeIcon icon={faChevronRight} />
            </button>

            <p className={styles.switch_text}>
              {t('form.register.step1.switchToLogin')}{' '}
              <button type="button" onClick={() => onSwitchToLogin()}>
                {t('form.register.step1.loginLink')}
              </button>
            </p>
          </div>
        )}

        {/* Step 2: Password */}
        {step === 2 && (
          <div className={styles.step_content}>
            <div className={styles.form_group}>
              <label htmlFor="password">
                {t('form.register.step2.password')}{' '}
                <span className={styles.required}>*</span>
              </label>
              <input
                id="password"
                type="password"
                autoFocus
                {...register('password')}
                className={errors.password ? styles.error : ''}
                placeholder={t('form.register.step2.passwordPlaceholder')}
              />
              {errors.password && (
                <span className={styles.field_error}>
                  {errors.password.message}
                </span>
              )}
              <div className={styles.password_rules}>
                <div className={`${styles.rule_item} ${passwordRules.length ? styles.valid : ''}`}>
                  <FontAwesomeIcon icon={passwordRules.length ? faCircleCheck : faCircle} className={styles.rule_icon} />
                  {t('form.register.step2.rules.length')}
                </div>
                <div className={`${styles.rule_item} ${passwordRules.hasLowercase ? styles.valid : ''}`}>
                  <FontAwesomeIcon icon={passwordRules.hasLowercase ? faCircleCheck : faCircle} className={styles.rule_icon} />
                  {t('form.register.step2.rules.lowercase')}
                </div>
                <div className={`${styles.rule_item} ${passwordRules.hasUppercase ? styles.valid : ''}`}>
                  <FontAwesomeIcon icon={passwordRules.hasUppercase ? faCircleCheck : faCircle} className={styles.rule_icon} />
                  {t('form.register.step2.rules.uppercase')}
                </div>
                <div className={`${styles.rule_item} ${passwordRules.hasNumber ? styles.valid : ''}`}>
                  <FontAwesomeIcon icon={passwordRules.hasNumber ? faCircleCheck : faCircle} className={styles.rule_icon} />
                  {t('form.register.step2.rules.number')}
                </div>
                <div className={`${styles.rule_item} ${passwordRules.hasSpecial ? styles.valid : ''}`}>
                  <FontAwesomeIcon icon={passwordRules.hasSpecial ? faCircleCheck : faCircle} className={styles.rule_icon} />
                  {t('form.register.step2.rules.special')}
                </div>
              </div>
            </div>

            <div className={styles.form_group}>
              <label htmlFor="confirmPassword">
                {t('form.register.step2.confirmPassword')}{' '}
                <span className={styles.required}>*</span>
              </label>
              <input
                id="confirmPassword"
                type="password"
                {...register('confirmPassword')}
                className={errors.confirmPassword ? styles.error : ''}
                placeholder={t('form.register.step2.confirmPasswordPlaceholder')}
              />
              {errors.confirmPassword && (
                <span className={styles.field_error}>
                  {errors.confirmPassword.message}
                </span>
              )}
            </div>

            <button
              type="button"
              className={styles.next_button}
              onClick={handleNextStep}
              disabled={!!errors.password || !!errors.confirmPassword || !watchPassword}
            >
              {t('form.register.steps.next')}{' '}
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>
        )}

        {/* Step 3: Profile */}
        {step === 3 && (
          <div className={styles.step_content}>
            <div className={styles.avatar_section}>
              <label>{t('form.register.step3.uploadAvatar')}</label>
              <div className={styles.avatar_upload}>
                <button
                  type="button"
                  className={styles.upload_button}
                  onClick={() => fileInputRef.current?.click()}
                >
                  +
                </button>
                <div className={styles.avatar_preview}>
                  <Image
                    src={previewImage || '/assets/image/userEmptyAvatar.png'}
                    alt={t('form.register.step3.uploadAvatar')}
                    className={styles.avatar_image}
                    width={80}
                    height={80}
                  />
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className={styles.file_input}
                />
              </div>
            </div>

            <div className={styles.form_group}>
              <label htmlFor="username">{t('form.register.step3.username')}</label>
              <input
                id="username"
                type="text"
                {...register('username')}
                className={errors.username ? styles.error : ''}
                placeholder="e.g. robot_lover"
              />
              <p className={styles.hint}>{t('form.register.step3.usernameHint')}</p>
              {errors.username && (
                <span className={styles.field_error}>
                  {errors.username.message}
                </span>
              )}
            </div>

            <div className={styles.form_group}>
              <label htmlFor="displayName">{t('form.register.step3.displayName')}</label>
              <input
                id="displayName"
                type="text"
                {...register('displayName')}
                className={errors.displayName ? styles.error : ''}
                placeholder={t('form.register.step3.displayNamePlaceholder')}
              />
              <p className={styles.hint}>{t('form.register.step3.displayNameHint')}</p>
              {errors.displayName && (
                <span className={styles.field_error}>
                  {errors.displayName.message}
                </span>
              )}
            </div>

            <button
              type="button"
              className={styles.next_button}
              onClick={handleNextStep}
              disabled={isLoading}
            >
              {t('form.register.steps.next')}{' '}
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>
        )}

        {/* Step 4: Identity */}
        {step === 4 && (
          <div className={styles.step_content}>
            <p className={styles.section_hint}>{t('form.register.step4.hint')}</p>

            <div className={styles.form_group}>
              <label htmlFor="schoolIdentity">
                {t('form.register.step4.schoolIdentity')}{' '}
                <span className={styles.required}>*</span>
              </label>
              <select
                id="schoolIdentity"
                autoFocus
                {...register('schoolIdentity')}
                className={errors.schoolIdentity ? styles.error : ''}
                defaultValue=""
              >
                <option value="" disabled>
                  {t('form.register.step4.schoolIdentityPlaceholder')}
                </option>
                {schoolIdentityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.schoolIdentity && (
                <span className={styles.field_error}>
                  {errors.schoolIdentity.message}
                </span>
              )}
            </div>

            <div className={styles.form_group}>
              <label htmlFor="clubIdentity">
                {t('form.register.step4.clubIdentity')}{' '}
                <span className={styles.required}>*</span>
              </label>
              <select
                id="clubIdentity"
                {...register('clubIdentity')}
                className={errors.clubIdentity ? styles.error : ''}
                defaultValue=""
              >
                <option value="" disabled>
                  {t('form.register.step4.clubIdentityPlaceholder')}
                </option>
                {clubIdentityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.clubIdentity && (
                <span className={styles.field_error}>
                  {errors.clubIdentity.message}
                </span>
              )}
            </div>

            {isCurrentStudent && (
              <div className={styles.form_group}>
                <label htmlFor="studentId">
                  {t('form.register.step4.studentId')}{' '}
                  <span className={styles.required}>*</span>
                </label>
                <input
                  id="studentId"
                  type="text"
                  {...register('studentId')}
                  className={errors.studentId ? styles.error : ''}
                  placeholder={t('form.register.step4.studentIdPlaceholder')}
                />
                <p className={styles.hint}>
                  {t('form.register.step4.studentIdHint')}
                </p>
                {errors.studentId && (
                  <span className={styles.field_error}>
                    {errors.studentId.message}
                  </span>
                )}
              </div>
            )}

            <button
              type="submit"
              className={styles.submit_button}
              disabled={
                isLoading ||
                !watchSchoolIdentity ||
                !watchClubIdentity ||
                !!errors.schoolIdentity ||
                !!errors.clubIdentity ||
                !!errors.studentId ||
                (isCurrentStudent && !watchStudentId.trim())
              }
            >
              {isLoading
                ? t('form.register.steps.submitting')
                : t('form.register.steps.submit')}
            </button>
          </div>
        )}

        {error && <div className={styles.error_message}>{error}</div>}
      </form>
    </>
  )
}
