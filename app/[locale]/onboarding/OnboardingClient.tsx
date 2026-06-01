'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from '@/i18n/navigation'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCheck,
  faChevronLeft,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons'
import styles from './onboarding.module.scss'
import { useAuth } from '@/app/contexts/AuthContext'
import { useToast } from '@/app/contexts/ToastContext'
import { uploadUserAvatarToFirebaseStorage } from '@/app/utils/firebaseService'
import { ClubIdentity, SchoolIdentity, UserProfile } from '@/app/types/user'

interface OnboardingClientProps {
  initialData: {
    uid: string
    email: string
    username: string
    displayName: string
    photoURL: string
    studentId?: string
    schoolIdentity?: SchoolIdentity
    clubIdentity?: ClubIdentity
  }
  next?: string
}

interface OnboardingFormData {
  username: string
  displayName: string
  schoolIdentity: SchoolIdentity
  clubIdentity: ClubIdentity
  studentId?: string
}

const schoolIdentityOptions: Array<{
  value: SchoolIdentity
  label: string
}> = [
  { value: 'current_student', label: '本校學生' },
  { value: 'teacher', label: '本校老師' },
  { value: 'external', label: '非本校人士' },
  { value: 'alumni', label: '畢業生' },
]

const clubIdentityOptions: Array<{
  value: ClubIdentity
  label: string
}> = [
  { value: 'member', label: '我是社團成員' },
  { value: 'non_member', label: '我不是社團成員' },
]

const onboardingSchema: yup.ObjectSchema<OnboardingFormData> = yup.object({
  username: yup
    .string()
    .required('請輸入帳號名稱')
    .matches(/^[a-z0-9_]+$/, '僅能使用英文小寫、數字和底線')
    .min(3, '至少 3 個字元')
    .max(20, '最多 20 個字元'),
  displayName: yup
    .string()
    .required('請輸入顯示名稱')
    .max(20, '最多 20 個字元'),
  schoolIdentity: yup
    .mixed<SchoolIdentity>()
    .oneOf(
      schoolIdentityOptions.map((option) => option.value),
      '請選擇您的校園身分',
    )
    .required('請選擇您的校園身分'),
  clubIdentity: yup
    .mixed<ClubIdentity>()
    .oneOf(
      clubIdentityOptions.map((option) => option.value),
      '請選擇是否為社團成員',
    )
    .required('請選擇是否為社團成員'),
  studentId: yup
    .string()
    .trim()
    .max(20, '學號最多 20 個字元')
    .matches(/^[A-Za-z0-9_-]*$/, '學號僅能使用英文字母、數字、底線與連字號')
    .when('schoolIdentity', {
      is: 'current_student',
      then: (schema) => schema.required('若您是本校學生，請輸入學號'),
      otherwise: (schema) => schema.optional(),
    }),
})

