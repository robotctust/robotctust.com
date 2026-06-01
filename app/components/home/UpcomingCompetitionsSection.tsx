import React from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import styles from './UpcomingCompetitionsSection.module.scss'
import {
  getUpcomingCompetitions,
  getCompetitionKeyDate,
} from '@/app/utils/competitionService'
import { Competition } from '@/app/types/competition'
import ScrollAnimation from '../animation/ScrollAnimation/ScrollAnimation'

const UpcomingCompetitionsSection = async () => {
  let competitions: Competition[] = []

  try {
    // Fetch top 3 upcoming competitions
    competitions = await getUpcomingCompetitions(3)
  } catch (error) {
    console.error('Failed to fetch upcoming competitions:', error)
  }

  return (
    <section className={styles.upcomingCompetitionsSection}>
      <div className={styles.container}>
        <div className={styles.header}>
          <ScrollAnimation animation="fadeInUp" threshold={0.5}>
            <h2>近期競賽</h2>
          </ScrollAnimation>
        </div>

        {competitions.length > 0 ? (
          <>
            <div className={styles.competitionsList}>
              {competitions.map((competition, index) => {
                const date = getCompetitionKeyDate(competition, 'competition')
                const dateObj = date
                  ? {
                      month: date.toLocaleDateString('en-US', {
                        month: 'short',
                      }),
                      day: date.getDate(),
                    }
                  : null

                return (
                  <div
                    key={competition.id}
                    className={styles.competitionCardContainer}
                  >
                    <div className={styles.timeLine}>
                      <ScrollAnimation
                        animation="fadeInLeft"
                        threshold={0.7}
                        className={styles.dateText}
                        delay={index * 100}
                      >
                        {dateObj ? (
                          <>
                            <span className={styles.month}>
                              {dateObj.month}
                            </span>
                            <span className={styles.day}>{dateObj.day}</span>
                          </>
                        ) : (
                          <span className={styles.pending}>待定</span>
                        )}
                      </ScrollAnimation>
                      <div className={styles.visual}>
                        <ScrollAnimation
                          animation="fadeInLeft"
                          threshold={0.5}
                          delay={200}
                          className={styles.line}
                        />
                        <ScrollAnimation
                          animation="fadeInLeft"
                          threshold={0.5}
                          className={styles.circle}
                          delay={index * 100}
                        />
                      </div>
                    </div>
                    <ScrollAnimation
                      animation="fadeInUp"
                      threshold={0.5}
                      className={styles.competitionCardContainer}
                      delay={index * 100}
                    >
                      <div className={styles.competitionCard}>
                        {competition.image && (
                          <div className={styles.coverImageContainer}>
                            <Image
                              src={competition.image}
                              alt={competition.title}
                              width={400}
                              height={200}
                            />
                          </div>
                        )}
                        <div className={styles.content}>
                          <h3>{competition.title}</h3>
                          <p>{competition.description}</p>
                        </div>
                        <div className={styles.actions}>
                          <Link
                            href={`/competitions/${competition.id}`}
                            className={styles.viewDetails}
                          >
                            查看詳情
                          </Link>
                        </div>
                      </div>
                    </ScrollAnimation>
                  </div>
                )
              })}
            </div>

            <Link href="/competitions" className={styles.viewAll}>
              查看所有競賽
            </Link>
          </>
        ) : (
          <div className={styles.emptyState}>
            目前沒有即將到來的競賽，請稍後再回來查看！
          </div>
        )}
      </div>
    </section>
  )
}

export default UpcomingCompetitionsSection
