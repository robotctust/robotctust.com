import { createClient } from '@supabase/supabase-js'

/**
 * 公開讀取用的 Supabase client：publishable 金鑰、不帶 cookie、不維持 session。
 * RLS 下等同未登入訪客，專供公開頁讀取公開資料。
 *
 * 為什麼不用 server.ts：那個會讀 cookies()，整頁會被迫動態渲染、吃不到 CDN 快取。
 */
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
