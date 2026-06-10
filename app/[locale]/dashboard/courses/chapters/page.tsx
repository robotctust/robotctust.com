import { requireDashboardAccess } from '@/app/utils/dashboard/auth'
import dashboardStyles from '../../dashboard.module.scss'
import ChaptersManagerClient from './ChaptersManagerClient'

export default async function DashboardCourseChaptersPage() {
  await requireDashboardAccess('courses')

  return (
    <section className={dashboardStyles.content}>
      <ChaptersManagerClient />
    </section>
  )
}
