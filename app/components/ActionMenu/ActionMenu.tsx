'use client'

import React, { useState, useRef, useEffect, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEllipsis } from '@fortawesome/free-solid-svg-icons'
import styles from './ActionMenu.module.scss'

interface ActionMenuProps {
  className?: string
  triggerClassName?: string
  children: ReactNode
  // 觸發鈕只有圖示，必須提供（已翻譯）
  ariaLabel: string
}

export default function ActionMenu({
  className,
  triggerClassName,
  children,
  ariaLabel,
}: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState<{
    top: number
    left: number
  } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        isOpen &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    function handleScroll() {
      if (isOpen) {
        setIsOpen(false)
      }
    }

    // 鍵盤：Esc 關閉並把焦點還給觸發鈕；上下鍵在項目間移動
    function handleKeyDown(event: KeyboardEvent) {
      if (!isOpen || !menuRef.current) return
      if (event.key === 'Escape') {
        setIsOpen(false)
        buttonRef.current?.focus()
        return
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
      event.preventDefault()
      const items = Array.from(
        menuRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]'),
      )
      const current = items.indexOf(document.activeElement as HTMLElement)
      const next = event.key === 'ArrowDown' ? current + 1 : current - 1
      items[(next + items.length) % items.length]?.focus()
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', handleScroll, { capture: true })
    window.addEventListener('resize', handleScroll)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', handleScroll, { capture: true })
      window.removeEventListener('resize', handleScroll)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setMenuPosition(null)
      return
    }

    if (buttonRef.current && menuRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect()
      const menuRect = menuRef.current.getBoundingClientRect()

      let top = buttonRect.bottom
      let left = buttonRect.right - menuRect.width

      // Avoid right edge
      if (left < 0) {
        left = 8
      }
      if (left + menuRect.width > window.innerWidth) {
        left = window.innerWidth - menuRect.width - 8
      }

      // Avoid bottom edge
      if (top + menuRect.height > window.innerHeight) {
        top = buttonRect.top - menuRect.height - 4
      } else {
        top = top + 4
      }

      setMenuPosition({ top, left })
    }
  }, [isOpen])

  return (
    <div className={`${styles.container}${className ? ` ${className}` : ''}`}>
      <button
        ref={buttonRef}
        type="button"
        className={`${styles.triggerButton}${triggerClassName ? ` ${triggerClassName}` : ''}`}
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          setIsOpen((prev) => !prev)
        }}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <FontAwesomeIcon icon={faEllipsis} />
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            className={styles.menuDropdown}
            style={{
              position: 'fixed',
              top: menuPosition ? `${menuPosition.top}px` : 0,
              left: menuPosition ? `${menuPosition.left}px` : 0,
              zIndex: 'var(--z-popover)',
              opacity: menuPosition ? 1 : 0,
              pointerEvents: menuPosition ? 'auto' : 'none',
            }}
            onClick={(e) => {
              e.stopPropagation()
              setIsOpen(false)
            }}
          >
            {children}
          </div>,
          document.body,
        )}
    </div>
  )
}
