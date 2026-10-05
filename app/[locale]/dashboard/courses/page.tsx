import { requireDashboardAccess } from '@/app/utils/dashboard/auth'
import CoursesOverviewClient from './overview/CoursesOverviewClient'
import { getCurriculumOverview } from '@/app/utils/dashboard/curriculum'
import styles from './page.module.scss'

/**
 * 課程編輯器頁面
 * @returns 課程編輯器頁面
 */
export default async function DashboardCoursesPage() {
  await requireDashboardAccess('courses')
  // 首屏資料在伺服器抓好，不必等瀏覽器載完 JS 再打 API
  const overview = await getCurriculumOverview()

  return (
    <section className={styles.content}>
      <CoursesOverviewClient initialOverview={overview} />
    </section>
  )
}
