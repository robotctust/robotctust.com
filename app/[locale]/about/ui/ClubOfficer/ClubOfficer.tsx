import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import styles from './ClubOfficer.module.scss'
import type { ClubOfficer as ClubOfficerType } from './club-officers'

// utils
import { getUserProfileByUidServer } from '@/app/utils/userServiceServer'

/**
 * [Component] 社團幹部項目元件
 * @param clubOfficer - 社團幹部資料
 * @returns JSX.Element
 */
async function ClubOfficerItem({ clubOfficer }: { clubOfficer: ClubOfficerType }) {
  // 取得使用者頭像
  let avatarUrl = '/assets/image/userEmptyAvatar.png' // 預設頭像
  let username = ''
  if (clubOfficer.userId) {
    try {
      // 取得使用者資料
      const userProfile = await getUserProfileByUidServer(
        clubOfficer.userId,
      )
      // 如果使用者頭像存在，則設定頭像 URL
      if (userProfile?.photoURL) {
        avatarUrl = userProfile.photoURL
      }
      username = userProfile?.username || ''
    } catch (error) {
      console.error('獲取使用者頭像時發生錯誤:', error)
    }
  }

  /**
   * [Component] 社團幹部項目連結元件
   * @param children - 子元件
   * @returns JSX.Element
   */
  const ClubOfficerItemLink = ({ children }: { children: React.ReactNode }) => {
    // 如果帳號名稱存在，則設定連結
    if (username) {
      return (
        <Link
          href={`/@${username}`}
          className={`${styles.clubOfficerItem} ${styles.clubOfficerItemLink}`}
        >
          {children}
        </Link>
      )
    } else {
      return <div className={styles.clubOfficerItem}>{children}</div>
    }
  }

  return (
    <ClubOfficerItemLink>
      <div className={styles.clubOfficerItemImage}>
        <Image
          src={avatarUrl}
          alt={`${clubOfficer.name} 的頭像`}
          height={240}
          width={240}
        />
      </div>
      <div className={styles.clubOfficerInfo}>
        <div className={styles.clubOfficerItemName}>
          <h1>{clubOfficer.name}</h1>
          {username && (
            <p className={styles.clubOfficerItemUsername}>
              @{username}
            </p>
          )}
        </div>
        <div className={styles.clubOfficerItemPosition}>
          <p>{clubOfficer.position}</p>
        </div>
      </div>
    </ClubOfficerItemLink>
  )
}

/**
 * 社團幹部列表
 */
export default function ClubOfficer() {
  const clubOfficers: ClubOfficerType[] = [
    {
      name: '藍世錡',
      position: '社長',
      description: '社長',
      userId: 'ba387c98-30d1-49aa-b4e5-fa21aeca1cd0'
    },
    {
      name: '趙泰齡',
      position: '副社長',
      description: '副社長',
      userId: '3e14215c-dade-41fa-b724-9045b3da7256'
    },
    {
      name: '王朝育',
      position: '活動',
      description: '活動',
      userId: '86de539d-7512-4904-b508-dcd1d32d12a3'
    },
    {
      name: '林廷亘',
      position: '總務',
      description: '總務',
      userId: '478b65b6-f2ef-49ad-9301-ddda4b4c16fa'
    },
    {
      name: '陳宜均',
      position: '財務',
      description: '財務',
      userId: ''
    },
    {
      name: '林昌龍',
      position: '技術',
      description: '技術',
      userId:  'd814a649-0f9b-4223-80ed-c334f93deba0'
    },
  ]
  return (
    <div className={styles.clubOfficer}>
      <div className={styles.clubOfficerTitle}>
        <h2>社團幹部</h2>
      </div>
      <div className={styles.clubOfficerList}>
        {clubOfficers.map((clubOfficer) => (
          <ClubOfficerItem key={clubOfficer.name} clubOfficer={clubOfficer} />
        ))}
      </div>
    </div>
  )
}
