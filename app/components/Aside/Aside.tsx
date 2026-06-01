'use client'

import React from 'react'
import { Link, usePathname } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { useHeaderState } from '@/app/contexts/HeaderContext'
import useStickyDetection from '@/app/hooks/useStickyDetection'
import { useAside } from './AsideContext'
import styles from './Aside.module.scss'

// icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBars,
  faChevronLeft,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'

export interface AsideNavItem {
  label: string
  href: string
  icon?: IconDefinition | null
  /** 精確匹配路徑，預設 false（使用 startsWith 匹配） */
  exact?: boolean
}

export interface AsideHeaderConfig {
  title?: string
  subtitle?: string
  hide?: boolean
  backLink?: {
    label: string
    href: string
  }
}

export interface AsideProps {
  header?: AsideHeaderConfig
  /** 傳入時渲染導覽列 */
  items?: AsideNavItem[]
  /** 傳入時渲染自訂內容，與 items 可並存 */
  children?: React.ReactNode
  className?: string
  topOffset?: number
}

export const Aside: React.FC<AsideProps> = ({
  header,
  items = [],
  children,
  className = '',
  topOffset = 72,
}) => {
  const { isCompactHeader } = useHeaderState()
  const { isOpen, setIsOpen, toggleAside } = useAside()
  const pathname = usePathname()
  const t = useTranslations('Components.Aside')

  const stickyState = useStickyDetection({
    topOffset,
    enabled: true,
  })

  const isLinkActive = (item: AsideNavItem) =>
    item.exact ? pathname === item.href : pathname?.startsWith(item.href)

  return (
    <>
      <div
        className={`${styles.drawerOverlay} ${isOpen ? styles.open : ''}`}
        onClick={() => setIsOpen(false)}
      />
      <div
        className={`
          ${styles.mobileRail}
          ${isCompactHeader ? styles.headerCompact : ''}
          ${isOpen ? styles.open : ''}
        `}
      >
        <button
          type="button"
          className={styles.mobileToggleBtn}
          onClick={toggleAside}
          aria-label={isOpen ? t('close') : t('open')}
          aria-expanded={isOpen}
          aria-controls="app-aside-panel"
        >
          <FontAwesomeIcon icon={isOpen ? faXmark : faBars} />
        </button>

        <aside
          id="app-aside-panel"
          ref={stickyState.ref}
          className={`
            ${styles.aside}
            ${isCompactHeader ? styles.headerCompact : ''}
            ${stickyState.isSticky ? styles.sticky : ''}
            ${className}
          `}
        >
          <div className={styles.scrollableContent}>
            {(!header || !header.hide) && (
              <header className={styles.asideHeader}>
                {header?.backLink && (
                  <Link href={header.backLink.href} className={styles.backLink}>
                    <FontAwesomeIcon icon={faChevronLeft} />
                    <span>{header.backLink.label}</span>
                  </Link>
                )}
                {header?.title && (
                  <h1 className={styles.title}>{header.title}</h1>
                )}
                {header?.subtitle && (
                  <p className={styles.subtitle}>{header.subtitle}</p>
                )}
              </header>
            )}

            {items.length > 0 && (
              <nav className={styles.nav}>
                {items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.navLink} ${
                      isLinkActive(item) ? styles.active : ''
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    {item.icon && <FontAwesomeIcon icon={item.icon} />}
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
            )}

            {children}
          </div>
        </aside>
      </div>
    </>
  )
}
