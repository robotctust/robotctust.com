import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  // 全站圖片改用自製 Img 元件；保險起見關閉 Vercel 圖片最佳化（額度用完會整批 402 破圖）
  images: { unoptimized: true },
  async redirects() {
    return [
      {
        source: '/schedules',
        destination: '/calendar',
        permanent: true,
      },
      {
        source: '/en/schedules',
        destination: '/en/calendar',
        permanent: true,
      },
      {
        source: '/update/:postId',
        destination: '/news/:postId',
        permanent: true,
      },
      {
        source: '/en/update/:postId',
        destination: '/en/news/:postId',
        permanent: true,
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/@:username',
        destination: '/@:username',
      },
      {
        source: '/en/@:username',
        destination: '/en/@:username',
      },
    ]
  },
}

export default withNextIntl(nextConfig)
