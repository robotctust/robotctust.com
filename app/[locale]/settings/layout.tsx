import { ReactNode } from 'react'
import Page from '@/app/components/page/Page'
import styles from './settings.module.scss'

interface SettingsLayoutProps {
  children: ReactNode
  aside?: ReactNode
}

/**
 * [Component] 設定頁面布局
 * 提供共用的設定側邊欄導航 (aside slot)。
 * 不在此強制登入：部分設定（如外觀、語言）未來將開放未登入使用；
 * 需登入的設定（如帳號安全）由各自的頁面自行把關。
 * @param children - 子元件
 * @param aside - 平行路由 slot：設定導航側邊欄
 */
export default function SettingsLayout({
  children,
  aside,
}: SettingsLayoutProps) {
  return (
    <Page style={styles.container} aside={aside}>
      {children}
    </Page>
  )
}
