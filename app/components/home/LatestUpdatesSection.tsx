import { Link } from '@/i18n/navigation'
import styles from './LatestUpdatesSection.module.scss'
import { getLocale, getTranslations } from 'next-intl/server'
// utils
import { getAllPosts, getPostExcerpt } from '@/app/utils/postService'
import { formatPostDate } from '@/app/utils/postService'
// components
import Image from 'next/image'
import ScrollAnimation from '../animation/ScrollAnimation/ScrollAnimation'
// types
import { Post } from '@/app/types/post'
import { Locale } from '@/app/types/i18n'

const LatestUpdatesSection = async () => {
  const locale = await getLocale()
  const t = await getTranslations('Home.LatestUpdates')
  let posts: Post[] = []

  // 獲取最新資訊
  try {
    const allPosts = await getAllPosts()
    posts = allPosts.slice(0, 3)
  } catch (error) {
    console.error('Failed to fetch posts:', error)
  }

  return (
    <section className={styles.latestUpdatesSection}>
      <div className={styles.container}>
        <div className={styles.header}>
          <ScrollAnimation animation="fadeInUp" threshold={0.5}>
            <h1>{t('title')}</h1>
          </ScrollAnimation>
        </div>
        <div className={styles.cardsContainer}>
          {posts.map((post, index) => (
            <ScrollAnimation
              animation="fadeInUp"
              threshold={0.5}
              delay={index * 100}
              key={post.id}
            >
              <Link
                href={`/news/${post.id}`}
                className={styles.card}
                role="link"
              >
                <div className={styles.cardContent}>
                  {post.coverImageUrl && (
                    <div className={styles.coverImageContainer}>
                      <Image
                        src={post.coverImageUrl}
                        alt={post.title}
                        width={240}
                        height={180}
                      />
                    </div>
                  )}
                  <div className={styles.content}>
                    <h3>{post.title}</h3>
                    <p className={styles.excerpt}>
                      {getPostExcerpt(post.contentMarkdown)}
                    </p>
                  </div>
                  <div className={styles.footer}>
                    <span className={styles.date}>
                      {formatPostDate(post.createdAt, locale as Locale)}
                    </span>
                  </div>
                </div>
              </Link>
            </ScrollAnimation>
          ))}
        </div>

        <Link href="/news" className={styles.viewAll}>
          {t('viewAll')}
        </Link>
      </div>
    </section>
  )
}

export default LatestUpdatesSection
