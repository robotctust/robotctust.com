import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * [Middleware] 更新 session
 * @param {NextRequest} request - NextRequest 物件
 * @param {NextResponse} [response] - 可選的 NextResponse 物件 (例如來自 next-intl)
 * @returns {NextResponse} NextResponse 物件
 */
export async function updateSession(request: NextRequest, response?: NextResponse) {
  // 如果有傳入 response 就使用它，否則建立新的
  let supabaseResponse = response || NextResponse.next({
    request,
  })

  // 建立 Supabase Server Client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        // 獲取所有 cookies
        getAll() {
          return request.cookies.getAll()
        },
        // 設定所有 cookies
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          
          // 如果沒有傳入 response，則建立一個新的 NextResponse.next
          if (!response) {
            supabaseResponse = NextResponse.next({
              request,
            })
          }

          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // 取得使用者以重新整理 auth token
  await supabase.auth.getUser()

  return supabaseResponse
}
