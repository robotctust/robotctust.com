import { requireDashboardAccess } from '@/app/utils/dashboard/auth'
import dashboardStyles from '../../dashboard.module.scss'
import CoursesLibraryClient from './CoursesLibraryClient'
import { getCurriculumOverview } from '@/app/utils/dashboard/curriculum'

export default async function DashboardCourseLibraryPage() {
  await requireDashboardAccess('courses')
  // 首屏資料在伺服器抓好，不必等瀏覽器載完 JS 再打 API
  const overview = await getCurriculumOverview()

  return (
    <section className={dashboardStyles.content}>
      <CoursesLibraryClient initialSemesters={overview.semesters} />
    </section>
  )
}
