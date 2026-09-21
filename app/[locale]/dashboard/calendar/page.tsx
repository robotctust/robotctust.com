import { requireDashboardAccess } from '@/app/utils/dashboard/auth'
import CalendarListClient from './CalendarListClient'
import { getAllScheduleEvents, getAllSemesters } from '@/app/utils/scheduleService'

export const metadata = { title: '行事曆管理 | Dashboard' }

export default async function DashboardCalendarPage() {
  await requireDashboardAccess('calendar')
  // 首屏資料在伺服器一次抓好（兩個查詢並行）
  const [events, semesters] = await Promise.all([
    getAllScheduleEvents(),
    getAllSemesters(),
  ])
  return <CalendarListClient initialEvents={events} initialSemesters={semesters} />
}
