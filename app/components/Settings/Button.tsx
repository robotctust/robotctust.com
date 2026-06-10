import type { ButtonHTMLAttributes } from 'react'
import styles from './Settings.module.scss'

type ButtonVariant = 'outline' | 'primary' | 'danger-outline' | 'danger-solid'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 視覺變體 */
  variant?: ButtonVariant
  /** 尺寸：sm（行內，預設）/ md（彈窗等較大按鈕） */
  size?: 'sm' | 'md'
  /** 成功態（如「已寄出」綠色不可點） */
  success?: boolean
}

const variantClass: Record<ButtonVariant, string> = {
  outline: styles.outline,
  primary: styles.primary,
  'danger-outline': styles.danger_outline,
  'danger-solid': styles.danger_solid,
}

/**
 * [Component] 設定頁通用按鈕
 * 統一 padding / transition / hover / disabled，variant 只覆寫顏色
 */
export default function Button({
  variant = 'outline',
  size = 'sm',
  success = false,
  type = 'button',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        styles.button,
        variantClass[variant],
        size === 'md' ? styles.md : '',
        success ? styles.success : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </button>
  )
}
