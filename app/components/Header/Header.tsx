'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import styles from './Header.module.scss'

// component
import Menu from '../Menu/Menu'

// contexts
import { useAuth } from '../../contexts/AuthContext'
import { useHeaderState } from '../../contexts/HeaderContext'

// hooks
import { useNavAutoCenter } from './useNavAutoCenter'

// icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBars, faXmark, faGear } from '@fortawesome/free-solid-svg-icons'

// configs
import { NAV_AUTO_CENTER_CONFIG } from './headerScrollConfig'

//* 需要隱藏 Header 的頁面路徑列表
const HIDDEN_HEADER_PATHS = [
  '/login',
  '/register',
  '/auth/callback',
  '/onboarding',
]

/**
 * 去除 pathname 中的 locale 前綴（非預設語言才有前綴，預設 zh-TW 無前綴）
 */
const getBasePath = (pathname: string): string => {
  if (pathname.startsWith('/en/')) return pathname.slice(3)
  if (pathname === '/en') return '/'
  return pathname
}

/**
 * 檢查當前路徑是否符合目標路徑（精確或子路徑，支援 i18n 前綴）
 */
const isActivePath = (pathname: string, path: string): boolean => {
  const base = getBasePath(pathname)
  return base === path || base.startsWith(`${path}/`)
}

/**
 * 檢查當前路徑是否需要隱藏 Header
 * @param {string} pathname 當前路徑
 * @returns {boolean} 是否需要隱藏
 */
const shouldHideHeader = (pathname: string): boolean => {
  return HIDDEN_HEADER_PATHS.some((path) => pathname.includes(path))
}

/**
 * [Component] Header 元件
 * @returns {JSX.Element} Header 元件
 */
export default function Header() {
  const t = useTranslations('Header')
  // 獲取當前路徑
  const pathname = usePathname()
  // 獲取登入資訊與管理權限
  const { isAdmin, isSuperAdmin } = useAuth()
  // 選單狀態
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  // Header 的縮放狀態
  const { isCompactHeader } = useHeaderState()
  // 導航自動居中功能
  const { containerRef, handleLinkClick, handleScroll, centerActiveItem } =
    useNavAutoCenter(`.${styles.active}`, NAV_AUTO_CENTER_CONFIG)

  /**
   * 關閉選單
   * @returns {void}
   */
  const handleCloseMenu = () => {
    setIsMenuOpen(false)
  }

  /**
   * 處理導航連結點擊事件
   * @returns {void}
   */
  const handleNavLinkClick = () => {
    handleCloseMenu()
    handleLinkClick()
  }

  /**
   * 處理 Logo 點擊事件
   * @returns {void}
   */
  const handleLogoClick = () => {
    window.location.href = '/'
  }

  // 監聽 Header 模式變化，當從緊湊模式恢復時自動居中
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      centerActiveItem()
    }, 250)
    return () => clearTimeout(timeoutId)
  }, [isCompactHeader, centerActiveItem])

  // 如果當前頁面需要隱藏 Header，則不渲染
  if (shouldHideHeader(pathname)) {
    return null
  }

  return (
    <>
      {/* 選單 */}
      <Menu isOpen={isMenuOpen} onClose={handleCloseMenu} />

      {/* Header */}
      <header
        className={`${styles.header}${isMenuOpen ? ` ${styles.open}` : ''}${
          isCompactHeader ? ` ${styles.compact}` : ''
        }`}
        data-header
      >
        <div className={styles.headerContainer}>
          {/* 選單按鈕 */}

          <div className={styles.logo}>
            <div
              className={`${styles.logoContainer} ${
                isCompactHeader ? styles.compact : ''
              }`}
              onClick={handleLogoClick}
            >
              <Image
                src="/assets/image/home/robotctust-home-image.png"
                alt="中臺機器人研究社"
                width={96}
                height={96}
                className={styles.logoImage}
              />
              <div className={styles.logoText}>
                <h1>中臺機器人研究社</h1>
                <p>Robotics Research Club of CTUST</p>
              </div>
            </div>
          </div>

          {/* 導航 */}
          <div
            className={styles.nav_links}
            ref={containerRef}
            onScroll={handleScroll}
          >
            <Link
              href="/courses"
              onClick={handleNavLinkClick}
              className={
                isActivePath(pathname, '/courses') ? styles.active : ''
              }
            >
              {t('nav.courses')}
            </Link>
            <div className={styles.separator} />
            <Link
              href="/news"
              onClick={handleNavLinkClick}
              className={isActivePath(pathname, '/news') ? styles.active : ''}
            >
              {t('nav.news')}
            </Link>
            {/* <Link
              href="/competitions"
              onClick={handleNavLinkClick}
              className={
                isActivePath(pathname, '/competitions') ? styles.active : ''
              }
            >
              {t('nav.competitions')}
            </Link> */}
            <Link
              href="/calendar"
              onClick={handleNavLinkClick}
              className={
                isActivePath(pathname, '/calendar') ? styles.active : ''
              }
            >
              {t('nav.calendar')}
            </Link>
            <Link
              href="/docs"
              onClick={handleNavLinkClick}
              className={isActivePath(pathname, '/docs') ? styles.active : ''}
            >
              {t('nav.docs')}
            </Link>
            <Link
              href="/about"
              onClick={handleNavLinkClick}
              className={isActivePath(pathname, '/about') ? styles.active : ''}
            >
              {t('nav.about')}
            </Link>
            {(isAdmin || isSuperAdmin) && (
              <>
                <div className={styles.separator} />
                <Link
                  href="/dashboard"
                  onClick={handleNavLinkClick}
                  className={
                    isActivePath(pathname, '/dashboard') ? styles.active : ''
                  }
                >
                  {t('nav.dashboard')}
                </Link>
              </>
            )}
            {isSuperAdmin && (
              <>
                <Link
                  href="/admin"
                  onClick={handleNavLinkClick}
                  className={
                    isActivePath(pathname, '/admin') ? styles.active : ''
                  }
                >
                  {t('nav.admin')}
                </Link>
              </>
            )}
          </div>

          <div className={styles.menu_button}>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} data-menu-toggle>
              <FontAwesomeIcon icon={faBars} className={styles.faBars} />
              <FontAwesomeIcon icon={faXmark} className={styles.faXmark} />
            </button>
            {/* 設定入口：常駐顯示，選單展開時自 menu button 下方滑出 */}
            <Link
              href="/settings"
              onClick={handleCloseMenu}
              className={styles.settings_button}
              aria-label={t('settings')}
              title={t('settings')}
              tabIndex={isMenuOpen ? 0 : -1}
              aria-hidden={!isMenuOpen}
            >
              <FontAwesomeIcon icon={faGear} />
            </Link>
          </div>
        </div>
      </header>
      <div
        className={`${styles.gradient_blur} ${
          isCompactHeader ? styles.compact : ''
        }`}
      >
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
    </>
  )
}
