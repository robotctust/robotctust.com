import { requireDashboardAccess } from '@/app/utils/dashboard/auth'
import dashboardStyles from '../../dashboard.module.scss'
import SemestersManagerClient from './SemestersManagerClient'

export default async function DashboardCourseSemestersPage() {
  await requireDashboardAccess('courses')

  return (
    <section className={dashboardStyles.content}>
      <SemestersManagerClient />
    </section>
  )
}
