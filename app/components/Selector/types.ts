/**
 * Selector 組件的 TypeScript 介面定義
 */

export interface SelectorOption<T = unknown> {
  value: T
  label: string
  count?: number // 可選的計數顯示
  disabled?: boolean // 可選的禁用狀態
}

export interface SelectorOptionGroup<T = unknown> {
  groupLabel: string
  options: SelectorOption<T>[]
}

export interface SelectorProps<T = unknown> {
  // 基本選項配置
  options?: SelectorOption<T>[] // 非分組選項
  groupedOptions?: SelectorOptionGroup<T>[] // 分組選項

  // 選擇模式
  mode: 'single' | 'multiple'

  // 單選模式屬性
  value?: T // 單選值
  onChange?: (value: T) => void // 單選變更回調

  // 多選模式屬性
  values?: T[] // 多選值陣列
  onMultipleChange?: (values: T[]) => void // 多選變更回調
  onClose?: () => void // dropdown 關閉時回調（僅 dropdown variant 有效）

  // 顯示配置
  title?: string // 選擇器標題
  placeholder?: string // 佔位符文字
  disabled?: boolean // 整體禁用
  variant?: 'buttons' | 'dropdown' // 顯示模式
  className?: string // 自定義樣式類

  // 進階配置
  showCount?: boolean // 是否顯示計數
  searchable?: boolean // 是否支援搜尋（未來擴展）
  maxHeight?: number // 下拉選單最大高度
}

export interface SelectorRef {
  close: () => void
  open: () => void
  toggle: () => void
}
