import { NextRequest } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { NextResponse } from 'next/server'
import { isUserOnboardingComplete } from '@/app/utils/auth/onboarding'

/**
 * [Route] 認證回調路由
 * @param request - NextRequest 物件
 * @returns NextResponse 物件
 */
export async function GET(request: NextRequest) {
  // 獲取 URL 參數
  const { searchParams, origin } = new URL(request.url)
  // 獲取 code 參數
  const code = searchParams.get('code')

  // 如果 code 存在，則交換 code 為 session
  if (code) {
    // 建立 Supabase Client
    const supabase = await createClient()
    // 交換 code 為 session
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    // 如果交換成功，則重定向到 profile 頁面
    if (!error) {
      const next = searchParams.get('next') ?? '/profile'

      // 密碼重設流程：跳過 onboarding 檢查，直接前往重設密碼頁面
      if (next.includes('reset-password')) {
        return NextResponse.redirect(`${origin}${next}`)
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('username, display_name, student_id, school_identity, club_identity')
          .eq('id', user.id)
          .maybeSingle()

        if (!isUserOnboardingComplete(profile)) {
          const onboardingUrl = next
            ? `${origin}/onboarding?next=${encodeURIComponent(next)}`
            : `${origin}/onboarding`
          return NextResponse.redirect(onboardingUrl)
        }
      }

      // 重定向到 next 頁面
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  const next = searchParams.get('next')
  const loginUrl = next
    ? `${origin}/login?error=auth_failed&next=${encodeURIComponent(next)}`
    : `${origin}/login?error=auth_failed`
  return NextResponse.redirect(loginUrl)
}
