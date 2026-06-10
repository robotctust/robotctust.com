import { requireDashboardAccess } from '@/app/utils/dashboard/auth'
import dashboardStyles from '../../dashboard.module.scss'
import CoursesLibraryClient from './CoursesLibraryClient'

export default async function DashboardCourseLibraryPage() {
  await requireDashboardAccess('courses')

  return (
    <section className={dashboardStyles.content}>
      <CoursesLibraryClient />
    </section>
  )
}
