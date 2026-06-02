'use client'

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useImperativeHandle,
} from 'react'
import { createPortal } from 'react-dom'
import styles from './Selector.module.scss'
import { SelectorProps, SelectorOption, SelectorRef } from './types'

/**
 * 多功能選擇器組件
 * 支援單選/多選模式、分組選項、下拉選單和按鈕組顯示
 * @param props.options 非分組選項
 * @param props.groupedOptions 分組選項
 * @param props.mode 選擇模式
 * @param props.value 單選值
 * @param props.onChange 單選變更回調
 * @param props.values 多選值陣列
 * @param props.onMultipleChange 多選變更回調
 * @param props.title 選擇器標題
 * @param props.placeholder 佔位符文字
 * @param props.disabled 整體禁用
 * @param props.variant 顯示模式
 * @param props.className 自定義樣式類
 * @param props.showCount 是否顯示計數
 * @param props.maxHeight 下拉選單最大高度
 * @param props.ref 組件引用
 * @returns 多功能選擇器組件
 */
function Selector<T = unknown>(
  props: SelectorProps<T> & { ref?: React.Ref<SelectorRef> }
) {
  const { ref, ...otherProps } = props
  const {
    options = [],
    groupedOptions = [],
    mode,
    value,
    onChange,
    values = [],
    onMultipleChange,
    onClose,
    title,
    placeholder = '請選擇...',
    disabled = false,
    variant = 'dropdown',
    className = '',
    showCount = false,
    maxHeight = 300,
  } = otherProps
  // 下拉選單是否開啟
  const [isOpen, setIsOpen] = useState(false)
  // 選擇器引用
  const selectorRef = useRef<HTMLDivElement>(null)
  // 下拉選單引用
  const dropdownRef = useRef<HTMLDivElement>(null)
  // portal dropdown 的 fixed 定位
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 })

  useEffect(() => {
    if (!isOpen || !selectorRef.current) return
    function updatePos() {
      if (!selectorRef.current) return
      const r = selectorRef.current.getBoundingClientRect()
      setDropdownPos({ top: r.bottom, left: r.left, width: r.width })
    }
    updatePos()
    window.addEventListener('scroll', updatePos, true)
    window.addEventListener('resize', updatePos)
    return () => {
      window.removeEventListener('scroll', updatePos, true)
      window.removeEventListener('resize', updatePos)
    }
  }, [isOpen])

  // 用 ref 存 onClose 避免 effect 因 callback 換參考而重複觸發
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })

  // dropdown 從 open → close 時呼叫 onClose
  const didOpen = useRef(false)
  useEffect(() => {
    if (isOpen) {
      didOpen.current = true
    } else if (didOpen.current) {
      didOpen.current = false
      onCloseRef.current?.()
    }
  }, [isOpen])

  //* 合併所有選項（分組和非分組）
  const allOptions = useMemo(() => {
    // 合併所有選項（分組和非分組）
    const flatOptions: SelectorOption<T>[] = [...options]
    // 合併分組選項
    groupedOptions.forEach((group) => {
      flatOptions.push(...group.options)
    })
    return flatOptions
  }, [options, groupedOptions])

  //* 取得顯示文字
  const getDisplayText = useCallback(() => {
    if (mode === 'single') {
      // 單選模式
      if (value === undefined || value === null) return placeholder
      const selectedOption = allOptions.find((opt) => opt.value === value)
      return selectedOption?.label || placeholder
    } else if (mode === 'multiple') {
      // 多選模式
      if (values.length === 0) return placeholder
      if (values.length === 1) {
        const selectedOption = allOptions.find((opt) => opt.value === values[0])
        return selectedOption?.label || placeholder
      }
      return `已選擇 ${values.length} 項`
    }
  }, [mode, value, values, allOptions, placeholder])

  //* 處理單選
  const handleSingleSelect = useCallback(
    (selectedValue: T) => {
      onChange?.(selectedValue)
      setIsOpen(false) // 單選模式立即關閉
    },
    [onChange]
  )

  //* 處理多選
  const handleMultipleSelect = useCallback(
    (selectedValue: T) => {
      const newValues = values.includes(selectedValue)
        ? values.filter((v) => v !== selectedValue) // 取消選擇
        : [...values, selectedValue] // 添加選擇
      onMultipleChange?.(newValues)
      // 多選模式不自動關閉
    },
    [values, onMultipleChange]
  )

  //* 處理選項點擊
  const handleOptionClick = useCallback(
    (optionValue: T) => {
      if (disabled) return

      if (mode === 'single') {
        handleSingleSelect(optionValue)
      } else if (mode === 'multiple') {
        handleMultipleSelect(optionValue)
      }
    },
    [mode, disabled, handleSingleSelect, handleMultipleSelect]
  )

  //* 處理觸發器點擊
  const handleTriggerClick = useCallback(() => {
    if (disabled) return
    setIsOpen(!isOpen)
  }, [disabled, isOpen])

  //* 點擊外部關閉選單（portal 版：需同時排除 dropdownRef）
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        selectorRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) return
      setIsOpen(false)
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen])

  //* 鍵盤事件處理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [isOpen])

  //* 暴露給父組件的方法
  useImperativeHandle(ref, () => ({
    close: () => setIsOpen(false),
    open: () => setIsOpen(true),
    toggle: () => setIsOpen(!isOpen),
  }))

  //* 檢查選項是否被選中
  const isOptionSelected = useCallback(
    (optionValue: T) => {
      if (mode === 'single') {
        return value === optionValue
      } else {
        return values.includes(optionValue)
      }
    },
    [mode, value, values]
  )

  //* 渲染選項
  const renderOption = useCallback(
    (option: SelectorOption<T>) => (
      <div
        key={String(option.value)}
        className={`${styles.option} ${
          isOptionSelected(option.value) ? styles.selected : ''
        } ${option.disabled ? styles.disabled : ''}`}
        onClick={() => !option.disabled && handleOptionClick(option.value)}
      >
        {/* 顯示選項文字 */}
        <span className={styles.optionLabel}>{option.label}</span>
        {/* 顯示計數 */}
        {showCount && option.count !== undefined && (
          <span className={styles.optionCount}>({option.count})</span>
        )}
        {/* 多選模式顯示勾選框 */}
        {mode === 'multiple' && (
          <span
            className={`${styles.checkbox} ${
              isOptionSelected(option.value) ? styles.checked : ''
            }`}
          >
            {isOptionSelected(option.value) ? '✓' : ''}
          </span>
        )}
      </div>
    ),
    [showCount, mode, isOptionSelected, handleOptionClick]
  )

  //* 渲染分組選項
  const renderGroupedOptions = useCallback(
    () => (
      <>
        {groupedOptions.map((group, groupIndex) => (
          <div key={groupIndex} className={styles.optionGroup}>
            <div className={styles.groupLabel}>{group.groupLabel}</div>
            <div className={styles.groupOptions}>
              {group.options.map(renderOption)}
            </div>
          </div>
        ))}
      </>
    ),
    [groupedOptions, renderOption]
  )

  //* 渲染非分組選項
  const renderFlatOptions = useCallback(
    () => <div className={styles.optionsList}>{options.map(renderOption)}</div>,
    [options, renderOption]
  )

  //* 按鈕組模式渲染
  if (variant === 'buttons') {
    return (
      <div className={`${styles.selectorContainer} ${className}`}>
        {title && <h2 className={styles.selectorTitle}>{title}</h2>}
        <div className={styles.buttonGroup}>
          {options.map((option) => (
            <button
              key={String(option.value)}
              onClick={() => handleOptionClick(option.value)}
              className={`${styles.button} ${
                isOptionSelected(option.value) ? styles.active : ''
              } ${option.disabled ? styles.disabled : ''}`}
              disabled={disabled || option.disabled}
            >
              <span className={styles.buttonLabel}>{option.label}</span>
              {showCount && option.count !== undefined && (
                <span className={styles.buttonCount}>({option.count})</span>
              )}
            </button>
          ))}
        </div>
      </div>
    )
  }

  //* 下拉選單模式渲染
  return (
    <div
      ref={selectorRef}
      className={`${styles.selector} ${disabled ? styles.disabled : ''} ${isOpen ? styles.active : ''}`}
    >
      <div
        className={`${styles.trigger} ${isOpen ? styles.open : ''}`}
        onClick={handleTriggerClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-disabled={disabled}
      >
        <span className={styles.triggerText}>{getDisplayText()}</span>
        <span className={`${styles.arrow} ${isOpen ? styles.up : styles.down}`}>
          ▼
        </span>
      </div>

      {isOpen && createPortal(
        <div
          className={styles.dropdownPortal}
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
            maxHeight: `${maxHeight}px`,
          }}
          role="listbox"
          aria-multiselectable={mode === 'multiple'}
        >
          {groupedOptions.length > 0
            ? renderGroupedOptions()
            : renderFlatOptions()}

          {mode === 'multiple' && values.length > 0 && (
            <div className={styles.dropdownFooter}>
              <button
                className={styles.clearButton}
                onClick={() => onMultipleChange?.([])}
              >
                清除所有選擇
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}

export default Selector
