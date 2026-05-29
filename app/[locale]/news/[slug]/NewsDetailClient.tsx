'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import styles from './post-detail.module.scss'

// components
import FloatingActionBar, {
  ActionItem,
} from '@/app/components/FloatingActionBar/FloatingActionBar'

// utils
import {
  formatPostDate,
  getPostExcerpt,
  type AdjacentPost,
} from '@/app/utils/postService'

// hooks
import useWebSupport from '@/app/hooks/useWebSupport'

// types
import { POST_CATEGORY_COLORS, CATEGORY_TO_SLUG } from '@/app/types/post'
import { SerializedPost, deserializePost } from '@/app/types/serialized'
import { Locale } from '@/app/types/i18n'

// icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCalendar,
  faUser,
  faExclamationTriangle,
  faCheck,
  faLink,
  faShare,
  faChevronLeft,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons'
import { faThreads, faXTwitter } from '@fortawesome/free-brands-svg-icons'

interface NewsDetailClientProps {
  initialPost: SerializedPost | null
  initialError: string | null
  // 依時間線的相鄰文章：上一篇（較舊）／下一篇（較新）
  olderPost?: AdjacentPost | null
  newerPost?: AdjacentPost | null
  // 同分類推薦文章（已排除上／下一篇與自己）
  relatedPosts?: AdjacentPost[]
  // server 端預先渲染的 Markdown 內文
  children?: React.ReactNode
}

