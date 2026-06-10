import { forwardRef, type InputHTMLAttributes } from 'react'
import styles from './Settings.module.scss'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** 決定 focus 邊框 / shadow 顏色（primary vs red） */
  variant?: 'default' | 'danger'
}

/**
 * [Component] 設定頁通用輸入框
 */
const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { variant = 'default', className = '', ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={[
        styles.input,
        variant === 'danger' ? styles.danger : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    />
  )
})

export default Input
