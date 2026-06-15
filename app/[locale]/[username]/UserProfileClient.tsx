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

// components
import FollowListModal from './FollowListModal'
import { ConfirmModal } from '@/app/components/Settings'

// actions
import { followUser, unfollowUser, fetchFollowState } from './followActions'

// icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLock, faPen } from '@fortawesome/free-solid-svg-icons'

interface FollowCounts {
  followers: number
  following: number
}

interface UserProfileClientProps {
  username: string
  initialUserProfile: SerializedUserProfile | null
  initialFollowCounts?: FollowCounts | null
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
  initialFollowCounts,
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

  // 追蹤數字
  const [followCounts, setFollowCounts] = useState<FollowCounts>(
    initialFollowCounts ?? { followers: 0, following: 0 },
  )
  // 目前登入者是否已追蹤此帳號
  const [isFollowing, setIsFollowing] = useState(false)
  // 追蹤狀態是否已載入（未載入前不顯示追蹤鈕，避免閃現錯誤狀態）
  const [followStateResolved, setFollowStateResolved] = useState(false)
  // 追蹤操作進行中
  const [followPending, setFollowPending] = useState(false)
  // 取消追蹤確認彈窗
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false)
  // 追蹤清單 Modal（null 表示關閉）
  const [listModalType, setListModalType] = useState<
    'followers' | 'following' | null
  >(null)

  const targetUid = displayUserInfo?.uid ?? null
  const viewerUid = user?.uid ?? null

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

  useEffect(() => {
    //* 已登入且非本人時，取得是否已追蹤
    if (!viewerUid || !targetUid || viewerUid === targetUid) {
      setIsFollowing(false)
      setFollowStateResolved(false)
      return
    }
    let cancelled = false
    
    // 取消在這裡 setFollowStateResolved(false)，避免已解析的狀態被重置造成按鈕閃爍
    // setFollowStateResolved(false)
    fetchFollowState(targetUid).then((state) => {
      if (cancelled) return
      setIsFollowing(state)
      setFollowStateResolved(true)
    })
    return () => {
      cancelled = true
    }
  }, [viewerUid, targetUid])

  /**
   * [Function] 執行追蹤 / 取消追蹤（optimistic 更新，失敗回滾）
   * @param nextFollowing - 目標狀態：true 追蹤、false 取消追蹤
   */
  const performFollow = async (nextFollowing: boolean) => {
    if (!targetUid || followPending) return
    setFollowPending(true)

    // optimistic
    setIsFollowing(nextFollowing)
    setFollowCounts((prev) => ({
      ...prev,
      followers: prev.followers + (nextFollowing ? 1 : -1),
    }))

    const result = nextFollowing
      ? await followUser(targetUid)
      : await unfollowUser(targetUid)

    if (!result.success) {
      // 回滾
      setIsFollowing(!nextFollowing)
      setFollowCounts((prev) => ({
        ...prev,
        followers: prev.followers + (nextFollowing ? -1 : 1),
      }))
    }
    setFollowPending(false)
  }

  /**
   * [Function] 點擊追蹤鈕：追蹤立即執行；取消追蹤先跳確認彈窗
   */
  const handleFollowClick = () => {
    if (followPending) return
    if (isFollowing) {
      setShowUnfollowConfirm(true)
    } else {
      performFollow(true)
    }
  }

  /**
   * [Function] 確認取消追蹤
   */
  const handleConfirmUnfollow = async () => {
    await performFollow(false)
    setShowUnfollowConfirm(false)
  }

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
    <>
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
          {isOwnProfile && (
            <div className={styles.own_profile_header}>
              {/* <div className={styles.badge}>
                <span>你的帳號</span>
              </div> */}
              <div></div>
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
          )}
          <div className={styles.user_info_content}>
            <div className={styles.user_info_header}>
              <div className={styles.user_info_user}>
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

              {/* 追蹤數字 + 追蹤鈕（使用者名稱及頭像右側） */}
              <div className={styles.follow_section}>
                <div className={styles.follow_stats}>
                  <button
                    type="button"
                    className={styles.follow_stat}
                    onClick={() => setListModalType('followers')}
                  >
                    <strong>{followCounts.followers}</strong>
                    <span>追蹤者</span>
                  </button>
                  <button
                    type="button"
                    className={styles.follow_stat}
                    onClick={() => setListModalType('following')}
                  >
                    <strong>{followCounts.following}</strong>
                    <span>追蹤中</span>
                  </button>
                </div>
                {user && !isOwnProfile && followStateResolved && (
                  <button
                    type="button"
                    className={`${styles.follow_button} ${isFollowing ? styles.following : ''}`}
                    onClick={handleFollowClick}
                    disabled={followPending}
                  >
                    {isFollowing ? '已追蹤' : '追蹤'}
                  </button>
                )}
              </div>
            </div>
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
      {displayUserInfo.bio && (
        <div className={styles.user_info_bio_container}>
          <div className={styles.user_info_bio_header}>
            <h2>簡介</h2>
          </div>
          <div className={styles.user_info_bio}>
            {displayUserInfo.bio
              .split('\n')
              .map((line) => line.trim())
              .filter((line) => line.length > 0)
              .map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
          </div>
        </div>
      )}

      {/* 追蹤者 / 追蹤中清單 Modal */}
      {targetUid && (
        <FollowListModal
          isOpen={listModalType !== null}
          onClose={() => setListModalType(null)}
          targetUid={targetUid}
          type={listModalType ?? 'followers'}
        />
      )}

      {/* 取消追蹤 二次確認 Modal */}
      <ConfirmModal
        open={showUnfollowConfirm}
        title="取消追蹤"
        description={`確定要取消追蹤 @${displayUserInfo.username} 嗎？`}
        confirmLabel={followPending ? '處理中…' : '取消追蹤'}
        cancelLabel="返回"
        onConfirm={handleConfirmUnfollow}
        onClose={() => {
          if (!followPending) setShowUnfollowConfirm(false)
        }}
        loading={followPending}
      />
    </>
  )
}
