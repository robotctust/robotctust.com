import { requireDashboardAccess } from '@/app/utils/dashboard/auth'
import CoursesOverviewClient from './overview/CoursesOverviewClient'
import styles from './page.module.scss'

/**
 * 課程編輯器頁面
 * @returns 課程編輯器頁面
 */
export default async function DashboardCoursesPage() {
  await requireDashboardAccess('courses')

  return (
    <section className={styles.content}>
      <CoursesOverviewClient />
    </section>
  )
}
