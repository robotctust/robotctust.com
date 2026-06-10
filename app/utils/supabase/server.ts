import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * 建立 Supabase Server Client
 * @returns {ReturnType<typeof createServerClient>} Supabase Server Client
 */
export async function createClient() {
  // 獲取 cookie store
  const cookieStore = await cookies()

  // 建立 Supabase Server Client
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // 這個 `setAll` 方法是由 Server Component 呼叫的。
            // 如果你有 middleware 負責更新 user session，這可以被忽略。
          }
        },
      },
    },
  )
}
