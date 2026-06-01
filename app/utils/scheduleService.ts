import { createAdminClient } from '@/app/utils/supabase/admin'
import { createClient } from '@/app/utils/supabase/client'
import { ScheduleEvent } from '@/app/types/Schedule'

// ---------- Conversion ----------

function rowToEvent(row: Record<string, unknown>): ScheduleEvent {
  const pad = (t: string) => t.slice(0, 5) // 'HH:MM:SS' → 'HH:MM'

  // semesters join：{ name: '114-1' } or null
  const semRow = row.semesters as { name: string } | null | undefined

  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string | null) ?? undefined,
    type: row.type as ScheduleEvent['type'],
    startDateTime: {
      date: row.start_date as string,
      time: pad(row.start_time as string),
    },
    endDateTime: {
      date: row.end_date as string,
      time: pad(row.end_time as string),
    },
    location: (row.location as string | null) ?? undefined,
    instructor: (row.instructor as string | null) ?? undefined,
    color: (row.color as string | null) ?? undefined,
    priority: row.priority as number,
    published: row.published as boolean,
    semesterId: (row.semester_id as string | null) ?? null,
    semesterName: semRow?.name ?? null,
    createdAt: {
      date: (row.created_at as string).slice(0, 10),
      time: (row.created_at as string).slice(11, 16),
    },
    updatedAt: {
      date: (row.updated_at as string).slice(0, 10),
      time: (row.updated_at as string).slice(11, 16),
    },
  }
}

// ---------- Public (client-side, respects RLS) ----------

/** 供前台行事曆頁面使用，只回傳已發布的事件 */
export async function getPublishedScheduleEvents(): Promise<ScheduleEvent[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('schedule_events')
    .select('*, semesters(name)')
    .eq('published', true)
    .order('start_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) throw new Error('取得行事曆資料失敗')
  return (data ?? []).map((r: unknown) => rowToEvent(r as Record<string, unknown>))
}

// ---------- Admin (server-side, bypasses RLS) ----------

/**
 * 取得已發布事件（server-side 變體，給 API route / mobile endpoint 使用）
 * 與 getPublishedScheduleEvents 行為相同，但走 admin client。
 */
export async function getAllPublishedScheduleEvents(): Promise<ScheduleEvent[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('schedule_events')
    .select('*, semesters(name)')
    .eq('published', true)
    .order('start_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) throw new Error('取得行事曆資料失敗')
  return (data ?? []).map((r: unknown) => rowToEvent(r as Record<string, unknown>))
}

/** 取得所有事件（含未發布），供後台使用 */
export async function getAllScheduleEvents(): Promise<ScheduleEvent[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('schedule_events')
    .select('*, semesters(name)')
    .order('start_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) throw new Error('取得行事曆資料失敗')
  return (data ?? []).map((r: unknown) => rowToEvent(r as Record<string, unknown>))
}

/** 取得單一事件，供後台使用 */
export async function getScheduleEventById(id: string): Promise<ScheduleEvent | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('schedule_events')
    .select('*, semesters(name)')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error('取得事件資料失敗')
  if (!data) return null
  return rowToEvent(data as Record<string, unknown>)
}

export interface CreateScheduleEventData {
  title: string
  description?: string
  type: ScheduleEvent['type']
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  location?: string
  instructor?: string
  color?: string
  priority?: number
  published?: boolean
  semesterId?: string | null
}

/** 建立事件 */
export async function createScheduleEvent(
  data: CreateScheduleEventData,
  userId: string,
): Promise<ScheduleEvent> {
  const admin = createAdminClient()
  const { data: row, error } = await admin
    .from('schedule_events')
    .insert({
      title: data.title.trim(),
      description: data.description?.trim() || null,
      type: data.type,
      start_date: data.startDate,
      start_time: data.startTime,
      end_date: data.endDate,
      end_time: data.endTime,
      location: data.location?.trim() || null,
      instructor: data.instructor?.trim() || null,
      color: data.color || null,
      priority: data.priority ?? 0,
      published: data.published ?? false,
      semester_id: data.semesterId ?? null,
      created_by: userId,
    })
    .select('*, semesters(name)')
    .single()

  if (error) throw new Error('建立事件失敗')
  return rowToEvent(row as Record<string, unknown>)
}

export type UpdateScheduleEventData = Partial<CreateScheduleEventData>

/** 更新事件 */
export async function updateScheduleEvent(
  id: string,
  data: UpdateScheduleEventData,
): Promise<ScheduleEvent> {
  const admin = createAdminClient()

  const payload: Record<string, unknown> = {}
  if (data.title !== undefined) payload.title = data.title.trim()
  if (data.description !== undefined) payload.description = data.description?.trim() || null
  if (data.type !== undefined) payload.type = data.type
  if (data.startDate !== undefined) payload.start_date = data.startDate
  if (data.startTime !== undefined) payload.start_time = data.startTime
  if (data.endDate !== undefined) payload.end_date = data.endDate
  if (data.endTime !== undefined) payload.end_time = data.endTime
  if (data.location !== undefined) payload.location = data.location?.trim() || null
  if (data.instructor !== undefined) payload.instructor = data.instructor?.trim() || null
  if (data.color !== undefined) payload.color = data.color || null
  if (data.priority !== undefined) payload.priority = data.priority
  if (data.published !== undefined) payload.published = data.published
  if ('semesterId' in data) payload.semester_id = data.semesterId ?? null

  const { data: row, error } = await admin
    .from('schedule_events')
    .update(payload)
    .eq('id', id)
    .select('*, semesters(name)')
    .single()

  if (error) throw new Error('更新事件失敗')
  return rowToEvent(row as Record<string, unknown>)
}

/** 刪除事件 */
export async function deleteScheduleEvent(id: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.from('schedule_events').delete().eq('id', id)
  if (error) throw new Error('刪除事件失敗')
}

// ---------- Semester helpers ----------

export interface SemesterOption {
  id: string
  name: string
}

/** 取得所有學期列表，供後台下拉選單使用 */
export async function getAllSemesters(): Promise<SemesterOption[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('semesters')
    .select('id, name')
    .order('name', { ascending: true })

  if (error) throw new Error('取得學期列表失敗')
  return (data ?? []) as SemesterOption[]
}
