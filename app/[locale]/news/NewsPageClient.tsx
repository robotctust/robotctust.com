'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import styles from './news.module.scss'
// components
import Loading from '@/app/components/Loading/Loading'
// icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFileAlt } from '@fortawesome/free-solid-svg-icons'
// contexts
import { useHeaderState } from '@/app/contexts/HeaderContext'
// utils
import { useQueryState, parseAsString } from 'nuqs'
import { getPostExcerpt, formatPostDate } from '@/app/utils/postService'
// types
import {
  Post,
  PostCategory,
  POST_CATEGORIES,
  POST_CATEGORY_COLORS,
  CategorySlug,
  CATEGORY_TO_SLUG,
  SLUG_TO_CATEGORY,
} from '@/app/types/post'
import { deserializePost, SerializedPost } from '@/app/types/serialized'
import { Locale } from '@/app/types/i18n'

type FilterType = PostCategory | 'all'

// ─── PostCard ────────────────────────────────────────────────────────────────

interface PostCardProps {
  post: Post
  categoryLabel: string
}

function PostCard({ post, categoryLabel }: PostCardProps) {
  const locale = useLocale()

  return (
    <Link href={`/news/${post.id}`} className={styles.postCard}>
      <div className={styles.postCardContent}>
        <div className={styles.postCoverContainer}>
          {post.coverImageUrl && (
            <Image
              src={post.coverImageUrl}
              alt={post.title}
              className={styles.postCover}
              width={360}
              height={270}
              priority
            />
          )}
        </div>
        <div className={styles.mainContent}>
          <div className={styles.postHeader}>
            <div className={styles.postMeta}>
              <div className={styles.postInfo}>
                <span
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
                  {categoryLabel}
                </span>
                {post.authorUsername ? (
                  <Link
                    href={`/@${post.authorUsername}`}
                    className={styles.postAuthor}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {post.authorDisplayName}
                  </Link>
                ) : (
                  <span className={styles.postAuthor}>
                    {post.authorDisplayName}
                  </span>
                )}
                <span className={styles.postDate}>
                  {formatPostDate(post.createdAt, locale as Locale)}
                </span>
              </div>
              <h3 className={styles.postTitle}>{post.title}</h3>
            </div>
          </div>
          <div className={styles.postContentContainer}>
            {post.coverImageUrl && (
              <Image
                src={post.coverImageUrl}
                alt={post.title}
                className={styles.postCover}
                width={120}
                height={90}
                priority
              />
            )}
            {post.contentMarkdown && (
              <div className={styles.postContent}>
                {getPostExcerpt(post.contentMarkdown)}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

// ─── FilterBar ────────────────────────────────────────────────────────────────

interface FilterBarProps {
  currentFilter: FilterType
  categoryLabels: Record<PostCategory | 'all', string>
  isCompact: boolean
  onFilterChange: (filter: FilterType) => void
}

function FilterBar({
  currentFilter,
  categoryLabels,
  isCompact,
  onFilterChange,
}: FilterBarProps) {
  return (
    <div
      className={`${styles.filterSection} ${isCompact ? styles.headerCompact : ''}`}
    >
      <div className={styles.filterButtons}>
        <button
          onClick={() => onFilterChange('all')}
          className={`${styles.filterButton} ${currentFilter === 'all' ? styles.active : ''}`}
        >
          {categoryLabels.all}
        </button>
        {POST_CATEGORIES.map((category) => (
          <button
            key={category}
            onClick={() => onFilterChange(category)}
            className={`${styles.filterButton} ${currentFilter === category ? styles.active : ''}`}
            data-category={category}
            style={
              {
                '--category-bg-color':
                  POST_CATEGORY_COLORS[category].background,
                '--category-text-color': POST_CATEGORY_COLORS[category].text,
                '--category-border-color':
                  POST_CATEGORY_COLORS[category].border,
              } as React.CSSProperties
            }
          >
            {categoryLabels[category]}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── NewsPageClient ────────────────────────────────────────────────────────────────

interface NewsPageClientProps {
  initialPosts: SerializedPost[]
}

export default function NewsPageClient({ initialPosts }: NewsPageClientProps) {
  const tNews = useTranslations('News')
  const { isCompactHeader } = useHeaderState()

  const [posts, setPosts] = useState<Post[]>(
    () => initialPosts.map(deserializePost) as Post[],
  )
  const [loading] = useState(false)
  const [error] = useState<string | null>(null)

  const [categorySlug, setCategorySlug] = useQueryState(
    'category',
    parseAsString.withDefault(''),
  )
  const [searchQuery] = useQueryState('q', parseAsString.withDefault(''))

  const currentFilter: FilterType = categorySlug
    ? (SLUG_TO_CATEGORY[categorySlug as CategorySlug] ?? 'all')
    : 'all'

  const categoryLabels = useMemo<Record<PostCategory | 'all', string>>(
    () => ({
      all: tNews('categories.all'),
      社團活動: tNews('categories.club-activity'),
      即時消息: tNews('categories.instant-news'),
      新聞分享: tNews('categories.news-sharing'),
      技術分享: tNews('categories.tech-sharing'),
      競賽資訊: tNews('categories.competition-info'),
      網站更新: tNews('categories.website-update'),
    }),
    [tNews],
  )

  const filteredPosts = useMemo(() => {
    let result = posts
    if (currentFilter !== 'all') {
      result = result.filter((post) => post.category === currentFilter)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (post) =>
          post.title.toLowerCase().includes(q) ||
          post.contentMarkdown?.toLowerCase().includes(q),
      )
    }
    return result
  }, [posts, currentFilter, searchQuery])

  useEffect(() => {
    setPosts(initialPosts.map(deserializePost) as Post[])
  }, [initialPosts])

  const handleFilterChange = (filter: FilterType) => {
    setCategorySlug(filter === 'all' ? null : CATEGORY_TO_SLUG[filter])
  }

  return (
    <>
      <div className={styles.updateContent}>
        <FilterBar
          currentFilter={currentFilter}
          categoryLabels={categoryLabels}
          isCompact={isCompactHeader}
          onFilterChange={handleFilterChange}
        />

        {loading ? (
          <Loading text="正在載入文章" />
        ) : error ? (
          <div className={styles.errorState}>
            <p>載入文章時發生錯誤：{error}</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className={styles.emptyState}>
            <FontAwesomeIcon icon={faFileAlt} className={styles.emptyIcon} />
            <p>
              {currentFilter === 'all'
                ? tNews('emptyState.all')
                : tNews('emptyState.filtered', {
                    category: categoryLabels[currentFilter as PostCategory],
                  })}
            </p>
          </div>
        ) : (
          <div className={styles.postsContainer}>
            {filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                categoryLabel={categoryLabels[post.category]}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
