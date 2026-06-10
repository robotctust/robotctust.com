import { Link } from '@/i18n/navigation'
import styles from './dashboard.module.scss'
import { getUserRoleName } from '@/app/types/user'
import { DASHBOARD_MODULES, DashboardModuleConfig } from '@/app/types/dashboard'
import { requireDashboardAccess } from '@/app/utils/dashboard/auth'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBookOpen,
  faCheckCircle,
  faCode,
  faNewspaper,
  faTrophy,
  faUsers,
} from '@fortawesome/free-solid-svg-icons'
import { getUserProfileByUidServer } from '@/app/utils/userServiceServer'
import { createAdminClient } from '@/app/utils/supabase/admin'
import Image from 'next/image'

/**
 * [Component] 管理後台首頁
 * @returns 管理後台首頁
 */
export default async function DashboardHomePage() {
  // 獲取使用者資料
  const actor = await requireDashboardAccess()
  const userProfile = await getUserProfileByUidServer(actor.userId)

  // 若使用者有課程審核權限，取得待審核數量以在卡片上顯示 badge
  let pendingVerificationCount = 0
  if (actor.modules.includes('verifications')) {
    const admin = createAdminClient()
    const { count } = await admin
      .from('course_verifications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
    pendingVerificationCount = count ?? 0
  }

  // 獲取可見模組
  const visibleModules = DASHBOARD_MODULES.filter((module) =>
    actor.modules.includes(module.key),
  )

  const getModuleIcon = (module: DashboardModuleConfig) => {
    switch (module.key) {
      case 'courses':
        return <FontAwesomeIcon className={styles.moduleIcon} icon={faBookOpen} />
      case 'verifications':
        return <FontAwesomeIcon className={styles.moduleIcon} icon={faCheckCircle} />
      case 'programs':
        return <FontAwesomeIcon className={styles.moduleIcon} icon={faCode} />
      case 'achievements':
        return <FontAwesomeIcon className={styles.moduleIcon} icon={faTrophy} />
      case 'news':
        return <FontAwesomeIcon className={styles.moduleIcon} icon={faNewspaper} />
      case 'accounts':
        return <FontAwesomeIcon className={styles.moduleIcon} icon={faUsers} />
      case 'members':
        return <FontAwesomeIcon className={styles.moduleIcon} icon={faUsers} />
      default:
        return null
    }
  }

  return (
    <div className={styles.content}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <h1>控制台</h1>
          <p>管理網站的各項功能</p>
        </div>
        <div className={styles.userInfo}>
          <div className={`${styles.role} ${styles[actor.role]}`}>
            {getUserRoleName(actor.role)}
          </div>
          <div className={styles.userInfoContent}>
            <div className={styles.userInfoAvatar}>
              <Image
                src={userProfile?.photoURL || '/assets/image/userEmptyAvatar.png'}
                alt={userProfile?.displayName || ''}
                width={40}
                height={40}
              />
            </div>
            <div className={styles.userInfoName}>
              {userProfile?.displayName}
            </div>
          </div>
        </div>
      </header>

      <main className={styles.modules}>
        <section className={styles.grid}>
          {visibleModules.map((module) => (
            <Link key={module.key} href={module.href} className={styles.card}>
              <div className={styles.cardHeader}>
                {getModuleIcon(module)}
                <h3>{module.title}</h3>
                {module.key === 'verifications' && pendingVerificationCount > 0 && (
                  <span className={styles.pendingBadge}>
                    {pendingVerificationCount}
                  </span>
                )}
              </div>
              <p>{module.description}</p>
            </Link>
          ))}
        </section>
      </main>
    </div>
  )
}
