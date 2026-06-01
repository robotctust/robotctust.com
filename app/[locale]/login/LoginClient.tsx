'use client'

import { useCallback, useEffect } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import styles from './login.module.scss'

// third-party utils
import { useQueryState, parseAsStringLiteral, parseAsString } from 'nuqs'

// components
import { LoginForm } from '@/app/components/Auth/LoginForm'
import { RegisterForm } from '@/app/components/Auth/RegisterForm'

// contexts
import { useAuth } from '@/app/contexts/AuthContext'
import { isUserOnboardingComplete } from '@/app/utils/auth/onboarding'

/**
 * [Component] 登入／註冊頁面的互動式容器
 * @param {string} next - 登入後要前往的路徑
 * @returns JSX.Element
 */
export default function LoginClient({ next }: { next?: string }) {
  const t = useTranslations('Login')
  // 路由器
  const router = useRouter()
  // 使用者狀態
  const { user, loading } = useAuth()
  // 模式
  const [mode, setMode] = useQueryState(
    'mode',
    parseAsStringLiteral(['login', 'register'] as const)
      .withDefault('login')
      .withOptions({ clearOnDefault: true, scroll: false }),
  )
  // 電子郵件
  const [email, setEmail] = useQueryState(
    'email',
    parseAsString
      .withDefault('')
      .withOptions({ clearOnDefault: true, scroll: false }),
  )

  /**
   * [Effect] 若使用者已登入則導向個人頁面或指定頁面
   * @returns {void}
   */
  useEffect(() => {
    if (!loading && user) {
      if (!isUserOnboardingComplete(user)) {
        const onboardingPath = next
          ? `/onboarding?next=${encodeURIComponent(next)}`
          : '/onboarding'
        router.replace(onboardingPath)
      } else {
        router.replace(next || '/profile')
      }
    }
  }, [router, user, loading, next])

  /**
   * 切換至登入模式
   * @param email 可選的預填電子郵件
   * @returns {void}
   */
  const handleSwitchToLogin = useCallback(
    (emailToSet?: string) => {
      setMode('login')
      if (typeof emailToSet === 'string') {
        setEmail(emailToSet)
      }
    },
    [setMode, setEmail],
  )

  /**
   * 切換至註冊模式
   * @returns {void}
   */
  const handleSwitchToRegister = useCallback(() => {
    setMode('register')
    setEmail(null) // 切換到註冊時清空 email param
  }, [setMode, setEmail])

  // 是否為登入模式
  const isLoginMode = mode === 'login'

  return (
    <section className={styles.auth_page} data-testid="login-page">
      <div className={styles.auth_panel}>
        {loading && (
          <div className={styles.status_card} aria-live="polite">
            <p>{t('loading.userStatus')}</p>
          </div>
        )}

        {!loading && user && (
          <div className={styles.status_card} aria-live="polite">
            <p>
              {isUserOnboardingComplete(user)
                ? t('loading.loggedIn')
                : t('loading.onboarding')}
            </p>
          </div>
        )}

        {!user && (
          <div className={styles.form_container}>
            {isLoginMode ? (
              <LoginForm
                onSwitchToRegister={handleSwitchToRegister}
                showCloseButton={false}
                next={next}
              />
            ) : (
              <RegisterForm
                onSwitchToLogin={handleSwitchToLogin}
                showCloseButton={false}
                next={next}
              />
            )}
          </div>
        )}
      </div>
    </section>
  )
}
