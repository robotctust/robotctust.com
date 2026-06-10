import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { getPathname } from '@/i18n/navigation'
import { requireAdminAccess } from '@/app/utils/auth/admin'

export default async function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  const access = await requireAdminAccess()
  const locale = await getLocale()

  if (access.status === 'unauthenticated') {
    redirect(getPathname({ href: '/login', locale }))
  }

  if (access.status === 'forbidden') {
    redirect(getPathname({ href: '/', locale }))
  }

  return <div>{children}</div>
}
