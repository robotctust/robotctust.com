import { SITE_CONFIG } from '@/app/utils/siteConfigs'

const MEDIA = `${SITE_CONFIG.mediaBase}/home/course-journey`

/** 課程圖片資料（照片放 Cloudflare R2，index 對應 i18n Home.CourseJourney.lessons） */
export const COURSE_IMAGES: string[] = [
  `${MEDIA}/01.webp`,
  `${MEDIA}/02.webp`,
  `${MEDIA}/03.webp`,
  `${MEDIA}/04.webp`,
]
