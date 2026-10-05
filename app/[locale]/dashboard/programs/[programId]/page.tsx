import { requireDashboardAccess } from '@/app/utils/dashboard/auth'
import { notFound } from 'next/navigation'
import ProgramEditorClient from './ProgramEditorClient'
import { fetchProgramById } from '@/app/utils/dashboard/programService'

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
  if (programId === 'new') return <ProgramEditorClient programId={programId} />

  // 程式在伺服器抓好直接帶入編輯器，不必先顯示「載入中」再打 API
  const program = await fetchProgramById(programId)
  if (!program) notFound()
  return <ProgramEditorClient programId={programId} program={program} />
}
