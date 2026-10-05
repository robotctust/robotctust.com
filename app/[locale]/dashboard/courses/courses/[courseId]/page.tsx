import { requireDashboardAccess } from '@/app/utils/dashboard/auth'
import CourseWorkspaceClient from './CourseWorkspaceClient'
import { getCourseWorkspace } from '@/app/utils/dashboard/curriculum'

interface DashboardCourseWorkspacePageProps {
  params: Promise<{
    courseId: string
  }>
}

export default async function DashboardCourseWorkspacePage({
  params,
}: DashboardCourseWorkspacePageProps) {
  await requireDashboardAccess('courses')
  const { courseId } = await params

  // 工作台資料在伺服器抓好直接帶入；讀取失敗時沿用原本在畫面上顯示錯誤的行為
  let workspace = null
  let error = ''
  try {
    workspace = await getCourseWorkspace(courseId)
  } catch (loadError) {
    error = loadError instanceof Error ? loadError.message : '載入工作台失敗'
  }

  return (
    <CourseWorkspaceClient
      courseId={courseId}
      initialWorkspace={workspace}
      initialError={error}
    />
  )
}
