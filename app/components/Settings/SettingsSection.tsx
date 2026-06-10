import type { ReactNode } from 'react'
import styles from './Settings.module.scss'

interface SettingsSectionProps {
  /** 區塊標題（已翻譯） */
  title: string
  /** danger → 標題紅色 */
  variant?: 'default' | 'danger'
  /** 一組 SettingsItem */
  children: ReactNode
}

/**
 * [Component] 設定區塊容器
 * 取代各設定頁重複的 section + 標題樣式
 */
export default function SettingsSection({
  title,
  variant = 'default',
  children,
}: SettingsSectionProps) {
  return (
    <section className={styles.section}>
      <h2
        className={`${styles.section_title} ${
          variant === 'danger' ? styles.danger : ''
        }`}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}
