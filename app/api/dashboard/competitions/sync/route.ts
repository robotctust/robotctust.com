import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { adminDb } from '@/app/utils/firebaseAdmin'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { requireAdminAccess } from '@/app/utils/auth/admin'

export async function POST(request: Request) {
  const access = await requireAdminAccess({ requireSuperAdmin: true })

  if (access.status !== 'authorized') {
    return NextResponse.json(
      {
        success: 0,
        errors: [
          access.status === 'unauthenticated'
            ? '請先登入後再執行此操作'
            : '只有超級管理員可以同步競賽資料',
        ],
      },
      { status: access.status === 'unauthenticated' ? 401 : 403 },
    )
  }

  try {
    const body = await request.json()
    const { competitions } = body

    if (!Array.isArray(competitions)) {
      return NextResponse.json(
        { success: 0, errors: ['Invalid competitions payload'] },
        { status: 400 },
      )
    }

    const batch = adminDb.batch()
    const errors: string[] = []
    let successCount = 0

    const createTimestamp = (dateTimeStr: {
      date: string | null
      time: string | null
    }) => {
      if (!dateTimeStr?.date || !dateTimeStr?.time) {
        return {
          date: dateTimeStr?.date || null,
          time: dateTimeStr?.time || null,
          timestamp: null,
        }
      }
      try {
        const jsDate = new Date(`${dateTimeStr.date}T${dateTimeStr.time}:00`)
        return {
          date: dateTimeStr.date,
          time: dateTimeStr.time,
          timestamp: Timestamp.fromDate(jsDate),
        }
      } catch {
        return {
          date: dateTimeStr.date,
          time: dateTimeStr.time,
          timestamp: null,
        }
      }
    }

    for (const competition of competitions) {
      try {
        const docRef = adminDb.collection('competitions').doc(competition.id)

        const timeline = (competition.timeline ?? []).map((step: any) => ({
          ...step,
          startDateTime: createTimestamp(step.startDateTime),
          endDateTime: createTimestamp(step.endDateTime),
        }))

        const createdAt =
          createTimestamp(competition.createdAt).timestamp ||
          FieldValue.serverTimestamp()

        const docData = {
          ...competition,
          timeline,
          createdAt,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: access.user.id,
        }

        batch.set(docRef, docData)
        successCount++
      } catch (error) {
        console.error(`Error preparing competition ${competition.id}:`, error)
        errors.push(`競賽 ${competition.title} (${competition.id}) 準備失敗`)
      }
    }

    await batch.commit()

    revalidatePath('/[locale]/competitions/[slug]', 'page')
    return NextResponse.json({ success: successCount, errors })
  } catch (error: any) {
    console.error('API batch sync error:', error)
    return NextResponse.json(
      {
        success: 0,
        errors: ['批量同步執行失敗：' + (error.message || '未知錯誤')],
      },
      { status: 500 },
    )
  }
}
