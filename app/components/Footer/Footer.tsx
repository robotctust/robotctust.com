import { Link } from '@/i18n/navigation'
import styles from './Footer.module.scss'
import Image from 'next/image'
// components
import ContactUs from '../ContactUs/ContactUs'
// icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faInstagram,
  faThreads,
  faXTwitter,
  faGithub,
} from '@fortawesome/free-brands-svg-icons'
// utils
import { SITE_CONFIG } from '@/app/utils/siteConfigs'
import { getTranslations } from 'next-intl/server'

/**
 * [Component] 頁尾
 * @param widthLimited 頁尾內容的寬度是否有限制
 */
export default async function Footer({
  removePaddingRL,
}: {
  removePaddingRL?: boolean
}) {
  const t = await getTranslations('Footer')
  const tIndex = await getTranslations('Index')
  // 建立年份
  const firstYear = 2025
  // 目前年份
  const currentYear = new Date().getFullYear()
  return (
    <footer
      className={`${styles.footer} ${
        removePaddingRL ? styles.removePaddingRL : ''
      }`}
    >
      <div className={styles.footerContainer}>
        <div className={styles.footerContent}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <Image
                src="/assets/image/home/robotctust-home-image.png"
                alt="中臺機器人研究社"
                width={100}
                height={100}
              />
              <h1>{tIndex('clubName')}</h1>
            </div>
            <div className={styles.headerRight}>
              <div className={styles.social}>
                <div className={styles.socialItems}>
                  <Link
                    href="https://www.instagram.com/robotctust/"
                    className={`${styles.socialItem} ${styles.instagram}`}
                    target="_blank"
                  >
                    <FontAwesomeIcon icon={faInstagram} />
                  </Link>
                  <Link
                    href="https://www.threads.net/@robotctust"
                    className={`${styles.socialItem} ${styles.threads}`}
                    target="_blank"
                  >
                    <FontAwesomeIcon icon={faThreads} />
                  </Link>
                  <Link
                    href="https://x.com/robotctust"
                    className={`${styles.socialItem} ${styles.twitter}`}
                    target="_blank"
                  >
                    <FontAwesomeIcon icon={faXTwitter} />
                  </Link>
                  <Link
                    href="https://github.com/robotctust"
                    className={`${styles.socialItem} ${styles.github}`}
                    target="_blank"
                  >
                    <FontAwesomeIcon icon={faGithub} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ContactUs />

        <div className={styles.copyright}>
          <p>
            Copyright ©{' '}
            {firstYear === currentYear
              ? currentYear
              : `${firstYear}-${currentYear}`}{' '}
            {tIndex('clubName')}
          </p>
        </div>
        <div className={styles.links}>
          <Link
            href="https://github.com/johnlin10/robot-ctust"
            className="link"
            target="_blank"
          >
            {t('links.openSource')}
          </Link>
          <Link href="/terms" className="link">
            {t('links.termsOfService')}
          </Link>
          <Link href="/privacy" className="link">
            {t('links.privacyPolicy')}
          </Link>
        </div>
        <div className={styles.version}>
          <p>v{SITE_CONFIG.version}</p>
        </div>
      </div>
    </footer>
  )
}
