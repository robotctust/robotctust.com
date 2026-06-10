import styles from './ContactUs.module.scss'
import { Link } from '@/i18n/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { getTranslations } from 'next-intl/server'

async function ContactUs() {
  const t = await getTranslations('Footer')

  return (
    <div className={styles.contact}>
      <h2 className={styles.blockTitle}>
        <Link href="/contact">
          {t('contactUs.title')} <FontAwesomeIcon icon={faChevronRight} />
        </Link>
      </h2>
      <div className={styles.contactItem}>
        <p className={styles.labelTitle}>{t('contactUs.email')}</p>
        <Link
          href="mailto:robotctust@gmail.com"
          className="link"
          target="_blank"
        >
          robotctust@gmail.com
        </Link>
      </div>
      <div className={styles.contactItem}>
        <p className={styles.labelTitle}>{t('contactUs.instagram')}</p>
        <Link
          href="https://www.instagram.com/robotctust/"
          className="link"
          target="_blank"
        >
          @robotctust
        </Link>
      </div>

      <div className={styles.contactItem}>
        <p className={styles.labelTitle}>{t('contactUs.office')}</p>
        <Link href="/contact" className="link">
          中臺科技大學 天機教學大樓 2323
        </Link>
      </div>
    </div>
  )
}

export default ContactUs
