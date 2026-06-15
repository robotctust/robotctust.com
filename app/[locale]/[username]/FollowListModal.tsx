'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLock } from '@fortawesome/free-solid-svg-icons'

import Modal from '@/app/components/Modal/Modal'
import { fetchFollowList } from './followActions'
import type { FollowListItem } from '@/app/utils/followService'
import styles from './FollowListModal.module.scss'

interface FollowListModalProps {
  isOpen: boolean
  onClose: () => void
  targetUid: string
  type: 'followers' | 'following'
}

/**
 * [Component] 追蹤者 / 追蹤中清單 Modal
 * 開啟時載入清單；若該清單未公開（且非本人）顯示鎖頭訊息。
 */
export default function FollowListModal({
  isOpen,
  onClose,
  targetUid,
  type,
}: FollowListModalProps) {
  const [loading, setLoading] = useState(false)
  const [isPrivate, setIsPrivate] = useState(false)
  const [items, setItems] = useState<FollowListItem[]>([])

  const title = type === 'followers' ? '追蹤者' : '追蹤中'

  useEffect(() => {
    if (!isOpen) return

    let cancelled = false
    setLoading(true)
    setIsPrivate(false)
    setItems([])

    fetchFollowList(targetUid, type)
      .then((result) => {
        if (cancelled) return
        if (result.status === 'private') {
          setIsPrivate(true)
        } else {
          setItems(result.items)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isOpen, targetUid, type])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="420px" compact>
      <div className={styles.list}>
        {loading ? (
          <p className={styles.message}>載入中…</p>
        ) : isPrivate ? (
          <div className={styles.locked}>
            <FontAwesomeIcon icon={faLock} />
            <p>此清單未公開</p>
          </div>
        ) : items.length === 0 ? (
          <p className={styles.message}>
            {type === 'followers' ? '還沒有追蹤者' : '尚未追蹤任何人'}
          </p>
        ) : (
          items.map((item) => (
            <Link
              key={item.uid}
              href={`/@${item.username}`}
              className={styles.row}
              onClick={onClose}
            >
              <div className={styles.avatar}>
                <Image
                  src={item.photoURL}
                  alt={item.displayName}
                  width={44}
                  height={44}
                />
              </div>
              <div className={styles.info}>
                <span className={styles.name}>{item.displayName}</span>
                <span className={styles.username}>@{item.username}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </Modal>
  )
}
