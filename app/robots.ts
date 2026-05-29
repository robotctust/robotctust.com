import type { MetadataRoute } from 'next'
import { SITE_CONFIG } from '@/app/utils/siteConfigs'

const SITE_URL = SITE_CONFIG.url

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/en/admin',
        '/api',
        '/dashboard',
        '/en/dashboard',
        '/onboarding',
        '/en/onboarding',
        '/login',
        '/en/login',
        '/profile',
        '/en/profile',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
