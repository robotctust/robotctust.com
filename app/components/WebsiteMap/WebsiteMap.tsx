'use client'

import Link from 'next/link'
import styles from './WebsiteMap.module.scss'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { useTranslations } from 'next-intl'

const LinkWithIcon = ({
  href,
  blank,
  onClick,
  children,
}: {
  href: string
  blank?: boolean
  onClick?: () => void
  children: React.ReactNode
}) => {
  return (
    <Link
      href={href}
      target={blank ? '_blank' : '_self'}
      className={blank ? styles.blank : ''}
      onClick={onClick}
    >
      {children}
      <FontAwesomeIcon icon={faArrowRight} />
    </Link>
  )
}

/**
 * [Component] 網站地圖
 * @returns {JSX.Element} 網站地圖
 */
export default function WebsiteMap({ onClose }: { onClose?: () => void }) {
  const t = useTranslations('Components.WebsiteMap')
  const handleLinkClick = () => {
    onClose?.()
  }
  return (
    <div className={styles.websiteMap}>
      <div className={styles.websiteMap_group}>
        <p>{t('info.title')}</p>
        <div className={styles.websiteMap_group_items}>
          <LinkWithIcon href="/calendar" onClick={handleLinkClick}>
            {t('info.items.calendar')}
          </LinkWithIcon>
          <LinkWithIcon href="/news" onClick={handleLinkClick}>
            {t('info.items.news')}
          </LinkWithIcon>
          <LinkWithIcon href="/competitions" onClick={handleLinkClick}>
            {t('info.items.competitions')}
          </LinkWithIcon>
        </div>
      </div>
      <div className={styles.websiteMap_group}>
        <p>{t('data.title')}</p>
        <div className={styles.websiteMap_group_items}>
          <LinkWithIcon href="/docs" onClick={handleLinkClick}>
            {t('data.items.docs')}
          </LinkWithIcon>
          <LinkWithIcon href="/terms" onClick={handleLinkClick}>
            {t('data.items.terms')}
          </LinkWithIcon>
          <LinkWithIcon href="/privacy" onClick={handleLinkClick}>
            {t('data.items.privacy')}
          </LinkWithIcon>
        </div>
      </div>
      <div className={styles.websiteMap_group}>
        <p>{t('about.title')}</p>
        <div className={styles.websiteMap_group_items}>
          <LinkWithIcon href="/about" onClick={handleLinkClick}>
            {t('about.items.about')}
          </LinkWithIcon>
          <LinkWithIcon href="/contact" onClick={handleLinkClick}>
            {t('about.items.contact')}
          </LinkWithIcon>
        </div>
      </div>
      <div className={styles.websiteMap_group}>
        <p>{t('course.title')}</p>
        <div className={styles.websiteMap_group_items}>
          <LinkWithIcon href="/courses" onClick={handleLinkClick}>
            {t('course.items.courses')}
          </LinkWithIcon>
        </div>
      </div>
      <div className={styles.websiteMap_group}>
        <p>{t('openSource.title')}</p>
        <div className={styles.websiteMap_group_items}>
          <LinkWithIcon
            href="https://github.com/robotctust/robotctust.com"
            onClick={handleLinkClick}
            blank
          >
            {t('openSource.items.website')}
          </LinkWithIcon>
          <LinkWithIcon
            href="https://github.com/robotctust/robot-program-examples"
            onClick={handleLinkClick}
            blank
          >
            {t('openSource.items.robotProgramExamples')}
          </LinkWithIcon>
          <LinkWithIcon
            href="https://github.com/robotctust/robot-bluetooth-remote-app"
            onClick={handleLinkClick}
            blank
          >
            {t('openSource.items.robotBluetoothRemoteApp')}
          </LinkWithIcon>
          <LinkWithIcon
            href="https://github.com/robotctust/robot-bluetooth-remote-app-for-ios"
            onClick={handleLinkClick}
            blank
          >
            {t('openSource.items.robotBluetoothRemoteAppForIos')}
          </LinkWithIcon>
        </div>
      </div>
    </div>
  )
}
