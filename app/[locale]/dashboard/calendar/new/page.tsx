import { requireDashboardAccess } from '@/app/utils/dashboard/auth'
import CalendarEditorClient from '../CalendarEditorClient'
import { getAllSemesters } from '@/app/utils/scheduleService'

export const metadata = { title: '新增事件 | Dashboard' }

export default async function NewCalendarEventPage() {
  await requireDashboardAccess('calendar')
  // 學期選項抓不到不影響新增
  const semesters = await getAllSemesters().catch(() => [])
  return <CalendarEditorClient semesters={semesters} />
}
