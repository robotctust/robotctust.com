import { redirect } from 'next/navigation'
import { Link, getPathname } from '@/i18n/navigation'
import { getLocale } from 'next-intl/server'
import Image from 'next/image'
import { Metadata } from 'next'
import Page from '@/app/components/page/Page'
import { createClient } from '@/app/utils/supabase/server'
import { metadata } from '@/app/utils/metadata'
import {
  deriveDefaultUsername,
  isUserOnboardingComplete,
} from '@/app/utils/auth/onboarding'
import { isSafeRedirectPath } from '@/app/utils/auth/redirect'
import OnboardingClient from './OnboardingClient'
import styles from './onboarding.module.scss'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const sParams = await searchParams
  const nextRaw = typeof sParams.next === 'string' ? sParams.next : '/profile'
  const nextPath = isSafeRedirectPath(nextRaw) ? nextRaw : '/profile'
  const locale = await getLocale()

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect(
      getPathname({ href: `/login?next=${encodeURIComponent(nextPath)}`, locale }),
    )
  }

  const { data: profile } = await supabase
    .from('users')
    .select(
      'username, display_name, avatar_url, student_id, school_identity, club_identity',
    )
    .eq('id', user.id)
    .maybeSingle()

  const initialData = {
    uid: user.id,
    email: user.email || '',
    username: deriveDefaultUsername({
      username: profile?.username,
      email: user.email,
      fullName: user.user_metadata?.full_name,
    }),
    displayName:
      profile?.display_name?.trim() ||
      user.user_metadata?.full_name?.trim() ||
      deriveDefaultUsername({
        email: user.email,
        fullName: user.user_metadata?.full_name,
      }),
    photoURL:
      profile?.avatar_url ||
      user.user_metadata?.avatar_url ||
      '/assets/image/userEmptyAvatar.png',
    studentId: profile?.student_id || '',
    schoolIdentity: profile?.school_identity || undefined,
    clubIdentity: profile?.club_identity || undefined,
  }

  if (isUserOnboardingComplete(initialData)) {
    redirect(getPathname({ href: nextPath, locale }))
  }

  return (
    <Page
      style={styles.onboarding_page_wrapper}
      backgroundGrid
      mouseDynamicGlow
      maxWidth="1080px"
    >
      <Link href="/" passHref className={styles.back_to_home}>
        <Image
          src="/assets/image/home/robotctust-home-image.png"
          alt="中臺機器人研究社"
          width={96}
          height={96}
        />
        <p>回到首頁</p>
      </Link>
      <div className={styles.onboarding_container}>
        <div className={styles.intro_section}>
          <div className={styles.intro_content}>
            <h1 className={styles.intro_title}>只差最後一步</h1>
            <p className={styles.intro_subtitle}>
              我們已經幫你帶入 Google
              帳號資料，補完個人檔案與身份資訊後就能開始使用完整功能。
            </p>
            <ul className={styles.intro_list}>
              <li>確認帳號名稱與公開顯示名稱</li>
              <li>補充校園身分與社團身分</li>
              <li>若為本校學生，請提供學號以便核對社員名單</li>
            </ul>
          </div>
        </div>

        <div className={styles.form_panel}>
          <OnboardingClient initialData={initialData} next={nextPath} />
        </div>
      </div>
    </Page>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  return metadata({
    title: '完成註冊資料｜中臺機器人研究社',
    description:
      '補完個人檔案與身份資訊後即可開始使用中臺機器人研究社會員功能。',
    keywords: ['完成註冊', '會員資料', 'Google 登入'],
    url: '/onboarding',
    category: 'account',
    noIndex: true,
  })
}
