import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import styles from './ClubOfficer.module.scss'

// utils
import { getUserProfileByUsernameServer } from '@/app/utils/userServiceServer'

interface ClubOfficer {
  name: string // 名稱
  position: string // 職位
  description: string // 描述
  username: string // 帳號名稱
}

/**
 * [Component] 社團幹部項目元件
 * @param clubOfficer - 社團幹部資料
 * @returns JSX.Element
 */
async function ClubOfficerItem({ clubOfficer }: { clubOfficer: ClubOfficer }) {
  // 取得使用者頭像
  let avatarUrl = '/assets/image/userEmptyAvatar.png' // 預設頭像
  if (clubOfficer.username) {
    try {
      // 取得使用者資料
      const userProfile = await getUserProfileByUsernameServer(
        clubOfficer.username,
      )
      // 如果使用者頭像存在，則設定頭像 URL
      if (userProfile?.photoURL) {
        avatarUrl = userProfile.photoURL
      }
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
    if (clubOfficer.username) {
      return (
        <Link
          href={`/@${clubOfficer.username}`}
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
          {clubOfficer.username && (
            <p className={styles.clubOfficerItemUsername}>
              @{clubOfficer.username}
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
  const clubOfficers: ClubOfficer[] = [
    {
      name: '藍世錡',
      position: '社長',
      description: '社長',
      username: 'blue0810',
    },
    {
      name: '趙泰齡',
      position: '副社長',
      description: '副社長',
      username: '',
    },
    {
      name: '王朝育',
      position: '活動',
      description: '活動',
      username: 'f11308082',
    },
    {
      name: '林廷亘',
      position: '總務',
      description: '總務',
      username: 'wsx060408',
    },
    {
      name: '陳宜均',
      position: '財務',
      description: '財務',
      username: '',
    },
    {
      name: '林昌龍',
      position: '技術',
      description: '技術',
      username: 'johnlin',
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
