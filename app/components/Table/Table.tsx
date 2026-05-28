'use client'

import { useState, useMemo, useRef, useEffect, ChangeEvent, memo } from 'react'
import { useTranslations } from 'next-intl'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faSort,
  faSortUp,
  faSortDown,
  faChevronLeft,
  faChevronRight,
  faMagnifyingGlass,
} from '@fortawesome/free-solid-svg-icons'
import { Skeleton } from '@/app/components/Skeleton'
import { TableColumn, TableProps, SortDirection } from './types'
import styles from './Table.module.scss'

interface CheckboxProps {
  checked: boolean
  onChange: () => void
  indeterminate?: boolean
  ariaLabel?: string
}

const Checkbox = memo(function Checkbox({
  checked,
  onChange,
  indeterminate = false,
  ariaLabel,
}: CheckboxProps) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])

  return (
    <label className={styles.checkboxWrapper}>
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={ariaLabel}
        className={styles.checkboxInput}
      />
      <span className={styles.checkboxBox} />
    </label>
  )
})

function rawValue<T>(row: T, key: string): unknown {
  return (row as Record<string, unknown>)[key]
}

function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0
  if (a == null) return -1
  if (b == null) return 1
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'zh-Hant')
}

export function Table<T>({
  columns,
  data,
  rowKey,
  loading = false,
  emptyMessage = '目前沒有資料',
  skeletonRows = 6,
  searchable = false,
  searchPlaceholder = '搜尋...',
  selectable = false,
  bulkActions,
  pagination = false,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 25, 50],
  defaultSort,
  onRowClick,
  rowClassName,
}: TableProps<T>) {
  const [search, setSearch] = useState('')
  const [filterValues, setFilterValues] = useState<Record<string, string>>(() =>
    columns.reduce<Record<string, string>>((acc, col) => {
      if (col.filter) acc[col.key] = col.filter.defaultValue ?? ''
      return acc
    }, {}),
  )
  const [sort, setSort] = useState<{ key: string; direction: SortDirection }>(
    defaultSort ?? { key: '', direction: null },
  )
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const searchableCols = useMemo(
    () => columns.filter((c) => c.searchable),
    [columns],
  )
  const filterCols = useMemo(() => columns.filter((c) => c.filter), [columns])

  // data → 搜尋 → 過濾 → 排序
  const processed = useMemo(() => {
    let rows = data

    const term = search.trim().toLowerCase()
    if (term && searchableCols.length > 0) {
      rows = rows.filter((row) =>
        searchableCols.some((col) => {
          const v = col.searchAccessor
            ? col.searchAccessor(row)
            : String(rawValue(row, col.key) ?? '')
          return v.toLowerCase().includes(term)
        }),
      )
    }

    for (const col of filterCols) {
      const selectedVal = filterValues[col.key]
      if (selectedVal) {
        rows = rows.filter((row) => col.filter!.accessor(row) === selectedVal)
      }
    }

    if (sort.key && sort.direction) {
      const col = columns.find((c) => c.key === sort.key)
      if (col) {
        const accessor = col.sortAccessor
        rows = [...rows].sort((a, b) => {
          const va = accessor ? accessor(a) : rawValue(a, col.key)
          const vb = accessor ? accessor(b) : rawValue(b, col.key)
          const result = compare(va, vb)
          return sort.direction === 'asc' ? result : -result
        })
      }
    }

    return rows
  }, [data, search, searchableCols, filterCols, filterValues, sort, columns])

  // 分頁切片
  const totalPages = pagination
    ? Math.max(1, Math.ceil(processed.length / pageSize))
    : 1
  const currentPage = Math.min(page, totalPages)
  const pageRows = useMemo(() => {
    if (!pagination) return processed
    const start = (currentPage - 1) * pageSize
    return processed.slice(start, start + pageSize)
  }, [processed, pagination, currentPage, pageSize])

  // 過濾條件變動時回到第一頁
  useEffect(() => {
    setPage(1)
  }, [search, filterValues, pageSize])

  // 選取（作用於過濾後全集，跨頁）
  const selectedRows = useMemo(
    () => processed.filter((row) => selected.has(rowKey(row))),
    [processed, selected, rowKey],
  )
  const allSelected =
    processed.length > 0 && processed.every((row) => selected.has(rowKey(row)))
  const someSelected = selectedRows.length > 0 && !allSelected

  function toggleAll() {
    setSelected((prev) => {
      if (allSelected) {
        const next = new Set(prev)
        processed.forEach((row) => next.delete(rowKey(row)))
        return next
      }
      const next = new Set(prev)
      processed.forEach((row) => next.add(rowKey(row)))
      return next
    })
  }

  function toggleRow(key: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function clearSelection() {
    setSelected(new Set())
  }

  function handleSort(col: TableColumn<T>) {
    if (!col.sortable) return
    setSort((prev) => {
      if (prev.key !== col.key) return { key: col.key, direction: 'asc' }
      if (prev.direction === 'asc') return { key: col.key, direction: 'desc' }
      if (prev.direction === 'desc') return { key: '', direction: null }
      return { key: col.key, direction: 'asc' }
    })
  }

  function sortIcon(col: TableColumn<T>) {
    if (!col.sortable) return null
    if (sort.key !== col.key) return faSort
    if (sort.direction === 'asc') return faSortUp
    if (sort.direction === 'desc') return faSortDown
    return faSort
  }

  const t = useTranslations('Components.Table')
  const hasToolbar = searchable || filterCols.length > 0

  return (
    <div className={styles.root}>
      {hasToolbar && (
        <div className={styles.toolbar}>
          {searchable && (
            <div className={styles.searchBox}>
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className={styles.searchIcon}
              />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.searchInput}
              />
            </div>
          )}
          {filterCols.length > 0 && (
            <div className={styles.filters}>
              {filterCols.map((col) => (
                <select
                  key={col.key}
                  value={filterValues[col.key] ?? ''}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                    setFilterValues((prev) => ({
                      ...prev,
                      [col.key]: e.target.value,
                    }))
                  }
                  className={styles.filterSelect}
                >
                  <option value="">{col.filter!.placeholder ?? t('filterAll')}</option>
                  {col.filter!.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ))}
            </div>
          )}
        </div>
      )}

      {selectable && selectedRows.length > 0 && (
        <div className={styles.selectionBar}>
          <span className={styles.selectionCount}>
            {t('selectionCount', { count: selectedRows.length })}
          </span>
          <div className={styles.selectionActions}>
            {bulkActions?.(selectedRows, clearSelection)}
            <button
              type="button"
              className={styles.clearButton}
              onClick={clearSelection}
            >
              {t('clearSelection')}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <Skeleton variant="table-row" count={skeletonRows} />
      ) : processed.length === 0 ? (
        <div className={styles.emptyState}>{emptyMessage}</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                {selectable && (
                  <th className={styles.checkboxCell}>
                    <Checkbox
                      checked={allSelected}
                      onChange={toggleAll}
                      indeterminate={someSelected}
                      ariaLabel={t('selectAll')}
                    />
                  </th>
                )}
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={[
                      col.sortable ? styles.sortable : '',
                      col.headerClassName ?? '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={{ width: col.width, minWidth: col.minWidth, textAlign: col.align }}
                    onClick={() => handleSort(col)}
                  >
                    <span className={styles.headerContent}>
                      {col.header}
                      {col.sortable && (
                        <FontAwesomeIcon
                          icon={sortIcon(col)!}
                          className={[
                            styles.sortIcon,
                            sort.key === col.key && sort.direction
                              ? styles.sortIconActive
                              : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => {
                const key = rowKey(row)
                const extraClass = rowClassName?.(row)
                return (
                  <tr
                    key={key}
                    className={[
                      onRowClick ? styles.clickableRow : '',
                      selected.has(key) ? styles.selectedRow : '',
                      extraClass ?? '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {selectable && (
                      <td
                        className={styles.checkboxCell}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={selected.has(key)}
                          onChange={() => toggleRow(key)}
                          ariaLabel={t('selectRow')}
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={[
                          col.nowrap ? styles.nowrap : '',
                          col.className ?? '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        style={{ minWidth: col.minWidth, textAlign: col.align }}
                      >
                        {col.render
                          ? col.render(row)
                          : String(rawValue(row, col.key) ?? '')}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {pagination && !loading && processed.length > 0 && (
        <div className={styles.pagination}>
          <div className={styles.pageSizeControl}>
            <span>{t('perPage')}</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className={styles.pageSizeSelect}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span>{t('itemsUnit')}</span>
          </div>
          <div className={styles.pageControl}>
            <span className={styles.pageInfo}>
              {t('pageInfo', { total: processed.length, current: currentPage, totalPages })}
            </span>
            <button
              type="button"
              className={styles.pageButton}
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label={t('prevPage')}
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <button
              type="button"
              className={styles.pageButton}
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label={t('nextPage')}
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
