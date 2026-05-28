import { ReactNode } from 'react'

export type SortDirection = 'asc' | 'desc' | null

// 欄位下拉過濾設定
export interface ColumnFilter<T> {
  // 下拉選項；不含「全部」選項，由 placeholder 自動補上
  options: { label: string; value: string }[]
  // 取出該列用於比對選項 value 的字串
  accessor: (row: T) => string
  // 「全部」選項文字，選它＝不過濾。預設「全部」
  placeholder?: string
  // 預設選取值，預設 ''（全部）
  defaultValue?: string
}

export interface TableColumn<T> {
  // 唯一 id，也是預設排序的 key
  key: string
  header: ReactNode
  // cell 內容；省略則顯示 row[key]
  render?: (row: T) => ReactNode
  // 是否可點表頭排序
  sortable?: boolean
  // 排序比較值；省略則用 row[key]
  sortAccessor?: (row: T) => string | number | Date
  // 是否納入全域搜尋
  searchable?: boolean
  // 搜尋比對字串；省略則用 row[key]
  searchAccessor?: (row: T) => string
  // 開放此欄下拉過濾
  filter?: ColumnFilter<T>
  width?: string
  minWidth?: string
  align?: 'left' | 'center' | 'right'
  nowrap?: boolean
  // 套用到 td 的 class
  className?: string
  // 套用到 th 的 class
  headerClassName?: string
}

export interface TableProps<T> {
  columns: TableColumn<T>[]
  data: T[]
  // 每列穩定 key
  rowKey: (row: T) => string

  // 狀態
  loading?: boolean
  emptyMessage?: ReactNode
  skeletonRows?: number

  // 搜尋（內建於表格上方、與表格分離）
  searchable?: boolean
  searchPlaceholder?: string

  // 列選取 + 批量動作
  selectable?: boolean
  // 渲染批量動作；selected 為已選列、clear 清除選取
  bulkActions?: (selected: T[], clear: () => void) => ReactNode

  // client-side 分頁
  pagination?: boolean
  pageSize?: number
  pageSizeOptions?: number[]

  // 預設排序
  defaultSort?: { key: string; direction: 'asc' | 'desc' }
  // 列點擊
  onRowClick?: (row: T) => void
  // 動態列 class（供 newRow 高亮等）
  rowClassName?: (row: T) => string | undefined
}
