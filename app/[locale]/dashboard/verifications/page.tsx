import { requireDashboardAccess } from '@/app/utils/dashboard/auth'
import VerificationClient from './VerificationClient'
import {
  getPendingVerifications,
  getRecentlyProcessedVerifications,
} from '@/app/utils/dashboard/verifications'
import styles from './page.module.scss'

/**
 * 課程審核控制台頁面
 * @returns 課程審核控制台頁面
 */
export default async function DashboardVerificationPage() {
  // 檢查是否有權限
  await requireDashboardAccess('verifications')
  // 首屏資料在伺服器一次抓好（兩個查詢並行）
  const [pending, processed] = await Promise.all([
    getPendingVerifications(),
    getRecentlyProcessedVerifications(),
  ])

  // 返回課程審核控制台頁面
  return (
    <section className={styles.content}>
      <VerificationClient initialPending={pending} initialProcessed={processed} />
    </section>
  )
}
