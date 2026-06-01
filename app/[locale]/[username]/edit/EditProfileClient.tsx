'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useLocale } from 'next-intl'
import { useRouter, getPathname } from '@/i18n/navigation'
import styles from './EditProfile.module.scss'

// third-party utils
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'

// utils
import { createClient } from '@/app/utils/supabase/client'
import {
  uploadUserAvatarToFirebaseStorage,
  uploadUserBackgroundToFirebaseStorage,
  deleteImageFromFirebaseStorage,
} from '@/app/utils/firebaseService'
import {
  checkStudentIdAvailable,
  checkUsernameAvailable,
} from '@/app/utils/userService'

// context
import { useAuth } from '@/app/contexts/AuthContext'

// icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faCheck,
  faSpinner,
  faTrash,
} from '@fortawesome/free-solid-svg-icons'
import useStickyDetection from '@/app/hooks/useStickyDetection'
import { useHeaderState } from '@/app/contexts/HeaderContext'

import { ClubIdentity, SchoolIdentity, UserProfile } from '@/app/types/user'

interface EditProfileFormData {
  username: string // 帳號名稱
  displayName: string // 顯示名稱
  bio: string // 個人簡介
  isPublic: boolean // 是否公開帳號
  schoolIdentity: SchoolIdentity // 校園身分
  clubIdentity: ClubIdentity // 是否為社團成員
  studentId: string // 學號
}

interface EditProfileClientProps {
  uid: string // 使用者 ID
  initialData: {
    username: string // 帳號名稱
    displayName: string // 顯示名稱
    bio: string // 個人簡介
    isPublic: boolean // 是否公開帳號
    photoURL: string // 頭像 URL
    backgroundURL: string | null // 背景 URL
    schoolIdentity: SchoolIdentity // 校園身分
    clubIdentity: ClubIdentity // 是否為社團成員
    studentId: string // 學號
  }
}

/**
 * [Schema] 編輯個人資料表單驗證規則
 * @returns yup.ObjectSchema<EditProfileFormData>
 */
const editProfileSchema = yup.object({
  username: yup
    .string()
    .required('請輸入帳號名稱')
    .min(3, '帳號名稱至少 3 個字元')
    .max(30, '帳號名稱不可超過 30 個字元')
    .matches(/^[a-zA-Z0-9_-]+$/, '帳號名稱只能包含英文、數字、底線及連字號'),
  displayName: yup
    .string()
    .required('請輸入顯示名稱')
    .min(1, '顯示名稱不可為空')
    .max(50, '顯示名稱不可超過 50 個字元'),
  bio: yup.string().max(160, '個人簡介不可超過 160 個字元').default(''),
  isPublic: yup.boolean().default(true),
  schoolIdentity: yup.string().required('請選擇校園身分'),
  clubIdentity: yup.string().required('請選擇是否為社團成員'),
  studentId: yup.string().when('schoolIdentity', {
    is: 'current_student',
    then: (schema) => schema.required('本校學生需填寫學號'),
    otherwise: (schema) => schema.optional(),
  }),
})

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

/**
 * 壓縮並裁剪背景圖片至最大 2160x1080（強制 2:1 比例）
 * @param file - 原始圖片檔案
 * @param imgSize - 原始圖片尺寸
 * @param cropOffset - 裁剪偏移（0~1，0.5 = 置中）
 */
