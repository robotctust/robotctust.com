import { Link } from '@/i18n/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import styles from './docs.module.scss'
import { mainDocs } from './docs'
import { Metadata } from 'next'
import { metadata } from '@/app/utils/metadata'
import { getTranslations } from 'next-intl/server'
import Page from '@/app/components/page/Page'
import SubDocsClient from './ui/SubDocsClient/SubDocsClient'

export default async function DocsPage() {
  const t = await getTranslations('Docs')

  return (
    <Page
      style={styles.docsContainer}
      header={{
        title: t('page.headerTitle'),
        descriptions: [t('page.headerDescription')],
      }}
    >
      <div className={styles.docsContent}>
        <div className={styles.subDocs}>
          <SubDocsClient />
        </div>
        <div className={styles.mainDocs}>
          <h2>{t('mainSection.heading')}</h2>
          <div className={styles.mainDocsContent}>
            {mainDocs.map((doc) => (
              <Link
                key={doc.id}
                href={`/docs/${doc.id}`}
                className={styles.docCard}
              >
                <FontAwesomeIcon icon={doc.icon} className={styles.docIcon} />
                <h3 className={styles.docTitle}>{t(`documents.${doc.id}.title`)}</h3>
                <p className={styles.docDescription}>{t(`documents.${doc.id}.description`)}</p>
                {doc.category && (
                  <span className={styles.docCategory}>{t('courseMaterials.category')}</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Page>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Docs')
  return metadata({
    title: t('meta.title'),
    description: t('meta.description'),
    keywords: t('meta.keywords').split(','),
    image: '/assets/image/metadata-backgrounds/docs.webp',
    url: '/docs',
    category: 'docs',
  })
}
