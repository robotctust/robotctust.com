import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import styles from './ClubOfficer.module.scss'
import { CLUB_OFFICERS, type ClubOfficer as ClubOfficerType } from './club-officers'
import { createPublicClient } from '@/app/utils/supabase/public'

/**
 * 單張幹部卡片（Server Component）。
 * userId 有值 → 向 Supabase 查頭像與 username（用不帶 cookie 的 client，關於頁才能靜態快取）；
 * username 有值 → 卡片變為可點擊的個人頁連結。
 */
async function ClubOfficerItem({ clubOfficer }: { clubOfficer: ClubOfficerType }) {
  let avatarUrl = '/assets/image/userEmptyAvatar.png'
  let username = ''

  if (clubOfficer.userId) {
    try {
      const { data } = await createPublicClient()
        .from('users')
        .select('avatar_url, username')
        .eq('id', clubOfficer.userId)
        .maybeSingle()
      if (data?.avatar_url) avatarUrl = data.avatar_url
      username = data?.username || ''
    } catch (error) {
      console.error('獲取使用者頭像時發生錯誤:', error)
    }
  }

  // 有 username 時輸出 <Link>，否則輸出無互動的 <div>
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    username ? (
      <Link
        href={`/@${username}`}
        className={`${styles.clubOfficerItem} ${styles.clubOfficerItemLink}`}
      >
        {children}
      </Link>
    ) : (
      <div className={styles.clubOfficerItem}>{children}</div>
    )

  return (
    <Wrapper>
      {/* hover 時斜掃過卡面的反光線條 */}
      <span className={styles.clubOfficerSheen} aria-hidden="true" />
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
            <p className={styles.clubOfficerItemUsername}>@{username}</p>
          )}
        </div>
        <div className={styles.clubOfficerItemPosition}>
          <p>{clubOfficer.position}</p>
        </div>
        {/* tagline 留空時不渲染 */}
        {clubOfficer.tagline && (
          <p className={styles.clubOfficerItemTagline}>{clubOfficer.tagline}</p>
        )}
      </div>
    </Wrapper>
  )
}

/** 社團幹部列表（橫向滑軌）。資料來源：club-officers.ts */
export default function ClubOfficer() {
  return (
    <div className={styles.clubOfficer}>
      <div className={styles.clubOfficerTitle}>
        <h2>社團幹部</h2>
      </div>
      <div className={styles.clubOfficerList}>
        {CLUB_OFFICERS.map((officer) => (
          <ClubOfficerItem key={officer.name} clubOfficer={officer} />
        ))}
      </div>
    </div>
  )
}
