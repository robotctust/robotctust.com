import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com', // Firebase Storage
        port: '',
        pathname: '/v0/b/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Google 使用者頭像
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com', // Google Cloud Storage
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'imagefaker.access.mx.com', // Fake Image
        port: '',
        pathname: '/**',
      },
    ],
    // 圖片優化設定，避免大圖片導致記憶體問題
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
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