export default function OnboardingClient({
  initialData,
  next,
}: OnboardingClientProps) {
  const router = useRouter()
  const { updateUserProfile } = useAuth()
  const { showToast } = useToast()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [previewImage, setPreviewImage] = useState(initialData.photoURL)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const defaultValues = useMemo(
    () => ({
      username: initialData.username,
      displayName: initialData.displayName,
      schoolIdentity: initialData.schoolIdentity,
      clubIdentity: initialData.clubIdentity,
      studentId: initialData.studentId || '',
    }),
    [initialData],
  )

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    clearErrors,
    setValue,
    formState: { errors },
  } = useForm<OnboardingFormData>({
    resolver: yupResolver(onboardingSchema),
    defaultValues,
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })

  const watchUsername = watch('username') ?? ''
  const watchDisplayName = watch('displayName') ?? ''
  const watchSchoolIdentity = watch('schoolIdentity')
  const watchClubIdentity = watch('clubIdentity')
  const watchStudentId = watch('studentId') ?? ''
  const isCurrentStudent = watchSchoolIdentity === 'current_student'

  useEffect(() => {
    if (!watchUsername) {
      clearErrors('username')
      return
    }

    const timer = setTimeout(() => {
      void trigger('username')
    }, 500)

    return () => clearTimeout(timer)
  }, [watchUsername, trigger, clearErrors])

  useEffect(() => {
    if (!watchDisplayName) {
      clearErrors('displayName')
      return
    }

    const timer = setTimeout(() => {
      void trigger('displayName')
    }, 500)

    return () => clearTimeout(timer)
  }, [watchDisplayName, trigger, clearErrors])

  useEffect(() => {
    if (watchSchoolIdentity !== 'current_student') {
      clearErrors('studentId')
      setValue('studentId', '')
    }
  }, [watchSchoolIdentity, clearErrors, setValue])

  const handleNextStep = async () => {
    const isValid = await trigger(['username', 'displayName'])
    if (!isValid) return

    setError('')
    setStep(2)
  }

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError('頭像檔案大小不能超過 5MB')
      return
    }

    if (!file.type.startsWith('image/')) {
      setError('請選擇圖片檔案')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setPreviewImage(result)
      setAvatarFile(file)
      setError('')
    }
    reader.readAsDataURL(file)
  }

  const getErrorMessage = (errorMessage: string): string => {
    if (
      errorMessage.includes('duplicate key') &&
      errorMessage.includes('username')
    ) {
      return '此帳號名稱已被使用'
    }

    if (
      errorMessage.includes('duplicate key') &&
      errorMessage.includes('student_id')
    ) {
      return '此學號已被綁定，請確認輸入是否正確'
    }

    if (errorMessage.includes('student_id') || errorMessage.includes('學號')) {
      return '此學號已被綁定，請確認輸入是否正確'
    }

    return `更新失敗: ${errorMessage}`
  }

  const onSubmit = async (data: OnboardingFormData) => {
    try {
      setIsLoading(true)
      setError('')

      let avatarUrl = initialData.photoURL
      if (avatarFile) {
        avatarUrl = await uploadUserAvatarToFirebaseStorage(
          avatarFile,
          initialData.uid,
        )
      }

      const payload: Partial<UserProfile> = {
        username: data.username.trim(),
        displayName: data.displayName.trim(),
        photoURL: avatarUrl,
        schoolIdentity: data.schoolIdentity,
        clubIdentity: data.clubIdentity,
        studentId:
          data.schoolIdentity === 'current_student'
            ? data.studentId?.trim() || null
            : null,
      }

      await updateUserProfile(initialData.uid, payload)
      showToast('資料已完成，歡迎加入！', 'success')
      router.replace(next || '/profile')
      router.refresh()
    } catch (err) {
      console.error('完成 onboarding 失敗:', err)
      setError(
        getErrorMessage((err as { message?: string })?.message || '未知錯誤'),
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {step > 1 && (
        <button
          className={styles.back_button}
          onClick={() => {
            setStep(1)
            setError('')
          }}
          disabled={isLoading}
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
      )}

      <div className={styles.stepper}>
        {[1, 2].map((currentStep) => (
          <div
            key={currentStep}
            className={`${styles.step_item} ${step >= currentStep ? styles.active : ''}`}
          >
            {currentStep > 1 && <div className={styles.step_line} />}
            <span className={styles.step_dot}>
              {step > currentStep ? (
                <FontAwesomeIcon icon={faCheck} />
              ) : (
                currentStep
              )}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        {step === 1 && (
          <div className={styles.step_content}>
            <div className={styles.avatar_section}>
              <label>頭像</label>
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
                    alt="頭像預覽"
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
              <label htmlFor="username">
                帳號名稱 <span className={styles.required}>*</span>
              </label>
              <input
                id="username"
                type="text"
                autoFocus
                {...register('username')}
                className={errors.username ? styles.error : ''}
                placeholder="例如: robot_lover"
              />
              <p className={styles.hint}>
                僅能使用英文小寫、數字和底線，將作為個人首頁網址的一部分
              </p>
              {errors.username && (
                <span className={styles.field_error}>
                  {errors.username.message}
                </span>
              )}
            </div>

            <div className={styles.form_group}>
              <label htmlFor="displayName">
                顯示名稱 <span className={styles.required}>*</span>
              </label>
              <input
                id="displayName"
                type="text"
                {...register('displayName')}
                className={errors.displayName ? styles.error : ''}
                placeholder="你想讓大家怎麼稱呼你？"
              />
              <p className={styles.hint}>最多 20 個字元</p>
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
              disabled={
                isLoading ||
                !watchUsername.trim() ||
                !watchDisplayName.trim() ||
                !!errors.username ||
                !!errors.displayName
              }
            >
              下一步 <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className={styles.step_content}>
            <p className={styles.section_hint}>
              這些資訊會用於辨識社員身分與後續課程權限設定。
            </p>

            <div className={styles.form_group}>
              <label htmlFor="schoolIdentity">
                您目前的校園身分 <span className={styles.required}>*</span>
              </label>
              <select
                id="schoolIdentity"
                autoFocus
                {...register('schoolIdentity')}
                className={errors.schoolIdentity ? styles.error : ''}
                defaultValue={defaultValues.schoolIdentity ?? ''}
              >
                <option value="" disabled>
                  請選擇您的校園身分
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
                您是否為社團成員 <span className={styles.required}>*</span>
              </label>
              <select
                id="clubIdentity"
                {...register('clubIdentity')}
                className={errors.clubIdentity ? styles.error : ''}
                defaultValue={defaultValues.clubIdentity ?? ''}
              >
                <option value="" disabled>
                  請選擇社團身分
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
                  學號 <span className={styles.required}>*</span>
                </label>
                <input
                  id="studentId"
                  type="text"
                  {...register('studentId')}
                  className={errors.studentId ? styles.error : ''}
                  placeholder="請輸入學號"
                />
                <p className={styles.hint}>
                  本校學生需提供學號以便核對社員名單
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
              {isLoading ? '處理中...' : '完成設定'}
            </button>
          </div>
        )}

        {error && <div className={styles.error_message}>{error}</div>}
      </form>
    </>
  )
}
