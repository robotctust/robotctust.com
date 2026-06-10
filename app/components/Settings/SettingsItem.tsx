import type { ReactNode } from 'react'
import styles from './Settings.module.scss'

interface SettingsItemProps {
  /** 項目標題（已翻譯） */
  label: string
  /** 項目說明 */
  hint?: ReactNode
  /** danger → 紅色邊框與淡背景 */
  variant?: 'default' | 'danger'
  /** 右側控制項 slot（按鈕等） */
  children?: ReactNode
  /** 選用：附在本列下方的展開面板（如更改 Email 表單） */
  expanded?: ReactNode
}

/**
 * [Component] 設定項目列
 * 左側「標籤 + 說明」、右側控制項 slot；可選下方展開面板
 */
export default function SettingsItem({
  label,
  hint,
  variant = 'default',
  children,
  expanded,
}: SettingsItemProps) {
  const isDanger = variant === 'danger'

  return (
    <>
      <div
        className={`${styles.item} ${isDanger ? styles.danger : ''} ${
          expanded ? styles.attached : ''
        }`}
      >
        <div className={styles.item_info}>
          <span className={styles.item_label}>{label}</span>
          {hint !== undefined && hint !== null && (
            <span className={styles.item_hint}>{hint}</span>
          )}
        </div>
        {children}
      </div>
      {expanded && <div className={styles.panel}>{expanded}</div>}
    </>
  )
}
