import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import ResetPasswordClient from './ResetPasswordClient'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('ResetPassword')
  return {
    title: t('meta.title'),
  }
}

/**
 * [Page] 重設密碼頁面
 * 使用者透過密碼重設郵件的連結進入此頁面，設定新密碼。
 */
export default function ResetPasswordPage() {
  return <ResetPasswordClient />
}