export default function NewsDetailClient({
  initialPost,
  initialError,
  olderPost = null,
  newerPost = null,
  relatedPosts = [],
  children,
}: NewsDetailClientProps) {
  const router = useRouter()
  const locale = useLocale()
  const tNews = useTranslations('News')

  const supportsShare = useWebSupport('share')

  const post = initialPost ? deserializePost(initialPost) : null
  const postUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/news/${post?.id}`

  // 分類的本地化標籤，從翻譯文件取得
  const categoryLabel = post
    ? tNews(`categories.${CATEGORY_TO_SLUG[post.category]}`)
    : ''

  const handleShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(postUrl)
    } catch (err) {
      console.warn('Clipboard API failed:', err)
    }
  }

  const handleShareSystem = async () => {
    if (!post) return
    await navigator.share({
      title: post.title,
      text: getPostExcerpt(post.contentMarkdown, 100),
      url: postUrl,
    }).catch((err) => {
      console.warn('Share failed:', err)
    })
  }

  const floatingActionBarActions: ActionItem[] = [
    {
      type: 'link',
      icon: faThreads,
      label: tNews('detail.share.threads'),
      labelVisible: false,
      href: `https://threads.net/intent/post?text=${postUrl}`,
      target: '_blank',
    },
    {
      type: 'link',
      icon: faXTwitter,
      label: tNews('detail.share.twitter'),
      labelVisible: false,
      href: `https://twitter.com/intent/tweet?text=${postUrl}`,
      target: '_blank',
    },
    {
      type: 'button',
      icon: faLink,
      label: tNews('detail.share.copyLink'),
      title: tNews('detail.share.copyLinkTitle'),
      labelVisible: false,
      onClick: handleShareUrl,
      clicked: {
        icon: faCheck,
        label: tNews('detail.share.copied'),
      },
    },
    ...(supportsShare
      ? [
          {
            type: 'button' as const,
            icon: faShare,
            label: tNews('detail.share.share'),
            labelVisible: true,
            variant: 'primary' as const,
            onClick: handleShareSystem,
          },
        ]
      : []),
  ]

  if (initialError || !post) {
    return (
      <div className={styles.postDetailContent}>
        <div className={styles.errorState}>
          <FontAwesomeIcon
            icon={faExclamationTriangle}
            className={styles.errorIcon}
          />
          <h2>{tNews('detail.error.loadFailed')}</h2>
          <p>{initialError || tNews('detail.error.notFound')}</p>
          <div className={styles.errorActions}>
            <button
              onClick={() => router.push('/news')}
              className={styles.listButton}
            >
              {tNews('detail.error.backToList')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.postDetailContent}>
      <article className={styles.article}>
        <header className={styles.articleHeader}>
          <div
            className={styles.categoryBadge}
            data-category={post.category}
            style={
              {
                '--category-bg-color':
                  POST_CATEGORY_COLORS[post.category].background,
                '--category-text-color':
                  POST_CATEGORY_COLORS[post.category].text,
                '--category-border-color':
                  POST_CATEGORY_COLORS[post.category].border,
              } as React.CSSProperties
            }
          >
            <span>{categoryLabel}</span>
          </div>

          <h1 className={styles.title}>{post.title}</h1>

          <div className={styles.metadata}>
            <div className={styles.metaItem}>
              <FontAwesomeIcon icon={faUser} />
              {post.authorUsername ? (
                <Link href={`/@${post.authorUsername}`}>
                  {post.authorDisplayName}
                </Link>
              ) : (
                <span>{post.authorDisplayName}</span>
              )}
            </div>
            <div className={styles.metaItem}>
              <FontAwesomeIcon icon={faCalendar} />
              <span>{formatPostDate(post.createdAt, locale as Locale)}</span>
            </div>
            {post.updatedAt &&
              post.updatedAt !== post.createdAt && (
                <div className={styles.metaItem}>
                  <span className={styles.updated}>
                    {tNews('detail.updatedAt', {
                      date: formatPostDate(post.updatedAt, locale as Locale),
                    })}
                  </span>
                </div>
              )}
          </div>
        </header>

        {post.coverImageUrl && (
          <div className={styles.coverImageContainer}>
            <Image
              src={post.coverImageUrl}
              alt={post.title}
              className={styles.coverImage}
              width={1200}
              height={800}
              quality={85}
              priority
            />
          </div>
        )}

        <div className={styles.content}>{children}</div>
      </article>

      {(olderPost || newerPost) && (
        <nav className={styles.adjacentNav} aria-label={tNews('detail.nav.label')}>
          {olderPost ? (
            <Link
              href={`/news/${olderPost.id}`}
              className={`${styles.adjacentLink} ${styles.adjacentPrev}`}
            >
              {olderPost.coverImageUrl && (
                <div className={styles.adjacentThumb}>
                  <Image
                    src={olderPost.coverImageUrl}
                    alt={olderPost.title}
                    width={96}
                    height={96}
                    quality={60}
                  />
                </div>
              )}
              <div className={styles.adjacentText}>
                <span className={styles.adjacentDirection}>
                  <FontAwesomeIcon icon={faChevronLeft} />
                  {tNews('detail.nav.previous')}
                </span>
                <span className={styles.adjacentTitle}>{olderPost.title}</span>
              </div>
            </Link>
          ) : (
            <span />
          )}

          {newerPost ? (
            <Link
              href={`/news/${newerPost.id}`}
              className={`${styles.adjacentLink} ${styles.adjacentNext}`}
            >
              <div className={styles.adjacentText}>
                <span className={styles.adjacentDirection}>
                  {tNews('detail.nav.next')}
                  <FontAwesomeIcon icon={faChevronRight} />
                </span>
                <span className={styles.adjacentTitle}>{newerPost.title}</span>
              </div>
              {newerPost.coverImageUrl && (
                <div className={styles.adjacentThumb}>
                  <Image
                    src={newerPost.coverImageUrl}
                    alt={newerPost.title}
                    width={96}
                    height={96}
                    quality={60}
                  />
                </div>
              )}
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}

      {relatedPosts.length > 0 && (
        <section
          className={styles.relatedSection}
          aria-label={tNews('detail.related.label')}
        >
          <h2 className={styles.relatedHeading}>
            {tNews('detail.related.heading')}
          </h2>
          <div className={styles.relatedGrid}>
            {relatedPosts.map((related) => (
              <Link
                key={related.id}
                href={`/news/${related.id}`}
                className={styles.relatedCard}
              >
                <div className={styles.relatedThumb}>
                  {related.coverImageUrl ? (
                    <Image
                      src={related.coverImageUrl}
                      alt={related.title}
                      width={320}
                      height={180}
                      quality={60}
                    />
                  ) : (
                    <div className={styles.relatedThumbPlaceholder}>
                      <span>{categoryLabel}</span>
                    </div>
                  )}
                </div>
                <span className={styles.relatedTitle}>{related.title}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <FloatingActionBar
        align="center"
        position="bottom"
        actions={floatingActionBarActions}
      />
    </div>
  )
}
