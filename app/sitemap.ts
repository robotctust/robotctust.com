import type { MetadataRoute } from 'next'
import { SITE_CONFIG } from '@/app/utils/siteConfigs'
import { createAdminClient } from '@/app/utils/supabase/admin'
import { adminDb } from '@/app/utils/firebaseAdmin'
import { mainDocs } from '@/app/[locale]/docs/docs'

// 每小時最多重新產生一次（ISR）：發布新文章後最慢一小時內自動進 sitemap，
// 不需 redeploy。需要即時更新可在發佈流程呼叫 revalidatePath('/sitemap.xml')。
export const revalidate = 3600

const SITE_URL = SITE_CONFIG.url

type SitemapEntry = MetadataRoute.Sitemap[number]
type ChangeFrequency = SitemapEntry['changeFrequency']

// 公開的靜態頁面（canonical，zh-TW 無前綴）
const STATIC_PATHS = [
  '/',
  '/about',
  '/calendar',
  '/competitions',
  '/contact',
  '/courses',
  '/docs',
  '/news',
]

function pathMeta(path: string): {
  changeFrequency: ChangeFrequency
  priority: number
} {
  if (path === '/') return { changeFrequency: 'daily', priority: 1.0 }
  if (path === '/calendar') return { changeFrequency: 'daily', priority: 0.7 }
  if (path.startsWith('/news')) return { changeFrequency: 'weekly', priority: 0.8 }
  if (path.startsWith('/competitions'))
    return { changeFrequency: 'weekly', priority: 0.8 }
  if (path.startsWith('/courses'))
    return { changeFrequency: 'monthly', priority: 0.7 }
  if (path.startsWith('/docs'))
    return { changeFrequency: 'monthly', priority: 0.6 }
  return { changeFrequency: 'monthly', priority: 0.6 }
}

// 產生單筆 entry，含 zh-TW / en / x-default 的 hreflang alternates
function buildEntry(path: string, lastModified?: string | Date): SitemapEntry {
  const isRoot = path === '/'
  const canonUrl = isRoot ? SITE_URL : `${SITE_URL}${path}`
  const enUrl = isRoot ? `${SITE_URL}/en` : `${SITE_URL}/en${path}`
  const { changeFrequency, priority } = pathMeta(path)

  return {
    url: canonUrl,
    lastModified: lastModified ?? new Date(),
    changeFrequency,
    priority,
    alternates: {
      languages: {
        'zh-TW': canonUrl,
        en: enUrl,
        'x-default': canonUrl,
      },
    },
  }
}

async function getNewsEntries(): Promise<SitemapEntry[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('posts')
      .select('id, updated_at')
    if (error || !data) return []
    return data.map((post) =>
      buildEntry(`/news/${post.id}`, post.updated_at ?? undefined),
    )
  } catch (err) {
    console.warn('[sitemap] posts 查詢失敗:', err)
    return []
  }
}

async function getCourseEntries(): Promise<SitemapEntry[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('courses')
      .select('id, updated_at')
      .eq('is_published', true)
    if (error || !data) return []
    return data.map((course) =>
      buildEntry(`/courses/${course.id}`, course.updated_at ?? undefined),
    )
  } catch (err) {
    console.warn('[sitemap] courses 查詢失敗:', err)
    return []
  }
}

async function getCompetitionEntries(): Promise<SitemapEntry[]> {
  try {
    const snap = await adminDb
      .collection('competitions')
      .where('published', '==', true)
      .get()
    return snap.docs.map((doc) => {
      const data = doc.data()
      const lastModified = data.updatedAt?.toDate?.()?.toISOString()
      return buildEntry(`/competitions/${doc.id}`, lastModified)
    })
  } catch (err) {
    console.warn('[sitemap] competitions 查詢失敗:', err)
    return []
  }
}

function getDocEntries(): SitemapEntry[] {
  return mainDocs.map((doc) => buildEntry(`/docs/${doc.id}`))
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [news, courses, competitions] = await Promise.all([
    getNewsEntries(),
    getCourseEntries(),
    getCompetitionEntries(),
  ])

  return [
    ...STATIC_PATHS.map((path) => buildEntry(path)),
    ...news,
    ...courses,
    ...competitions,
    ...getDocEntries(),
  ]
}
