'use client'

import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import { usePathname } from '@/i18n/navigation'
import styles from './Menu.module.scss'

// components
import ThemeToggle from '../ThemeToggle/ThemeToggle'
import LanguageSwitcher from '../LanguageSwitcher/LanguageSwitcher'
import WebsiteMap from '../WebsiteMap/WebsiteMap'

// context
import { useAuth } from '../../contexts/AuthContext'

// hook
import { useMenuAutoClose } from '../../hooks/useMenuAutoClose'
import { useTranslations } from 'next-intl'

interface MenuProps {
  isOpen: boolean
  onClose?: () => void
}

interface AuthSectionProps {
  onClose?: () => void
}

/**
 * [Component] 登入區塊
 * @param {AuthSectionProps} onClose - 關閉選單
 * @returns {JSX.Element}
 */
const AuthSection = ({ onClose }: AuthSectionProps) => {
  const t = useTranslations('Components.AuthSection')
  // 獲取當前路徑
  const pathname = usePathname()
  // 獲取登入資訊
  const { user, loading, signOut } = useAuth()

  /**
   * 處理使用者頭像點擊
   * @returns {void}
   */
  const handleUserClick = () => {
    if (onClose) {
      onClose()
    }
  }

  /**
   * 處理登出
   * @returns {void}
   */
  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Logout failed:', error)
    }

    if (onClose) {
      onClose()
    }
  }

  return (
    <>
      <div
        className={`${styles.auth_section} ${
          pathname === `/user/${user?.username}` ? styles.active : ''
        }`}
      >
        {loading ? (
          <div className={styles.loading}></div>
        ) : user ? (
          <Link
            href="/profile"
            className={styles.user_link}
            onClick={handleUserClick}
          >
            <div className={styles.user_info}>
              <Image
                src={user.photoURL || '/assets/image/userEmptyAvatar.webp'}
                alt={user.displayName}
                title={user.displayName}
                className={styles.user_avatar}
                width={32}
                height={32}
                priority
              />
              <span className={styles.user_name}>{user.displayName}</span>
            </div>
            <div className={styles.action_buttons}>
              <button className={styles.logout_button} onClick={handleLogout}>
                {t('logout')}
              </button>
            </div>
          </Link>
        ) : (
          <div className={styles.auth_login}>
            <p>
              {t('joinUs')}
              <br />
              {t('exploreRobotWorld')}
            </p>
            <div className={styles.auth_buttons}>
              <Link
                href="/login"
                className={styles.login_button}
                onClick={onClose}
              >
                {t('login')}
              </Link>
              {/* <Link
                href={{ pathname: '/login', query: { mode: 'register' } }}
                className={styles.register_button}
                onClick={onClose}
              >
                註冊
              </Link> */}
              {/* <p className={styles.auth_login_text}>
                登入系統內部測試中
                <br />
                敬請期待
              </p> */}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

/**
 * [Component] 選單
 * @param {MenuProps} isOpen - 是否開啟
 * @param {MenuProps['onClose']} onClose - 關閉選單
 * @returns {JSX.Element}
 */
export default function Menu({ isOpen, onClose }: MenuProps) {
  // 自動關閉選單功能
  useMenuAutoClose({
    isOpen,
    onClose: onClose || (() => {}),
    excludeSelectors: [
      '[data-theme-toggle]',
      '[data-theme-toggle] *',
      '[data-menu-toggle]',
      '[data-menu-toggle] *',
      '[data-header]',
      '[data-header] *',
    ],
    touchThreshold: 50,
  })

  return (
    <menu className={`${styles.menu} ${isOpen ? styles.open : ''}`} data-menu>
      <div className={styles.menu_items} data-menu>
        <div className={styles.menu_item + ' ' + styles.website_map} data-menu>
          <WebsiteMap onClose={onClose} />
        </div>
        <div className={styles.menu_item + ' ' + styles.switchers} data-menu>
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
        <div className={styles.menu_item + ' ' + styles.auth_item} data-menu>
          <AuthSection onClose={onClose} />
        </div>
      </div>
    </menu>
  )
}
