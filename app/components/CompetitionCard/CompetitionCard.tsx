import React from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import styles from './CompetitionCard.module.scss'
// type
import { Competition } from '../../types/competition'

interface CompetitionCardProps {
  competition: Competition
  showFullDescription?: boolean
  className?: string
}

/**
 * 取得競賽舉辦層級的顯示文字
 * @param position 競賽舉辦層級
 * @returns 競賽舉辦層級的顯示文字
 */
function getPositionLabel(position: Competition['position']): string {
  const labels = {
    club: '社團',
    'school-inside': '校內',
    'school-outside': '校外',
    local: '區域級',
    national: '國家級',
    international: '國際級',
  }
  return labels[position] || position
}

/**
 * 取得競賽狀態的顯示文字和樣式
 * @param status 競賽狀態
 * @returns 競賽狀態的顯示文字和樣式
 */
function getStatusInfo(status: Competition['status']): {
  label: string
  className: string
} {
  const statusMap = {
    draft: { label: '草稿', className: 'draft' },
    upcoming: { label: '即將開始', className: 'upcoming' },
    'registration-open': { label: '報名中', className: 'registrationOpen' },
    ongoing: { label: '進行中', className: 'ongoing' },
    completed: { label: '已完成', className: 'completed' },
    cancelled: { label: '已取消', className: 'cancelled' },
  }
  return statusMap[status] || { label: status, className: 'draft' }
}

/**
 * [Component] 競賽卡片
 * @param competition 競賽
 * @param showFullDescription 是否顯示完整描述
 * @param className 自定義樣式類別
 * @returns 競賽卡片
 */
export default function CompetitionCard({
  competition,
  showFullDescription = false,
  className = '',
}: CompetitionCardProps) {
  // 取得競賽狀態和層級
  const statusInfo = getStatusInfo(competition.status)
  // 取得競賽層級
  const positionLabel = getPositionLabel(competition.position)

  /**
   * [Function] 截斷描述文字
   * @param showFullDescription 是否顯示完整描述
   * @returns 截斷後的描述文字
   */
  const description = showFullDescription
    ? competition.description
    : competition.description.length > 150
    ? `${competition.description.slice(0, 150)}...`
    : competition.description

  return (
    <Link
      href={`/competitions/${competition.id}`}
      id={competition.id}
      className={`${styles.competitionCard} ${className}`}
    >
      {/* 競賽圖片 */}
      {competition.image && (
        <div className={styles.imageContainer}>
          <Image
            src={competition.image}
            alt={competition.title}
            width={400}
            height={200}
            className={styles.competitionImage}
            priority={false}
          />
        </div>
      )}

      {/* 競賽內容 */}
      <div className={styles.cardContent}>
        {/* 標題與標籤 */}
        <div className={styles.cardHeader}>
          <div className={styles.titleSection}>
            <h3 className={styles.competitionTitle}>
              <span className={styles.titleLink}>{competition.title}</span>
            </h3>
            <div className={styles.badges}>
              <span
                className={`${styles.statusBadge} ${
                  styles[statusInfo.className]
                }`}
              >
                {statusInfo.label}
              </span>
              <span className={styles.positionBadge}>{positionLabel}</span>
            </div>
          </div>
        </div>

        {/* 描述 */}
        <p className={styles.competitionDescription}>{description}</p>

        {/* 標籤 */}
        {competition.tags && competition.tags.length > 0 && (
          <div className={styles.tagsContainer}>
            {competition.tags.map((tag, index) => (
              <span key={index} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* 競賽資訊 */}
        <div className={styles.competitionInfo}>
          {competition.estimatedParticipants
            ? competition.estimatedParticipants > 0 && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>預估參與人數：</span>
                  <span className={styles.infoValue}>
                    {competition.estimatedParticipants} 人
                  </span>
                </div>
              )
            : null}

          {competition.registrationFee !== undefined && (
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>報名費：</span>
              <span className={styles.infoValue}>
                {competition.registrationFee === 0
                  ? '免費'
                  : `NT$ ${competition.registrationFee}`}
              </span>
            </div>
          )}

          {competition.contact?.person && (
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>聯絡人：</span>
              <span className={styles.infoValue}>
                {competition.contact.person}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
