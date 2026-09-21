import { requireDashboardAccess } from '@/app/utils/dashboard/auth'
import { getAllSemesters, getScheduleEventById } from '@/app/utils/scheduleService'
import { notFound } from 'next/navigation'
import CalendarEditorClient from '../CalendarEditorClient'

export const metadata = { title: '編輯事件 | Dashboard' }

export default async function EditCalendarEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  await requireDashboardAccess('calendar')
  const { eventId } = await params
  // 事件與學期選項並行抓，學期選項抓不到不影響編輯
  const [event, semesters] = await Promise.all([
    getScheduleEventById(eventId),
    getAllSemesters().catch(() => []),
  ])
  if (!event) notFound()
  return <CalendarEditorClient event={event} semesters={semesters} />
}
