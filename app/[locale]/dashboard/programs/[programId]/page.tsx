import { requireDashboardAccess } from '@/app/utils/dashboard/auth'
import ProgramEditorClient from './ProgramEditorClient'

export const metadata = {
  title: '編輯程式檔案 | Dashboard',
}

export default async function ProgramPage({
  params,
}: {
  params: Promise<{ programId: string }>
}) {
  await requireDashboardAccess('courses')

  const { programId } = await params
  return <ProgramEditorClient programId={programId} />
}
