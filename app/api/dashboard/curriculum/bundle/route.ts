/**
 * 課程包 API：匯出、匯入預覽、匯入（跨學期複製由前端串這三步）
 */

import { NextRequest } from 'next/server'
import {
  CourseBundleError,
  exportCourseBundle,
  importCourseBundle,
  previewCourseBundle,
} from '@/app/utils/dashboard/courseBundle'
import { requireDashboardAccess, toRouteErrorResponse } from '@/app/utils/dashboard/auth'

type Body =
  | { action: 'export'; courseIds: string[] }
  | { action: 'preview' | 'import'; semesterId: string; bundle: unknown }

export async function POST(request: NextRequest) {
  try {
    await requireDashboardAccess('courses')
    const body = (await request.json()) as Body

    if (body.action === 'export') {
      if (!Array.isArray(body.courseIds) || body.courseIds.length === 0) {
        return Response.json({ error: '請選擇要匯出的課程' }, { status: 400 })
      }
      return Response.json({ bundle: await exportCourseBundle(body.courseIds) })
    }

    if (body.action !== 'preview' && body.action !== 'import') {
      return Response.json({ error: '未知的操作' }, { status: 400 })
    }
    if (typeof body.semesterId !== 'string' || !body.semesterId) {
      return Response.json({ error: '缺少目標學期' }, { status: 400 })
    }

    if (body.action === 'preview') {
      const { bundle: _bundle, ...preview } = await previewCourseBundle(
        body.bundle,
        body.semesterId,
      )
      return Response.json({ preview })
    }

    const courseIds = await importCourseBundle(body.bundle, body.semesterId)
    return Response.json({ courseIds }, { status: 201 })
  } catch (error) {
    if (error instanceof CourseBundleError) {
      return Response.json({ error: error.message }, { status: 400 })
    }
    return toRouteErrorResponse(error)
  }
}
