import { Suspense } from 'react'
import { Metadata } from 'next'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { Link, getPathname } from '@/i18n/navigation'
import { getTranslations, getLocale } from 'next-intl/server'
import styles from './login.module.scss'

// components
import Page from '@/app/components/page/Page'
import LoginClient from './LoginClient'

// util
import { metadata } from '@/app/utils/metadata'
import { createClient } from '@/app/utils/supabase/server'
import { getUserProfileServer } from '@/app/utils/userServiceServer'
import { isUserOnboardingComplete } from '@/app/utils/auth/onboarding'
import { isSafeRedirectPath } from '@/app/utils/auth/redirect'

// icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faGraduationCap,
  faLaptopCode,
  faMedal,
  faEnvelope,
} from '@fortawesome/free-solid-svg-icons'

/**
 * Loading fallback 元件
 * 在 LoginClient 載入時顯示
 * @returns {JSX.Element}
 */
async function LoginLoadingFallback() {
  const tLogin = await getTranslations('Login')
  return (
    <div className={styles.auth_page}>
      <div className={styles.auth_panel}>
        <div className={styles.status_card} aria-live="polite">
          <p>{tLogin('loading.page')}</p>
        </div>
      </div>
    </div>
  )
}

/**
 * [Page] 登入頁面
 * @returns {Promise<JSX.Element>}
 */
async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  // 獲取查詢參數
  const sParams = await searchParams
  const nextRaw = typeof sParams.next === 'string' ? sParams.next : '/profile'
  const nextPath = isSafeRedirectPath(nextRaw) ? nextRaw : '/profile'
  const tLogin = await getTranslations('Login')
  const locale = await getLocale()

  // 伺服器端驗證
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 若已登入，根據 Onboarding 狀態導向
  if (user) {
    const profile = await getUserProfileServer(user.id)
    if (isUserOnboardingComplete(profile)) {
      redirect(getPathname({ href: nextPath, locale }))
    } else {
      // 帶上 next 參數，以便完成 onboarding 後能跳轉回來
      redirect(
        getPathname({
          href: `/onboarding?next=${encodeURIComponent(nextPath)}`,
          locale,
        }),
      )
    }
  }

  return (
    <Page
      style={styles.login_page_wrapper}
      backgroundGrid
      mouseDynamicGlow
      maxWidth="1000px"
    >
      <Link href="/" passHref className={styles.back_to_home}>
        <Image
          src="/assets/image/home/robotctust-home-image.png"
          alt="中臺機器人研究社"
          width={96}
          height={96}
        />
        <p>{tLogin('backToHome')}</p>
      </Link>
      <div className={styles.auth_container}>
        {/* 左側：功能介紹 */}
        <div className={styles.welcome_section}>
          <div className={styles.welcome_content}>
            <h1 className={styles.welcome_title}>
              {tLogin('welcome.title')}
              <br />
              {tLogin('welcome.subtitle')}
            </h1>
            <p className={styles.welcome_subtitle}>{tLogin('loginToUnlock')}</p>

            <div className={styles.features_list}>
              <div className={styles.feature_item}>
                <div className={styles.feature_icon_wrapper}>
                  <FontAwesomeIcon
                    icon={faGraduationCap}
                    className={styles.feature_icon}
                  />
                </div>
                <div className={styles.feature_text}>
                  <h3>{tLogin('features.courses.title')}</h3>
                  <p>{tLogin('features.courses.description')}</p>
                </div>
              </div>
              <div className={styles.feature_item}>
                <div className={styles.feature_icon_wrapper}>
                  <FontAwesomeIcon
                    icon={faLaptopCode}
                    className={styles.feature_icon}
                  />
                </div>
                <div className={styles.feature_text}>
                  <h3>{tLogin('features.news.title')}</h3>
                  <p>{tLogin('features.news.description')}</p>
                </div>
              </div>
              <div className={styles.feature_item}>
                <div className={styles.feature_icon_wrapper}>
                  <FontAwesomeIcon
                    icon={faMedal}
                    className={styles.feature_icon}
                  />
                </div>
                <div className={styles.feature_text}>
                  <h3>{tLogin('features.achievements.title')}</h3>
                  <p>{tLogin('features.achievements.description')}</p>
                </div>
              </div>
              <div className={styles.feature_item}>
                <div className={styles.feature_icon_wrapper}>
                  <FontAwesomeIcon
                    icon={faEnvelope}
                    className={styles.feature_icon}
                  />
                </div>
                <div className={styles.feature_text}>
                  <h3>{tLogin('features.emailNotifications.title')}</h3>
                  <p>{tLogin('features.emailNotifications.description')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 右側：登入表單 */}
        <div className={styles.auth_form_wrapper}>
          <Suspense fallback={<LoginLoadingFallback />}>
            <LoginClient next={nextPath} />
          </Suspense>
        </div>
      </div>
    </Page>
  )
}

/**
 * [Function] 生成 Metadata
 * @returns {Metadata}
 */
export async function generateMetadata(): Promise<Metadata> {
  const tLogin = await getTranslations('Login')
  return metadata({
    title: tLogin('meta.title'),
    description: tLogin('meta.description'),
    keywords: tLogin('meta.keywords').split(','),
    image: '/assets/image/metadata-backgrounds/global.webp',
    url: '/login',
    category: 'account',
  })
}

export default LoginPage
