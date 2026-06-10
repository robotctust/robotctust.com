import { requireDashboardAccess } from '@/app/utils/dashboard/auth'
import ProgramsListClient from './ProgramsListClient'

export const metadata = {
  title: '程式檔案庫 | Dashboard',
}

export default async function ProgramsPage() {
  await requireDashboardAccess('courses')

  return <ProgramsListClient />
}
