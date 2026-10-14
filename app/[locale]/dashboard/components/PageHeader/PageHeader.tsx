import type { ReactNode } from 'react'
import styles from './PageHeader.module.scss'

interface PageHeaderProps {
  /** 頁面標題（已翻譯） */
  title: ReactNode
  /** 標題下方的一句說明 */
  description?: ReactNode
  /** 右側的操作按鈕（新增、匯出等） */
  actions?: ReactNode
}

/**
 * [Component] 後台頁首：標題 + 說明 + 右側操作，所有後台頁面共用同一個樣式
 */
export default function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.text}>
        <h1 className={styles.title}>{title}</h1>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  )
}
