import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { getPathname } from '@/i18n/navigation'
import AdminPageClient from './AdminPageClient'
import { requireAdminAccess } from '@/app/utils/auth/admin'

export default async function AdminPage() {
  const access = await requireAdminAccess()
  const locale = await getLocale()

  if (access.status === 'unauthenticated') {
    redirect(getPathname({ href: '/login', locale }))
  }

  if (access.status === 'forbidden') {
    redirect(getPathname({ href: '/', locale }))
  }

  return <AdminPageClient />
}
