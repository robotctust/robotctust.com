'use client'

import { Link } from '@/i18n/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import styles from './SubDocsClient.module.scss'
import { subDocs } from '../../docs'
import { faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { useTranslations } from 'next-intl'

export default function SubDocsClient() {
  const t = useTranslations('Docs')

  return (
    <div className={styles.subDocs}>
      {subDocs.map((docGroup) => (
        <div className={styles.docGroup} key={docGroup.id}>
          <h2>{t('courseMaterials.title')}</h2>
          {docGroup.docs.map((subDoc) => {
            // 取得今天日期
            const todayDate = new Date()
            const today = todayDate
              .toISOString()
              .split('T')[0]
              .split('-')
              .join('/')
            // 取得明天日期
            const tomorrow = new Date(todayDate.getTime() + 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0]
              .split('-')
              .join('/')

            // 取得文件日期
            const date = subDoc.date.split('-').join('/')
            // 判斷是否為今天或明天
            const isToday = date === today
            const isTomorrow = date === tomorrow

            return (
              <div className={styles.subDoc} key={subDoc.id}>
                <div className={styles.subDocTitle}>
                  <span
                    className={`${styles.subDocDate} ${
                      isToday ? styles.subDocToday : ''
                    } ${isTomorrow ? styles.subDocTomorrow : ''}`}
                  >
                    {isToday
                      ? t('dateLabels.today')
                      : isTomorrow
                        ? t('dateLabels.tomorrow')
                        : date}
                  </span>
                  <h4>{subDoc.title}</h4>
                </div>
                <div className={styles.subDocDocs}>
                  {subDoc.docs.map((doc) => (
                    <Link
                      key={doc.id}
                      href={doc.filePath}
                      className={styles.subDocLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={t('linkTitle', { title: doc.title })}
                    >
                      {doc.icon && (
                        <FontAwesomeIcon
                          icon={doc.icon}
                          className={styles.fileIcon}
                        />
                      )}
                      <h4 className={styles.subDocTitle}>{doc.title}</h4>
                      <span className={styles.subDocType}>{doc.type}</span>
                      <FontAwesomeIcon
                        icon={faArrowRight}
                        className={styles.linkIcon}
                      />
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