async function compressAndCropBackground(
  file: File,
  imgSize: { w: number; h: number },
  cropOffset: { x: number; y: number },
): Promise<File> {
  const MAX_W = 2160
  const MAX_H = 1080
  const TARGET_ASPECT = MAX_W / MAX_H
  const { w: iW, h: iH } = imgSize
  const imgAspect = iW / iH

  // 設定裁剪偏移
  let srcX = 0,
    srcY = 0,
    srcW = iW,
    srcH = iH

  if (imgAspect > TARGET_ASPECT) {
    // 圖片比 2:1 更寬 → 水平裁剪
    srcH = iH
    srcW = Math.round(iH * TARGET_ASPECT)
    srcX = Math.round(cropOffset.x * (iW - srcW))
    srcY = 0
  } else if (imgAspect < TARGET_ASPECT) {
    // 圖片比 2:1 更高 → 垂直裁剪
    srcW = iW
    srcH = Math.round(iW / TARGET_ASPECT)
    srcX = 0
    srcY = Math.round(cropOffset.y * (iH - srcH))
  }

  let outW = srcW
  let outH = srcH
  if (outW > MAX_W || outH > MAX_H) {
    const scale = Math.min(MAX_W / outW, MAX_H / outH)
    outW = Math.round(outW * scale)
    outH = Math.round(outH * scale)
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new window.Image()
    img.onload = () => {
      try {
        // 創建畫布
        const canvas = document.createElement('canvas')
        canvas.width = outW
        canvas.height = outH
        // 獲取畫布上下文
        const ctx = canvas.getContext('2d')
        // 如果畫布上下文不存在，則拋出錯誤
        if (!ctx) throw new Error('Canvas context unavailable')
        // 繪製圖片
        ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outW, outH)
        // 將畫布轉換為 Blob
        canvas.toBlob(
          (blob) => {
            // 釋放圖片物件 URL
            URL.revokeObjectURL(url)
            // 如果 Blob 不存在，則拋出錯誤
            if (!blob) {
              reject(new Error('圖片壓縮失敗'))
              return
            }
            // 生成新的 File 物件
            const baseName = file.name.replace(/\.[^.]+$/, '')
            // 解析為 File 物件
            resolve(new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' }))
          },
          'image/jpeg',
          0.92, // 壓縮品質
        )
      } catch (err) {
        // 釋放圖片物件 URL
        URL.revokeObjectURL(url)
        // 拋出錯誤
        reject(err)
      }
    }
    // 如果圖片讀取失敗，則釋放圖片物件 URL，並拋出錯誤
    img.onerror = () => {
      // 釋放圖片物件 URL
      URL.revokeObjectURL(url)
      // 拋出錯誤
      reject(new Error('圖片讀取失敗'))
    }
    // 設定圖片源
    img.src = url
  })
}

/**
 * [Component] 編輯個人資料 Client 端
 * @param uid - 使用者 ID
 * @param initialData - 初始化資料
 * @returns JSX.Element
 */
