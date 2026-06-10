'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useToast } from '@/app/contexts/ToastContext'

const FLASH_COOKIE = 'auth_flash'

/**
 * [Component] OAuth 登入成功的 Toast 提示
 *
 * /auth/callback 真正交換 session 成功後會種下 auth_flash cookie；
 * 此元件於使用者抵達目的頁（可能經過 /profile → /@username 等多次轉導）時
 * 讀取 cookie、顯示對應 Toast 並立即清除，避免重複。
 *
 * 為何不在按鈕點擊當下提示：Google 登入是整頁轉導，點擊只是「發起」轉導，
 * 真正成功與否要等 callback 才知道，故成功提示必須延後到抵達後。
 */
export default function AuthFlashToast() {
  const t = useTranslations('Login')
  const { showToast } = useToast()

  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)auth_flash=([^;]+)/)
    if (!match) return

    // 先清除，避免重新整理或重複觸發
    document.cookie = `${FLASH_COOKIE}=; path=/; max-age=0`

    const value = decodeURIComponent(match[1])
    if (value === 'google_success') {
      showToast(t('form.login.toast.googleSuccess'), 'success')
    }
  }, [showToast, t])

  return null
}
