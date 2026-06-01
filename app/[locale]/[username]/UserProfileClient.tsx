'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from '@/i18n/navigation'
import styles from './User.module.scss'

// context
import { useAuth } from '@/app/contexts/AuthContext'

// types
import { UserProfile } from '@/app/types/user'
import {
  SerializedUserProfile,
  deserializeUserProfile,
} from '@/app/types/serialized'

// icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLock, faPen } from '@fortawesome/free-solid-svg-icons'

interface UserProfileClientProps {
  username: string
  initialUserProfile: SerializedUserProfile | null
  isPrivate?: boolean
}

/**
 * [Component] 使用者資訊頁面 Client 端
 * @param username - 使用者名稱
 * @param initialUserProfile - 初始化使用者資料
 * @param isPrivate - 是否為私人帳號
 * @returns JSX.Element
 */
export default function UserProfileClient({
  username,
  initialUserProfile,
  isPrivate = false,
}: UserProfileClientProps) {
  // AuthContext
  const { user, signOut } = useAuth()
  // Router
  const router = useRouter()
  // 顯示使用者資訊
  const [displayUserInfo, setDisplayUserInfo] = useState<UserProfile | null>(
    initialUserProfile ? deserializeUserProfile(initialUserProfile) : null,
  )
  // 是否為登入者本人的資料
  const [isOwnProfile, setIsOwnProfile] = useState(false)

  useEffect(() => {
    //* 檢查是否為登入者本人的資料
    if (user && user.username === username) {
      setDisplayUserInfo(user)
      setIsOwnProfile(true)
    } else {
      const deserializedProfile = initialUserProfile
        ? deserializeUserProfile(initialUserProfile)
        : null
      setDisplayUserInfo(deserializedProfile)
      setIsOwnProfile(false)
    }
  }, [user, username, initialUserProfile])

  /**
   * [Function] 編輯個人資料
   * @returns void
   */
  const handleEditProfile = () => {
    router.push(`/@${username}/edit`)
  }

  /**
   * [Function] 登出
   * @returns void
   */
  const handleLogout = () => {
    signOut()
    router.push('/')
  }

  // 帳號隱藏（非本人瀏覽）
  if (isPrivate && !isOwnProfile) {
    return (
      <div className={`page-container ${styles.user_private}`}>
        <div className={styles['user-private-content']}>
          <FontAwesomeIcon icon={faLock} size="2x" />
          <p>@{username} 已將帳號設為不公開</p>
        </div>
      </div>
    )
  }

  // 找不到使用者（理論上由 notFound() 攔截，此為安全後備）
  if (!displayUserInfo) {
    return (
      <div className={`page-container`}>
        <div className={styles['user-not-found']}>
          <h2>使用者不存在</h2>
          <p>找不到使用者名稱為 @{username} 的使用者</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`${styles.user_info} ${isOwnProfile && styles.own_profile} ${displayUserInfo.backgroundURL && styles.has_background}`}
    >
      {displayUserInfo.backgroundURL && (
        <div className={styles.background}>
          <Image
            src={displayUserInfo.backgroundURL}
            alt={displayUserInfo.displayName}
            fill
            className={styles.background_image}
          />
        </div>
      )}
      <div className={styles.user_info_container}>
        {isOwnProfile ? (
          <div className={styles.own_profile_header}>
            <div className={styles.badge}>
              <span>你的帳號</span>
            </div>
            {isOwnProfile && (
              <div className={styles.actions}>
                <div className={styles.edit_profile}>
                  <button onClick={handleEditProfile}>
                    <FontAwesomeIcon icon={faPen} />
                    <span>編輯</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div></div>
        )}
        <div className={styles.user_info_content}>
          <div className={styles.user_info_header}>
            <div className={styles.user_info_header_avatar}>
              <Image
                src={displayUserInfo.photoURL}
                alt={displayUserInfo.displayName}
                width={60}
                height={60}
                priority
              />
            </div>
            <div className={styles.user_info_content}>
              <div className={styles.user_info_name}>
                {displayUserInfo.displayName}
              </div>
              <div className={styles.user_info_username}>
                @{displayUserInfo.username}
              </div>
            </div>
          </div>
          {displayUserInfo.bio && (
            <div className={styles.user_info_bio}>
              <p>{displayUserInfo.bio}</p>
            </div>
          )}
        </div>
      </div>

      <div
        className={styles.gradient_blur}
      >
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div className={styles.gradient_background}></div>
      </div>
    </div>
  )
}
