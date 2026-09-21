import { requireDashboardAccess } from '@/app/utils/dashboard/auth'
import ProgramsListClient from './ProgramsListClient'
import { fetchAllPrograms } from '@/app/utils/dashboard/programService'

export const metadata = {
  title: '程式檔案庫 | Dashboard',
}

export default async function ProgramsPage() {
  await requireDashboardAccess('courses')
  // 首屏資料在伺服器抓好，不必等瀏覽器載完 JS 再打 API
  const programs = await fetchAllPrograms()

  return <ProgramsListClient initialPrograms={programs} />
}
