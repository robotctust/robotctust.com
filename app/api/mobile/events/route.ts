import { getAllPublishedScheduleEvents } from '@/app/utils/scheduleService'

/**
 * GET /api/mobile/events
 * 公開行事曆事件（給 iOS App 使用，不需要 auth）
 *
 * 只回傳已發布 (published=true) 的事件。
 * Response: ScheduleEvent[]
 */
export async function GET() {
  try {
    const events = await getAllPublishedScheduleEvents()
    return Response.json(events)
  } catch (error) {
    console.error('Mobile events list error:', error)
    return Response.json({ error: '無法取得行事曆事件' }, { status: 500 })
  }
}
