import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import styles from './CourseJourney.module.scss'
import HorizontalScrollHijack from '@/app/components/animation/HorizontalScroll/HorizontalScrollHijack'
import ConnectingPath from '@/app/components/ui/ConnectingPath/ConnectingPath'
import { COURSE_IMAGES } from './course-lessons'

interface CourseLesson {
  title: string
  description: string
}

/**
 * 課程概覽（server component）。
 *
 * 文字由 server 端透過 getTranslations 渲染進首屏 HTML，
 * 捲動劫持互動由 HorizontalScrollHijack（client）負責。
 * 所有項目都在 DOM 內，爬蟲可讀完整課程內容。
 */
export default async function CourseJourney() {
  const t = await getTranslations('Home.CourseJourney')
  const lessons = t.raw('lessons') as Record<string, CourseLesson>

  return (
    <section className={styles.courseJourney}>
      <HorizontalScrollHijack
        heading={<h2 className={styles.title}>{t('title')}</h2>}
        label={t('scrollLabel')}
        className=""
      >
        {/* 動態曲線：串起各項目頂端的節點，形成課程旅程線 */}
        <ConnectingPath offsetX={9} />
        {Object.entries(lessons).map(([key, lesson], i) => (
          <article key={key} className={styles.item} data-journey-node>
            <div className={styles.body}>
              <span className={styles.step}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3>{lesson.title}</h3>
              <p>{lesson.description}</p>
            </div>
            <div className={styles.media}>
              {COURSE_IMAGES[i] ? (
                <Image
                  src={COURSE_IMAGES[i]}
                  alt={lesson.title}
                  fill
                  sizes="(max-width: 600px) 80vw, 380px"
                  style={{ objectFit: 'cover', objectPosition: 'center' }}
                />
              ) : (
                <div className={styles.placeholder} aria-hidden="true" />
              )}
            </div>
          </article>
        ))}
      </HorizontalScrollHijack>
    </section>
  )
}
