import styles from './Settings.module.scss'

interface ToggleProps {
  /** 是否開啟 */
  checked: boolean
  /** 切換回呼，帶入下一個狀態 */
  onChange: (next: boolean) => void
  /** 無障礙標籤 */
  ariaLabel?: string
  /** 停用 */
  disabled?: boolean
}

/**
 * [Component] 設定頁開關（switch）
 * 抽自個人資料編輯頁的公開帳號 toggle，統一為共用元件。
 */
export default function Toggle({
  checked,
  onChange,
  ariaLabel,
  disabled = false,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      className={`${styles.toggle} ${checked ? styles.toggle_on : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.toggle_thumb} />
    </button>
  )
}