export default function EditProfileClient({
  uid,
  initialData,
}: EditProfileClientProps) {
  // Router
  const router = useRouter()
  // 目前語系（供 locale-aware 硬導航使用）
  const locale = useLocale()
  // AuthContext
  const { getUserProfile } = useAuth()
  // Header Compact State
  const { isCompactHeader } = useHeaderState()
  // Sticky Detection
  const stickyState = useStickyDetection({
    topOffset: 60,
    enabled: true,
  })

  //* 表單
  // 是否正在提交
  const [isSubmitting, setIsSubmitting] = useState(false)
  // 提交錯誤訊息
  const [submitError, setSubmitError] = useState('')
  // 提交成功訊息
  const [submitSuccess, setSubmitSuccess] = useState(false)

  //* 個人頭像
  // 頭像檔案
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  // 頭像預覽
  const [avatarPreview, setAvatarPreview] = useState(initialData.photoURL)
  // 頭像輸入 ref
  const avatarInputRef = useRef<HTMLInputElement>(null)
  // 頭像物件 URL ref
  const avatarObjectUrlRef = useRef<string | null>(null)

  //* 個人首頁背景
  // 個人首頁背景檔案
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null)
  // 個人首頁背景預覽
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(
    initialData.backgroundURL,
  )
  // 是否移除個人首頁背景
  const [isBackgroundRemoved, setIsBackgroundRemoved] = useState(false)
  // 個人首頁背景輸入 ref
  const backgroundInputRef = useRef<HTMLInputElement>(null)
  // 個人首頁背景物件 URL ref
  const backgroundObjectUrlRef = useRef<string | null>(null)
  // 個人首頁背景圖片原始尺寸
  const [backgroundImgSize, setBackgroundImgSize] = useState<{
    w: number
    h: number
  } | null>(null)
  // 個人首頁背景裁剪偏移（0~1，0.5 = 置中）
  const [backgroundCropOffset, setBackgroundCropOffset] = useState({
    x: 0.5,
    y: 0.5,
  })
  // 個人首頁背景預覽拖動狀態
  const [isDraggingBg, setIsDraggingBg] = useState(false)
  // 拖動起始參考
  const bgDragStartRef = useRef<{
    mouseX: number
    mouseY: number
    offsetX: number
    offsetY: number
  } | null>(null)

  //* 帳號名稱
  // 帳號名稱即時可用性檢查
  const [usernameStatus, setUsernameStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'unchanged'
  >('unchanged')

  //* 學號
  // 學號即時可用性檢查
  const [studentIdStatus, setStudentIdStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'unchanged'
  >('unchanged')

  // 表單資料
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EditProfileFormData>({
    resolver: yupResolver(editProfileSchema) as never,
    defaultValues: {
      username: initialData.username,
      displayName: initialData.displayName,
      bio: initialData.bio,
      isPublic: initialData.isPublic,
      schoolIdentity: initialData.schoolIdentity,
      clubIdentity: initialData.clubIdentity,
      studentId: initialData.studentId || '',
    },
  })

  // 帳號名稱變化
  const watchedUsername = watch('username')
  // 校園身分變化
  const watchedSchoolIdentity = watch('schoolIdentity')
  // 公開帳號變化
  const watchedIsPublic = watch('isPublic')
  // 個人簡介變化
  const watchedBio = watch('bio')
  // 學號變化
  const watchedStudentId = watch('studentId')

  /**
   * [Effect] 監聽帳號名稱變化進行可用性檢查 (帶有 Debounce)
   */
  useEffect(() => {
    if (watchedUsername === initialData.username) {
      setUsernameStatus('unchanged')
      return
    }
    if (!watchedUsername || watchedUsername.length < 3) {
      setUsernameStatus('idle')
      return
    }

    setUsernameStatus('checking')
    const timer = setTimeout(async () => {
      const isAvailable = await checkUsernameAvailable(watchedUsername, uid)
      setUsernameStatus(isAvailable ? 'available' : 'taken')
    }, 1500) // 600ms 延遲

    return () => clearTimeout(timer)
  }, [watchedUsername, initialData.username, uid])

  /**
   * [Effect] 監聽學號變化進行可用性檢查 (帶有 Debounce)
   */
  useEffect(() => {
    // 只有本校學生才需要檢查學號
    if (watchedSchoolIdentity !== 'current_student') {
      setStudentIdStatus('unchanged')
      return
    }

    const trimmedId = watchedStudentId?.trim()
    if (trimmedId === initialData.studentId) {
      setStudentIdStatus('unchanged')
      return
    }
    if (!trimmedId) {
      setStudentIdStatus('idle')
      return
    }

    setStudentIdStatus('checking')
    const timer = setTimeout(async () => {
      const isAvailable = await checkStudentIdAvailable(trimmedId, uid)
      setStudentIdStatus(isAvailable ? 'available' : 'taken')
    }, 1000) // 600ms 延遲

    return () => clearTimeout(timer)
  }, [watchedStudentId, watchedSchoolIdentity, initialData.studentId, uid])

  /**
   * [Function] 提交表單
   * @param data - 表單資料
   * @returns
   */
  const onSubmit = async (data: EditProfileFormData) => {
    // 如果帳號名稱或學號已被使用，則返回
    if (usernameStatus === 'taken') {
      setSubmitError('此帳號名稱已被使用')
      return
    }
    if (studentIdStatus === 'taken') {
      setSubmitError('此學號已被其他使用者綁定')
      return
    }

    // 嘗試提交表單
    try {
      // 設定為提交中
      setIsSubmitting(true)
      // 清空錯誤訊息
      setSubmitError('')

      // 並行準備背景（壓縮）與上傳頭像，節省等待時間
      const backgroundProcessPromise =
        backgroundFile && backgroundImgSize
          ? compressAndCropBackground(
              backgroundFile,
              backgroundImgSize,
              backgroundCropOffset,
            ).then((processed) =>
              uploadUserBackgroundToFirebaseStorage(processed, uid),
            )
          : Promise.resolve(null)

      const avatarUploadPromise = avatarFile
        ? uploadUserAvatarToFirebaseStorage(avatarFile, uid)
        : Promise.resolve(null)

      const [uploadedAvatarUrl, uploadedBackgroundUrl] = await Promise.all([
        avatarUploadPromise,
        backgroundProcessPromise,
      ])

      // 構建更新資料
      const payload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
        display_name: data.displayName,
        bio: data.bio,
        is_public: data.isPublic,
        school_identity: data.schoolIdentity,
        club_identity: data.clubIdentity,
        student_id: data.studentId?.trim() || null,
      }

      // 如果頭像已上傳，則設定頭像 URL
      if (uploadedAvatarUrl) {
        payload.avatar_url = uploadedAvatarUrl
      }

      // 如果背景已上傳或已移除，則設定背景 URL
      if (uploadedBackgroundUrl) {
        payload.background_url = uploadedBackgroundUrl
      } else if (isBackgroundRemoved) {
        payload.background_url = null
      }

      // 如果帳號名稱已變化，則設定帳號名稱
      if (data.username !== initialData.username) {
        payload.username = data.username
      }

      // 更新使用者資料
      const supabase = createClient()
      const { error } = await supabase
        .from('users')
        .update(payload)
        .eq('id', uid)

      // 如果更新失敗，則拋出錯誤
      if (error) throw error

      // 重新獲取使用者資料
      await getUserProfile(uid)

      // 清除舊圖片：在 Supabase 已更新、使用者資料已刷新後非同步執行，不阻塞 UI
      if (
        uploadedAvatarUrl &&
        initialData.photoURL &&
        initialData.photoURL !== uploadedAvatarUrl
      ) {
        deleteImageFromFirebaseStorage(initialData.photoURL).catch(
          console.error,
        )
      }
      if (
        initialData.backgroundURL &&
        (uploadedBackgroundUrl || isBackgroundRemoved) &&
        initialData.backgroundURL !== uploadedBackgroundUrl
      ) {
        deleteImageFromFirebaseStorage(initialData.backgroundURL).catch(
          console.error,
        )
      }

      // 設定為提交成功
      setSubmitSuccess(true)

      // 延遲跳轉，使用完整頁面導航以確保 Next.js router cache 不會顯示舊資料
      setTimeout(() => {
        window.location.href = getPathname({ href: '/profile', locale })
      }, 500)
    } catch (err) {
      console.error('更新個人資料失敗:', err)
      const errorMsg = (err as { message?: string })?.message || ''
      if (errorMsg.includes('users_username_key')) {
        setSubmitError('此帳號名稱已被使用')
      } else if (errorMsg.includes('users_student_id_key')) {
        setSubmitError('此學號已被其他使用者綁定')
      } else {
        setSubmitError(errorMsg || '更新失敗，請稍後再試')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  /**
   * [Function] 選擇頭像
   * @param event - 事件
   * @returns void
   */
  const handleAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    // 獲取檔案
    const file = event.target.files?.[0]
    // 如果檔案不存在，則返回
    if (!file) return

    // 如果檔案大小超過 5MB，則設定錯誤訊息
    if (file.size > 5 * 1024 * 1024) {
      setSubmitError('頭像檔案大小不能超過 5MB')
      return
    }

    // 如果檔案類型不是圖片，則設定錯誤訊息
    if (!file.type.startsWith('image/')) {
      setSubmitError('請選擇圖片檔案')
      return
    }

    // 清空錯誤訊息
    setSubmitError('')
    // 設定頭像檔案
    setAvatarFile(file)
    // 如果頭像物件 URL 存在，則刪除
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current)
    }
    // 創建頭像物件 URL
    const objectUrl = URL.createObjectURL(file)
    // 設定頭像物件 URL
    avatarObjectUrlRef.current = objectUrl
    // 設定頭像預覽
    setAvatarPreview(objectUrl)
  }

  /**
   * [Effect] 清除頭像與背景物件 URL
   * @returns void
   */
  useEffect(() => {
    return () => {
      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current)
      }
      if (backgroundObjectUrlRef.current) {
        URL.revokeObjectURL(backgroundObjectUrlRef.current)
      }
    }
  }, [])

  /**
   * [Function] 選擇背景（僅檢查大小，分辨率於儲存時自動壓縮）
   * @param event - 事件
   * @returns void
   */
  const handleBackgroundSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    // 獲取檔案
    const file = event.target.files?.[0]
    // 如果檔案不存在，則返回
    if (!file) return

    // 如果檔案大小超過 10MB，則設定錯誤訊息
    if (file.size > 10 * 1024 * 1024) {
      setSubmitError('背景圖片大小不能超過 10MB')
      return
    }

    // 如果檔案類型不是圖片，則設定錯誤訊息
    if (!file.type.startsWith('image/')) {
      setSubmitError('請選擇圖片檔案')
      return
    }

    setSubmitError('')

    // 創建個人首頁背景物件 URL
    const objectUrl = URL.createObjectURL(file)
    // 創建圖片物件
    const img = new window.Image()
    // 如果圖片讀取成功，則設定圖片尺寸
    img.onload = () => {
      // 設定圖片尺寸
      setBackgroundImgSize({ w: img.naturalWidth, h: img.naturalHeight })
      // 設定裁剪偏移
      setBackgroundCropOffset({ x: 0.5, y: 0.5 })
      // 設定個人首頁背景檔案
      setBackgroundFile(file)
      // 設定是否移除個人首頁背景
      setIsBackgroundRemoved(false)
      // 如果個人首頁背景物件 URL 存在，則刪除
      if (backgroundObjectUrlRef.current) {
        // 釋放個人首頁背景物件 URL
        URL.revokeObjectURL(backgroundObjectUrlRef.current)
      }
      // 設定個人首頁背景物件 URL
      backgroundObjectUrlRef.current = objectUrl
      // 設定個人首頁背景預覽
      setBackgroundPreview(objectUrl)
    }
    // 如果圖片讀取失敗，則設定錯誤訊息，並釋放個人首頁背景物件 URL
    img.onerror = () => {
      setSubmitError('圖片讀取失敗')
      URL.revokeObjectURL(objectUrl)
    }
    // 設定圖片源
    img.src = objectUrl
  }

  /**
   * [Function] 背景預覽拖動開始
   */
  const handleBgPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // 如果個人首頁背景檔案不存在，或個人首頁背景圖片尺寸不存在，則返回
    if (!backgroundFile || !backgroundImgSize) return
    // 設定指標捕獲
    e.currentTarget.setPointerCapture(e.pointerId)
    // 設定個人首頁背景預覽拖動狀態
    setIsDraggingBg(true)
    // 設定個人首頁背景預覽拖動開始
    bgDragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      offsetX: backgroundCropOffset.x,
      offsetY: backgroundCropOffset.y,
    }
  }

  /**
   * [Function] 背景預覽拖動中（計算新裁剪偏移）
   */
  const handleBgPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!bgDragStartRef.current || !backgroundImgSize) return

    const rect = e.currentTarget.getBoundingClientRect()
    const cW = rect.width
    const cH = rect.height
    const scale = Math.max(cW / backgroundImgSize.w, cH / backgroundImgSize.h)
    const overflowX = backgroundImgSize.w * scale - cW
    const overflowY = backgroundImgSize.h * scale - cH

    const dx = e.clientX - bgDragStartRef.current.mouseX
    const dy = e.clientY - bgDragStartRef.current.mouseY

    let newX = bgDragStartRef.current.offsetX
    let newY = bgDragStartRef.current.offsetY

    if (overflowX > 1) {
      newX = Math.max(
        0,
        Math.min(1, bgDragStartRef.current.offsetX - dx / overflowX),
      )
    }
    if (overflowY > 1) {
      newY = Math.max(
        0,
        Math.min(1, bgDragStartRef.current.offsetY - dy / overflowY),
      )
    }

    setBackgroundCropOffset({ x: newX, y: newY })
  }

  /**
   * [Function] 背景預覽拖動結束
   */
  const handleBgPointerUp = () => {
    setIsDraggingBg(false)
    bgDragStartRef.current = null
  }

  /**
   * [Function] 移除背景
   */
  const handleRemoveBackground = () => {
    setBackgroundFile(null)
    setBackgroundPreview(null)
    setIsBackgroundRemoved(true)
    setBackgroundImgSize(null)
    setBackgroundCropOffset({ x: 0.5, y: 0.5 })
    setIsDraggingBg(false)
    bgDragStartRef.current = null
    if (backgroundInputRef.current) {
      backgroundInputRef.current.value = ''
    }
  }

  return (
    <div className={`page ${styles.edit_profile_page}`}>
      <div className={`page-container ${styles.edit_profile_container}`}>
        <div
          ref={stickyState.ref}
          className={`${styles.page_header} ${isCompactHeader ? styles.is_compact : ''} ${stickyState.isSticky ? styles.sticky : ''}`}
        >
          <button
            className={styles.back_button}
            onClick={() => router.push(`/@${initialData.username}`)}
            type="button"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <h1>編輯個人資料</h1>
        </div>

        {submitError && (
          <div className={styles.error_message}>{submitError}</div>
        )}

        {submitSuccess && (
          <div className={styles.success_message}>
            <FontAwesomeIcon icon={faCheck} />
            儲存成功，正在跳轉...
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.background_section}>
            <label>個人首頁背景</label>
            <div className={styles.background_upload}>
              {backgroundPreview ? (
                <div
                  className={`${styles.background_preview_wrapper} ${backgroundFile ? (isDraggingBg ? styles.background_dragging : styles.background_draggable) : ''}`}
                  style={
                    backgroundFile
                      ? {
                          backgroundImage: `url(${backgroundPreview})`,
                          backgroundPosition: `${backgroundCropOffset.x * 100}% ${backgroundCropOffset.y * 100}%`,
                          backgroundSize: 'cover',
                          backgroundRepeat: 'no-repeat',
                        }
                      : undefined
                  }
                  onPointerDown={handleBgPointerDown}
                  onPointerMove={handleBgPointerMove}
                  onPointerUp={handleBgPointerUp}
                  onPointerCancel={handleBgPointerUp}
                >
                  {backgroundFile ? (
                    <div
                      className={`${styles.background_drag_hint} ${isDraggingBg ? styles.background_drag_hint_hidden : ''}`}
                    >
                      <span>拖動以調整裁剪位置</span>
                    </div>
                  ) : (
                    <Image
                      src={backgroundPreview}
                      alt="背景預覽"
                      fill
                      className={styles.background_image}
                    />
                  )}
                </div>
              ) : (
                <div className={styles.background_empty}>
                  <span>暫無背景圖片</span>
                </div>
              )}
              <div className={styles.background_actions}>
                <button
                  type="button"
                  className={styles.avatar_button}
                  onClick={() => backgroundInputRef.current?.click()}
                >
                  更換背景
                </button>
                {(backgroundPreview ||
                  (initialData.backgroundURL && !isBackgroundRemoved)) && (
                  <button
                    type="button"
                    className={styles.remove_background_button}
                    onClick={handleRemoveBackground}
                  >
                    <FontAwesomeIcon icon={faTrash} /> 移除背景
                  </button>
                )}
              </div>
              <input
                ref={backgroundInputRef}
                type="file"
                accept="image/*"
                className={styles.file_input}
                onChange={handleBackgroundSelect}
              />
            </div>
            {/* <span className={styles.label_hint}>
              上傳後將自動裁剪為 2:1 並壓縮至最大 2160×1080，檔案大小 &lt;
              10MB。
            </span> */}
          </div>

          <div className={styles.avatar_section}>
            <label>個人頭像</label>
            <div className={styles.avatar_upload}>
              <div className={styles.avatar_preview}>
                <Image
                  src={avatarPreview || '/assets/image/userEmptyAvatar.png'}
                  alt="頭像預覽"
                  width={80}
                  height={80}
                  className={styles.avatar_image}
                />
              </div>
              <button
                type="button"
                className={styles.avatar_button}
                onClick={() => avatarInputRef.current?.click()}
              >
                更換頭像
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className={styles.file_input}
                onChange={handleAvatarSelect}
              />
            </div>
          </div>

          {/* 顯示名稱 */}
          <div className={styles.form_group}>
            <label htmlFor="displayName">顯示名稱</label>
            <input
              id="displayName"
              type="text"
              placeholder="你的顯示名稱"
              className={errors.displayName ? styles.input_error : ''}
              {...register('displayName')}
            />
            {errors.displayName && (
              <span className={styles.field_error}>
                {errors.displayName.message}
              </span>
            )}
          </div>

          {/* 帳號名稱 */}
          <div className={styles.form_group}>
            <label htmlFor="username">
              帳號名稱
              <span className={styles.label_hint}>（用於個人頁面網址）</span>
            </label>
            <div className={styles.username_input_wrapper}>
              <span className={styles.username_prefix}>@</span>
              <input
                id="username"
                type="text"
                placeholder="username"
                className={`${styles.username_input} ${errors.username ? styles.input_error : ''}`}
                {...register('username')}
              />
              {usernameStatus === 'checking' && (
                <span className={styles.username_status_icon}>
                  <FontAwesomeIcon icon={faSpinner} spin />
                </span>
              )}
              {usernameStatus === 'available' && (
                <span
                  className={`${styles.username_status_icon} ${styles.available}`}
                >
                  <FontAwesomeIcon icon={faCheck} />
                </span>
              )}
            </div>
            {errors.username && (
              <span className={styles.field_error}>
                {errors.username.message}
              </span>
            )}
            {usernameStatus === 'taken' && !errors.username && (
              <span className={styles.field_error}>此帳號名稱已被使用</span>
            )}
          </div>

          {/* 個人簡介 */}
          <div className={styles.form_group}>
            <label htmlFor="bio">
              個人簡介
              <span className={styles.char_count}>
                {(watchedBio ?? '').length} / 160
              </span>
            </label>
            <textarea
              id="bio"
              rows={3}
              placeholder="介紹一下自己吧..."
              className={errors.bio ? styles.input_error : ''}
              {...register('bio')}
            />
            {errors.bio && (
              <span className={styles.field_error}>{errors.bio.message}</span>
            )}
          </div>

          {/* 身分與校園資訊區塊 */}
          <div className={styles.identity_section}>
            <h2 className={styles.section_title}>身分與校園資訊</h2>

            <div className={styles.form_group}>
              <label htmlFor="schoolIdentity">校園身分</label>
              <select
                id="schoolIdentity"
                className={errors.schoolIdentity ? styles.input_error : ''}
                {...register('schoolIdentity')}
              >
                <option value="" disabled>
                  請選擇校園身分
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

            {watchedSchoolIdentity === 'current_student' && (
              <div className={styles.form_group}>
                <label htmlFor="studentId">
                  學號<span className={styles.required}>*</span>
                </label>
                <div className={styles.student_id_input_wrapper}>
                  <input
                    id="studentId"
                    type="text"
                    placeholder="請輸入學號"
                    className={`${styles.student_id_input} ${errors.studentId || studentIdStatus === 'taken' ? styles.input_error : ''}`}
                    {...register('studentId')}
                  />
                  {studentIdStatus === 'checking' && (
                    <span className={styles.status_icon}>
                      <FontAwesomeIcon icon={faSpinner} spin />
                    </span>
                  )}
                  {studentIdStatus === 'available' && (
                    <span
                      className={`${styles.status_icon} ${styles.available}`}
                    >
                      <FontAwesomeIcon icon={faCheck} />
                    </span>
                  )}
                </div>
                {errors.studentId && (
                  <span className={styles.field_error}>
                    {errors.studentId.message}
                  </span>
                )}
                {studentIdStatus === 'taken' && !errors.studentId && (
                  <span className={styles.field_error}>
                    此學號已被其他使用者綁定
                  </span>
                )}
              </div>
            )}

            <div className={styles.form_group}>
              <label htmlFor="clubIdentity">是否為社團成員</label>
              <select
                id="clubIdentity"
                className={errors.clubIdentity ? styles.input_error : ''}
                {...register('clubIdentity')}
              >
                <option value="" disabled>
                  請選擇身分
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
          </div>

          {/* 公開帳號 toggle */}
          <div className={styles.form_group}>
            <div className={styles.toggle_row}>
              <div className={styles.toggle_label}>
                <span>公開帳號</span>
                <span className={styles.toggle_description}>
                  {watchedIsPublic
                    ? '所有人都可以瀏覽你的個人頁面'
                    : '僅自己可見，其他人無法查看'}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={watchedIsPublic}
                className={`${styles.toggle} ${watchedIsPublic ? styles.toggle_on : ''}`}
                onClick={() =>
                  setValue('isPublic', !watchedIsPublic, { shouldDirty: true })
                }
              >
                <span className={styles.toggle_thumb} />
              </button>
            </div>
          </div>

          <div className={styles.form_actions}>
            <button
              type="button"
              className={styles.cancel_button}
              onClick={() => router.push(`/@${initialData.username}`)}
            >
              取消
            </button>
            <button
              type="submit"
              className={styles.submit_button}
              disabled={
                isSubmitting ||
                submitSuccess ||
                usernameStatus === 'taken' ||
                usernameStatus === 'checking' ||
                studentIdStatus === 'taken' ||
                studentIdStatus === 'checking'
              }
            >
              {isSubmitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin />
                  儲存中...
                </>
              ) : (
                '儲存變更'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
