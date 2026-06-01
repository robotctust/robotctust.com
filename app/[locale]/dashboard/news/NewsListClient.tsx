'use client'

import { useState, useEffect, useMemo } from 'react'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faEdit, faTrash } from '@fortawesome/free-solid-svg-icons'
import { useToast } from '@/app/contexts/ToastContext'
import { Modal } from '@/app/[locale]/dashboard/components/Modal'
import { Table, TableColumn } from '@/app/components/Table'
import {
  POST_CATEGORIES,
  POST_CATEGORY_COLORS,
  PostCategory,
  CATEGORY_TO_SLUG,
} from '@/app/types/post'
import { SerializedPost } from '@/app/types/serialized'
import styles from './news.module.scss'

export default function NewsListClient() {
  const { showToast } = useToast()
  const t = useTranslations('Dashboard.News')
  const tCategories = useTranslations('News.categories')
  const [posts, setPosts] = useState<SerializedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<SerializedPost | null>(null)
  const [bulkTargets, setBulkTargets] = useState<SerializedPost[] | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function loadPosts() {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard/news')
      if (!res.ok) throw new Error('載入失敗')
      const data = await res.json()
      setPosts(data)
    } catch {
      showToast(t('toast.loadError'), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPosts()
  }, [])

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/dashboard/news/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '刪除失敗')
      }
      setPosts((prev) => prev.filter((p) => p.id !== deleteTarget.id))
      showToast(t('toast.deletedSingle', { title: deleteTarget.title }), 'success')
      setDeleteTarget(null)
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('toast.deletedError'), 'error')
    } finally {
      setDeleting(false)
    }
  }

  async function confirmBulkDelete() {
    if (!bulkTargets || bulkTargets.length === 0) return
    setDeleting(true)
    const results = await Promise.allSettled(
      bulkTargets.map((post) =>
        fetch(`/api/dashboard/news/${post.id}`, { method: 'DELETE' }).then(
          (res) => {
            if (!res.ok) throw new Error(post.id)
            return post.id
          },
        ),
      ),
    )
    const deletedIds = new Set(
      results
        .filter((r) => r.status === 'fulfilled')
        .map((r) => (r as PromiseFulfilledResult<string>).value),
    )
    const failedCount = results.length - deletedIds.size
    if (deletedIds.size > 0) {
      setPosts((prev) => prev.filter((p) => !deletedIds.has(p.id)))
    }
    if (failedCount === 0) {
      showToast(t('toast.deletedBulk', { count: deletedIds.size }), 'success')
    } else {
      showToast(
        t('toast.deletedPartial', { success: deletedIds.size, failed: failedCount }),
        deletedIds.size > 0 ? 'info' : 'error',
      )
    }
    setBulkTargets(null)
    setDeleting(false)
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const columns = useMemo<TableColumn<SerializedPost>[]>(
    () => [
      {
        key: 'title',
        header: t('columns.title'),
        searchable: true,
        searchAccessor: (post) => post.title,
        className: styles.titleCell,
        minWidth: '200px',
        render: (post) => (
          <Link
            href={`/dashboard/news/${post.id}`}
            className={styles.titleLink}
          >
            {post.title}
          </Link>
        ),
      },
      {
        key: 'category',
        header: t('columns.category'),
        sortable: true,
        sortAccessor: (post) => post.category,
        filter: {
          options: POST_CATEGORIES.map((cat) => ({
            label: tCategories(CATEGORY_TO_SLUG[cat]),
            value: cat,
          })),
          accessor: (post) => post.category,
          placeholder: t('allCategories'),
        },
        render: (post) => (
          <span
            className={styles.categoryBadge}
            style={
              {
                '--category-bg-color':
                  POST_CATEGORY_COLORS[post.category as PostCategory]
                    .background,
                '--category-text-color':
                  POST_CATEGORY_COLORS[post.category as PostCategory].text,
                '--category-border-color':
                  POST_CATEGORY_COLORS[post.category as PostCategory].border,
              } as React.CSSProperties
            }
          >
            {tCategories(CATEGORY_TO_SLUG[post.category as PostCategory])}
          </span>
        ),
      },
      {
        key: 'authorDisplayName',
        header: t('columns.author'),
        searchable: true,
        searchAccessor: (post) => post.authorDisplayName,
        render: (post) =>
          post.authorUsername ? (
            <Link
              href={`/@${post.authorUsername}`}
              className={styles.authorLink}
              target="_blank"
            >
              {post.authorDisplayName}
            </Link>
          ) : (
            post.authorDisplayName
          ),
      },
      {
        key: 'createdAt',
        header: t('columns.createdAt'),
        sortable: true,
        sortAccessor: (post) => new Date(post.createdAt),
        nowrap: true,
        className: styles.dateCell,
        render: (post) => formatDate(post.createdAt),
      },
      {
        key: 'updatedAt',
        header: t('columns.updatedAt'),
        sortable: true,
        sortAccessor: (post) => new Date(post.updatedAt),
        nowrap: true,
        className: styles.dateCell,
        render: (post) => formatDate(post.updatedAt),
      },
      {
        key: 'actions',
        header: t('columns.actions'),
        nowrap: true,
        render: (post) => (
          <div className={styles.actionButtons}>
            <Link
              href={`/dashboard/news/${post.id}`}
              className={styles.editButton}
              title={t('actions.edit')}
            >
              <FontAwesomeIcon icon={faEdit} />
              <span>{t('actions.edit')}</span>
            </Link>
            <button
              className={styles.deleteButton}
              title={t('actions.delete')}
              onClick={() => setDeleteTarget(post)}
            >
              <FontAwesomeIcon icon={faTrash} />
              <span>{t('actions.delete')}</span>
            </button>
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('title')}</h1>
        <div className={styles.controls}>
          <Link href="/dashboard/news/new" className={styles.newNewsButton}>
            <FontAwesomeIcon icon={faPlus} />
            <span>{t('newPost')}</span>
          </Link>
        </div>
      </header>

      <Table<SerializedPost>
        columns={columns}
        data={posts}
        rowKey={(post) => post.id}
        loading={loading}
        emptyMessage={t('empty')}
        searchable
        searchPlaceholder={t('searchPlaceholder')}
        selectable
        pagination
        pageSize={10}
        bulkActions={(selected) => (
          <button
            className={styles.bulkDeleteButton}
            onClick={() => setBulkTargets(selected)}
          >
            <FontAwesomeIcon icon={faTrash} />
            <span>{t('actions.bulkDelete')}</span>
          </button>
        )}
      />

      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={t('deleteModal.title')}
        maxWidth="480px"
        footer={
          <>
            <button onClick={() => setDeleteTarget(null)} disabled={deleting}>
              {t('deleteModal.cancel')}
            </button>
            <button
              onClick={() => void confirmDelete()}
              disabled={deleting}
              data-danger="true"
            >
              {deleting ? t('deleteModal.deleting') : t('deleteModal.confirm')}
            </button>
          </>
        }
      >
        <p>
          {t.rich('deleteModal.body', {
            title: deleteTarget?.title ?? '',
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </p>
      </Modal>

      <Modal
        isOpen={bulkTargets !== null}
        onClose={() => setBulkTargets(null)}
        title={t('bulkDeleteModal.title')}
        maxWidth="480px"
        footer={
          <>
            <button onClick={() => setBulkTargets(null)} disabled={deleting}>
              {t('bulkDeleteModal.cancel')}
            </button>
            <button
              onClick={() => void confirmBulkDelete()}
              disabled={deleting}
              data-danger="true"
            >
              {deleting
                ? t('bulkDeleteModal.deleting')
                : t('bulkDeleteModal.confirm')}
            </button>
          </>
        }
      >
        <p>
          {t.rich('bulkDeleteModal.body', {
            count: bulkTargets?.length ?? 0,
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </p>
      </Modal>
    </div>
  )
}
