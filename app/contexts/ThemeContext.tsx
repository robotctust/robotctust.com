'use client'

import { ThemeProvider as NextThemeProvider } from 'next-themes'
import React from 'react'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange={false}
      storageKey="theme"
    >
      {children}
    </NextThemeProvider>
  )
}

// 重新導出 useTheme hook
export { useTheme } from 'next-themes'
