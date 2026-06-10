import React from 'react'
import Image from 'next/image'
import styles from './CompetitionsDetail.module.scss'
// component
import MarkdownRenderer from '@/app/components/Markdown/MarkdownRenderer'
// type
import { Competition } from '@/app/types/competition'
// icons
import { faDollarSign, faUserGroup, faClock, faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Link } from '@/i18n/navigation'

interface CompetitionDetailProps {
  competition: Competition
}

/**
 * [Component] 競賽時間線
 * @param timeline 時間線
 * @returns
 */
function CompetitionTimeline({
  timeline,
}: {
  timeline: Competition['timeline']
}) {
  // 格式化階段類型
  const getStepTypeText = (step: Competition['timeline'][0]['step']) => {
    const stepMap = {
      registration: '報名階段',
      pre: '初賽',
      semi: '半決賽',
      final: '決賽',
      result: '成績公布',
      custom: '自訂階段',
    }
    return stepMap[step] || step
  }

  /**
   * [Function] 格式化日期時間
   * @param dateTime 日期時間
   * @returns 格式化後的日期時間
   */
  const formatDateTime = (
    dateTime: Competition['timeline'][0]['startDateTime'],
  ) => {
    if (!dateTime.date) return '未設定'
    const date = new Date(dateTime.date)
    const timeStr = dateTime.time || ''
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(
      2,
      '0',
    )}/${String(date.getDate()).padStart(2, '0')} ${timeStr}`
  }

  /**
   * [Function] 格式化日期顯示
   * @param dateTime 日期時間
   * @returns 格式化後的日期顯示
   */
  const formatDateOnly = (
    dateTime: Competition['timeline'][0]['startDateTime'],
  ) => {
    if (!dateTime.date) return ''
    const date = new Date(dateTime.date)
    return date.toLocaleDateString('zh-TW', {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    })
  }

  // 根據 order 排序時間線
  const sortedTimeline = [...timeline].sort((a, b) => a.order - b.order)

  return (
    <div className={styles.detailTimelineContainer}>
      {sortedTimeline.map((step, index) => (
        <div key={step.id} className={styles.detailTimelineGroup}>
          {/* 日期節點區域 */}
          <div className={styles.detailDateSection}>
            <div className={styles.detailDateNode}>
              <div className={styles.detailDateCircle}></div>
              {index < sortedTimeline.length - 1 && (
                <div className={styles.detailTimelineLine}></div>
              )}
            </div>
            <div className={styles.detailDateInfo}>
              <h3 className={styles.detailDateTitle}>
                {getStepTypeText(step.step)}
              </h3>
              <p className={styles.detailDateSubtitle}>
                {formatDateOnly(step.startDateTime)}
              </p>
            </div>
          </div>

          {/* 階段內容區域 */}
          <div className={styles.detailStepSection}>
            <div className={styles.detailStepCard}>
              {step.startDateTime &&
                (step.startDateTime.date || step.startDateTime.time) && (
                  <div className={`${styles.stepTime} ${styles.stepStartTime}`}>
                    <span className={styles.dut}></span>
                    <span className={styles.stepTimeText}>
                      開始於 {formatDateTime(step.startDateTime)}
                    </span>
                  </div>
                )}

              <div className={styles.detailStepCardContainer}>
                {step.description && (
                  <p className={styles.detailStepDescription}>
                    {step.description}
                  </p>
                )}

                {/* 子階段時間線 */}
                {step.timeline && step.timeline.length > 0 && (
                  <div className={styles.detailSubTimeline}>
                    <h5 className={styles.detailSubTimelineTitle}>詳細時程</h5>
                    <div className={styles.detailSubSteps}>
                      {step.timeline.map((subStep, subIndex) => (
                        <div key={subIndex} className={styles.detailSubStep}>
                          <span className={styles.detailSubStepTime}>
                            {subStep.startTime}
                            {subStep.endTime && `-${subStep.endTime}`}
                          </span>
                          <span className={styles.detailSubStepName}>
                            {subStep.stepName}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {step.endDateTime &&
                (step.endDateTime.date || step.endDateTime.time) && (
                  <div className={`${styles.stepTime} ${styles.stepEndTime}`}>
                    <span className={styles.dut}></span>
                    <span className={styles.stepTimeText}>
                      結束於 {formatDateTime(step.endDateTime)}
                    </span>
                  </div>
                )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * [Component] 競賽詳細頁面
 * @param competition 競賽
 * @returns
 */
export default function CompetitionDetail({
  competition,
}: CompetitionDetailProps) {
  /**
   * [Function] 格式化競賽狀態
   * @param status 競賽狀態
   * @returns 格式化後的競賽狀態
   */
  const getStatusText = (status: Competition['status']) => {
    const statusMap = {
      draft: '草稿',
      upcoming: '即將到來',
      'registration-open': '報名中',
      ongoing: '進行中',
      completed: '已完成',
      cancelled: '已取消',
    }
    return statusMap[status] || status
  }

  /**
   * [Function] 格式化競賽層級
   * @param position 競賽層級
   * @returns 格式化後的競賽層級
   */
  const getPositionText = (position: Competition['position']) => {
    const positionMap = {
      club: '社團級',
      'school-inside': '校內級',
      'school-outside': '校外級',
      local: '區域級',
      national: '國家級',
      international: '國際級',
    }
    return positionMap[position] || position
  }

  /**
   * [Function] 檢查報名是否開放
   * @returns boolean
   */
  const checkRegistrationStatus = () => {
    if (!competition.registrationDeadline || !competition.registrationDeadline.date) return true;
    
    // 如果有截止日期，比較當前時間
    const deadlineStr = `${competition.registrationDeadline.date}T${competition.registrationDeadline.time || '23:59:59'}`;
    const deadlineDate = new Date(deadlineStr);
    return new Date() < deadlineDate;
  };

  const isRegistrationOpen = checkRegistrationStatus();

  /**
   * [Function] 格式化報名截止時間
   * @returns string
   */
  const formatDeadlineTime = () => {
    if (!competition.registrationDeadline || !competition.registrationDeadline.date) return '未設定';
    const date = new Date(competition.registrationDeadline.date);
    const timeStr = competition.registrationDeadline.time || '23:59';
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${timeStr}`;
  };

  return (
    <div className={styles.competitionDetailContainer}>
      <div className={styles.competitionHeader}>
        {/* 競賽圖片 */}
        {competition.image && (
          <div className={styles.imageContainer}>
            <Image
              src={competition.image}
              alt={competition.title}
              className={styles.competitionImage}
              width={800}
              height={300}
              priority
            />
          </div>
        )}

        {/* 競賽基本資訊 */}
        <div className={styles.headerContent}>
          <div className={styles.titleSection}>
            <div className={styles.badges}>
              <span
                className={`${styles.statusBadge} ${
                  styles[competition.status]
                }`}
              >
                {getStatusText(competition.status)}
              </span>
              <span className={styles.positionBadge}>
                {getPositionText(competition.position)}
              </span>
            </div>
            <h1 className={styles.competitionTitle}>{competition.title}</h1>
          </div>

          <p className={styles.competitionDescription}>
            {competition.description}
          </p>

          {/* 標籤 */}
          {competition.tags && competition.tags.length > 0 && (
            <div className={styles.tagsContainer}>
              {competition.tags.map((tag, index) => (
                <span key={index} className={styles.tag}>
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* 競賽資訊 */}
          <div className={styles.competitionInfo}>
            <div className={styles.mainInfo}>
              {competition.estimatedParticipants ? (
                <div className={styles.infoItem}>
                  <FontAwesomeIcon icon={faUserGroup} />
                  <span className={styles.infoLabel}>預估參與人數</span>
                  <span className={styles.infoValue}>
                    {competition.estimatedParticipants} 人
                  </span>
                </div>
              ) : null}
              {competition.registrationFee !== undefined && (
                <div className={styles.infoItem}>
                  <FontAwesomeIcon icon={faDollarSign} />
                  <span className={styles.infoLabel}>報名費用</span>
                  <span className={styles.infoValue}>
                    {competition.registrationFee === 0
                      ? '免費'
                      : `NT$ ${competition.registrationFee}`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 競賽資訊卡片 */}
          <div className={styles.infoGrid}>
            {/* 獎品資訊 */}
            {competition.rewards && competition.rewards.length > 0 && (
              <div className={styles.infoCard}>
                <h3 className={styles.infoCardTitle}>獎勵資訊</h3>
                <ul className={styles.rewardsList}>
                  {competition.rewards.map((reward, index) => (
                    <li key={index} className={styles.rewardItem}>
                      {reward}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 聯絡資訊 */}
            {competition.contact &&
              (competition.contact.email ||
                competition.contact.phone ||
                competition.contact.person) && (
                <div className={styles.infoCard}>
                  <h3 className={styles.infoCardTitle}>聯絡資訊</h3>
                  <div className={styles.infoList}>
                    {competition.contact.person && (
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>聯絡人</span>
                        <span className={styles.infoValue}>
                          {competition.contact.person}
                        </span>
                      </div>
                    )}
                    {competition.contact.email && (
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>聯絡信箱</span>
                        <span className={styles.infoValue}>
                          {competition.contact.email}
                        </span>
                      </div>
                    )}
                    {competition.contact.phone && (
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>聯絡電話</span>
                        <span className={styles.infoValue}>
                          {competition.contact.phone}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

            {/* 建立時間和最後更新時間 */}
            {/* <div className={styles.infoCard}>
              <h3 className={styles.infoCardTitle}>其他</h3>
              <div className={styles.infoList}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>建立時間</span>
                  <span className={styles.infoValue}>
                    {formatDateTime(competition.createdAt)}
                  </span>
                </div>

                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>最後更新</span>
                  <span className={styles.infoValue}>
                    {formatDateTime(competition.updatedAt)}
                  </span>
                </div>
              </div>
            </div> */}
          </div>
        </div>
      </div>

      {/* 報名區塊 */}
      {(competition.registrationLink || competition.registrationDeadline) && (
        <div className={styles.registrationSection}>
          <div className={styles.registrationCard}>
            <div className={styles.registrationInfo}>
              <h2 className={styles.registrationTitle}>報名資訊</h2>
              {competition.registrationDeadline && (
                <p className={styles.registrationDeadline}>
                  <FontAwesomeIcon icon={faClock} className={styles.deadlineIcon} />
                  截止日期：{formatDeadlineTime()}
                </p>
              )}
            </div>
            
            <div className={styles.registrationAction}>
              {competition.registrationLink ? (
                isRegistrationOpen ? (
                  <Link
                    href={competition.registrationLink} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.registrationButton}
                  >
                    前往報名
                    <FontAwesomeIcon icon={faArrowRight} className={styles.buttonIcon} />
                  </Link>
                ) : (
                  <div className={styles.registrationClosed}>報名已截止</div>
                )
              ) : (
                <div className={styles.registrationClosed}>尚未提供報名連結</div>
              )}
            </div>
            {competition.image && (
              <>
                <div className={`${styles.imageContainer} ${!isRegistrationOpen ? styles.registrationClosed : ''}`}>
                  <Image className={styles.competitionImage} width={1280} height={720} src={competition.image} alt={competition.title} />
                </div>
                <div className={styles.overlay} />
                <div className={styles.gradient_blur}>
                  <div></div>
                  <div></div>
                  <div></div>
                  <div></div>
                  <div></div>
                  <div></div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 競賽時間線 */}
      <div className={styles.timelineSection}>
        <h2 className={styles.sectionTitle}>競賽時間表</h2>
        <CompetitionTimeline timeline={competition.timeline} />
      </div>

      {/* 詳細規則 */}
      {competition.detailMarkdown && (
        <div className={styles.detailSection}>
          {/* <h2 className={styles.sectionTitle}>詳細資訊</h2> */}
          <div className={styles.markdownContent}>
            <MarkdownRenderer content={competition.detailMarkdown} />
          </div>
        </div>
      )}
    </div>
  )
}
