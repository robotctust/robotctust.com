import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['zh-TW', 'en'],
  defaultLocale: 'zh-TW',
  localePrefix: 'as-needed',
  // 關閉依 Accept-Language 的自動語系偵測，讓「URL 決定語系」對所有人（含搜尋引擎爬蟲）
  // 保持一致；避免 next-intl 把爬蟲從正規 zh-TW 網址再轉址到 /en，破壞索引。
  // 真人的首訪地區導流仍由 middleware.ts 的自訂 geo 邏輯負責（且會放行爬蟲）。
  localeDetection: false,
})
