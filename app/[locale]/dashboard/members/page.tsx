import { Metadata } from 'next'
import { requireDashboardAccess } from '@/app/utils/dashboard/auth'
import MembersClient from './MembersClient'
import { getMembersOverview } from '@/app/utils/dashboard/members'

export const metadata: Metadata = {
  title: '學期名單管理 - 課程後台',
  description: '管理各學期參與課程的社員與學員名單',
}

export default async function MembersPage() {
  await requireDashboardAccess('members')
  // 首屏資料在伺服器抓好，不必等瀏覽器載完 JS 再打 API
  const overview = await getMembersOverview()

  return <MembersClient initialOverview={overview} />
}
