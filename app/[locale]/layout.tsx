import type { Metadata, Viewport } from 'next'
import '../globals.css'
import '../styles/_colors.scss'
// font
import { Noto_Sans_TC, DM_Mono } from 'next/font/google'
// analytics
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from '@vercel/analytics/next'
import { GoogleAnalytics } from '@next/third-parties/google'
// components
import Header from '@/app/components/Header/Header'
import ThemeColorMeta from '@/app/components/ThemeColorMeta'
// contexts
import { AuthProvider } from '@/app/contexts/AuthContext'
import { ThemeProvider } from '@/app/contexts/ThemeContext'
import { HeaderProvider } from '@/app/contexts/HeaderContext'
import { ToastProvider } from '../contexts/ToastContext'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
// i18n
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing, ogLocaleMap } from '@/i18n/routing'
// config
import { HEADER_SCROLL_CONFIG } from '@/app/components/Header/headerScrollConfig'

const notoSansTC = Noto_Sans_TC({
  variable: '--font-noto-sans-tc',
  subsets: ['latin'],
})

const dmMono = DM_Mono({
  weight: ['500'],
  variable: '--font-dm-mono',
  subsets: ['latin'],
})

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Metadata' })

  const ogLocale = ogLocaleMap[locale] ?? locale.replace('-', '_')
  const alternateLocale = routing.locales
    .filter((l) => l !== locale)
    .map((l) => ogLocaleMap[l] ?? l.replace('-', '_'))

  return {
    title: t('siteTitle'),
    applicationName: t('siteTitle'),
    description: t('siteDescription'),
    openGraph: {
      locale: ogLocale,
      alternateLocale,
    },
    icons: {
      icon: [
        {
          url: '/assets/icons/web-icon/robotctust-web-icon-1024.png',
          sizes: '1024x1024',
          type: 'image/png',
        },
        {
          url: '/assets/icons/web-icon/robotctust-web-icon-512.png',
          sizes: '512x512',
          type: 'image/png',
        },
        {
          url: '/assets/icons/web-icon/robotctust-web-icon-256.png',
          sizes: '256x256',
          type: 'image/png',
        },
        {
          url: '/assets/icons/web-icon/robotctust-web-icon-128.png',
          sizes: '128x128',
          type: 'image/png',
        },
        {
          url: '/assets/icons/web-icon/robotctust-web-icon-64.png',
          sizes: '64x64',
          type: 'image/png',
        },
      ],
      apple: [
        {
          url: '/assets/icons/app-icon/robotctust-app-icon-1024.png',
          sizes: '1024x1024',
          type: 'image/png',
        },
        {
          url: '/assets/icons/app-icon/robotctust-app-icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          url: '/assets/icons/app-icon/robotctust-app-icon-180.png',
          sizes: '180x180',
          type: 'image/png',
        },
        {
          url: '/assets/icons/app-icon/robotctust-app-icon-167.png',
          sizes: '167x167',
          type: 'image/png',
        },
        {
          url: '/assets/icons/app-icon/robotctust-app-icon-128.png',
          sizes: '128x128',
          type: 'image/png',
        },
        {
          url: '/assets/icons/app-icon/robotctust-app-icon-120.png',
          sizes: '120x120',
          type: 'image/png',
        },
        {
          url: '/assets/icons/app-icon/robotctust-app-icon-76.png',
          sizes: '76x76',
          type: 'image/png',
        },
        {
          url: '/assets/icons/app-icon/robotctust-app-icon-57.png',
          sizes: '57x57',
          type: 'image/png',
        },
      ],
    },
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  userScalable: false,
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  // 驗證語系是否合法
  if (!routing.locales.includes(locale as any)) {
    notFound()
  }

  // 取得翻譯訊息
  const messages = await getMessages()

  return (
    <html lang={locale} suppressHydrationWarning>
      <GoogleAnalytics gaId="G-GRP0752WNN" />
      <Analytics />
      <SpeedInsights />
      <body className={`${notoSansTC.variable} ${dmMono.variable} antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <AuthProvider>
              <ToastProvider>
                <NuqsAdapter>
                  <HeaderProvider config={HEADER_SCROLL_CONFIG}>
                    <ThemeColorMeta />
                    <Header />
                    {children}
                  </HeaderProvider>
                </NuqsAdapter>
              </ToastProvider>
            </AuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
