'use client'

import React, { useMemo, useState, useEffect } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCode,
  faTimes,
  faChevronDown,
  faChevronRight,
  faCopy,
  faCheck,
} from '@fortawesome/free-solid-svg-icons'
import styles from './CourseContentRenderer.module.scss'
import Img from '@/app/components/Img/Img'
import { CourseContent, Program } from '@/app/types/course-admin'
import { useCourseMobileFab } from '../../contexts/CourseMobileFabContext'
import { useHeaderState } from '@/app/contexts/HeaderContext'

interface CourseContentRendererProps {
  contents: CourseContent[]
}

type ContentGroup =
  | { type: 'single'; block: CourseContent }
  | { type: 'program-group'; program: Program; blocks: CourseContent[] }

interface SharedSyntaxHighlighterProps {
  language: string
  children: string
  customStyle?: React.CSSProperties
  showLineNumbers?: boolean
  PreTag?: any
  [key: string]: any
}

// 統一管理的 SyntaxHighlighter 包裝器
const SharedSyntaxHighlighter: React.FC<SharedSyntaxHighlighterProps> = ({
  language,
  children,
  customStyle = {},
  showLineNumbers = true,
  PreTag,
  ...rest
}) => (
  <SyntaxHighlighter
    {...rest}
    language={language}
    style={oneDark as any}
    showLineNumbers={showLineNumbers}
    PreTag={PreTag}
    customStyle={{
      margin: 0,
      padding: '6px',
      fontSize: '12px',
      background: 'transparent',
      ...customStyle, // 留下個別覆蓋的彈性 (如 borderRadius, fontSize)
    }}
    lineNumberStyle={{
      minWidth: '32px',
      paddingRight: '6px',
      textAlign: 'right',
      textShadow: 'none',
      // position: 'sticky',
      // left: 0,
      // background: 'var(--background-secondary)',
    }}
  >
    {children}
  </SyntaxHighlighter>
)

const CopyButton = ({ text, className }: { text: string; className?: string }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      className={className}
      onClick={handleCopy}
      title="複製程式碼"
      aria-label="複製程式碼"
    >
      <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
    </button>
  )
}

export const CourseContentRenderer: React.FC<CourseContentRendererProps> = ({
  contents,
}) => {
  const { isCompactHeader } = useHeaderState()
  const [visiblePrograms, setVisiblePrograms] = useState<Set<string>>(new Set())
  const [manualProgramId, setManualProgramId] = useState<string | null>(null)

  const [isExpandedFAB, setIsExpandedFAB] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { registerAction, unregisterAction } = useCourseMobileFab()

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1200)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const groupedContents = useMemo(() => {
    const groups: ContentGroup[] = []
    let currentGroup: { program: Program; blocks: CourseContent[] } | null =
      null

    contents.forEach((block) => {
      if (block.program) {
        if (currentGroup && currentGroup.program.id === block.program.id) {
          currentGroup.blocks.push(block)
        } else {
          currentGroup = { program: block.program, blocks: [block] }
          groups.push({ type: 'program-group', ...currentGroup })
        }
      } else {
        currentGroup = null
        groups.push({ type: 'single', block })
      }
    })
    return groups
  }, [contents])

  const programsList = useMemo(() => {
    const map = new Map<string, Program>()
    contents.forEach((b) => {
      if (b.program && !map.has(b.program.id)) {
        map.set(b.program.id, b.program)
      }
    })
    return Array.from(map.values())
  }, [contents])

  // 監測滾動以切換顯示的程式碼
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        setVisiblePrograms((prev) => {
          const next = new Set(prev)
          entries.forEach((entry) => {
            const id = (entry.target as HTMLElement).dataset.pid
            if (id) {
              // 放大閾值：只要有一點點進入畫面，不論多大多小，都加入可見清單
              if (entry.isIntersecting) {
                next.add(id)
              } else {
                next.delete(id)
              }
            }
          })
          return next
        })
      },
      // rootMargin 將觀測區域稍微縮小於上下邊緣，避免一點點邊緣就觸發切換
      { threshold: 0.1, rootMargin: '-20% 0px -70% 0px' },
    )

    document
      .querySelectorAll('[data-program-group]')
      .forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [groupedContents])

  // 優先顯示依照文件順序第一個進入畫面的程式碼段落
  const activeProgramId = useMemo(() => {
    for (const group of groupedContents) {
      if (
        group.type === 'program-group' &&
        visiblePrograms.has(group.program.id)
      ) {
        return group.program.id
      }
    }
    return null
  }, [visiblePrograms, groupedContents])

  // 當滾動切換到新的 activeProgramId 時，解除手動設定
  const [displayProgramId, setDisplayProgramId] = useState<string | null>(null)

  useEffect(() => {
    if (activeProgramId && activeProgramId !== displayProgramId) {
      setDisplayProgramId(activeProgramId)
      setManualProgramId(null) // 內容到達新段落，復原手動操作
    } else if (!activeProgramId) {
      // 全都離開畫面了
      setDisplayProgramId(null)
    }
  }, [activeProgramId, displayProgramId])

  // 最終實際決定展開的程式 ID
  const finalDisplayId = manualProgramId || displayProgramId
  const finalDisplayProgram = finalDisplayId
    ? programsList.find((p) => p.id === finalDisplayId) || null
    : null

  const handleToggleManual = (id: string, currentlyExpanded: boolean) => {
    if (currentlyExpanded) {
      // 收合
      setManualProgramId(null)
      setDisplayProgramId(null) // 也清空目前的滾動，讓他呈現全收合
    } else {
      // 展開
      setManualProgramId(id)
    }
  }

  // Handle registering the Code FAB
  useEffect(() => {
    if (isMobile && finalDisplayProgram && !isExpandedFAB) {
      registerAction({
        id: 'program-code',
        type: 'button',
        variant: 'primary',
        priority: 10,
        icon: faCode,
        label: finalDisplayProgram.name,
        onClick: () => setIsExpandedFAB(true),
      })
    } else {
      unregisterAction('program-code')
    }

    return () => unregisterAction('program-code')
  }, [
    isMobile,
    finalDisplayProgram,
    isExpandedFAB,
    registerAction,
    unregisterAction,
  ])

  const renderBlockContent = (block: CourseContent) => {
    const headerId = `block-${block.id}`
    switch (block.type) {
      case 'header1':
        return (
          <h1 id={headerId} className={styles.header1}>
            <span>{block.content}</span>
          </h1>
        )
      case 'header2':
        return (
          <h2 id={headerId} className={styles.header2}>
            <span>{block.content}</span>
          </h2>
        )
      case 'header3':
        return (
          <h3 id={headerId} className={styles.header3}>
            <span>{block.content}</span>
          </h3>
        )
      case 'text':
        return <p className={styles.text}>{block.content}</p>
      case 'code':
        return (
          <div className={styles.codeBlock}>
            <SharedSyntaxHighlighter
              language="cpp"
              customStyle={{ borderRadius: '8px', fontSize: '12px' }}
            >
              {block.content}
            </SharedSyntaxHighlighter>
          </div>
        )
      case 'markdown':
        return (
          <div className={styles.markdownContent}>
            <Markdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children, ...props }) => (
                  <h1 id={`block-${block.id}-mdh1`} {...props}>
                    <span>{children}</span>
                  </h1>
                ),
                h2: ({ children, ...props }) => (
                  <h2 id={`block-${block.id}-mdh2`} {...props}>
                    <span>{children}</span>
                  </h2>
                ),
                h3: ({ children, ...props }) => (
                  <h3 id={`block-${block.id}-mdh3`} {...props}>
                    <span>{children}</span>
                  </h3>
                ),
                table: ({ ...props }) => (
                  <div className={styles.tableContainer}>
                    <table {...props} />
                  </div>
                ),
                code({ children, className, ...rest }) {
                  const match = /language-(\w+)/.exec(className || '')
                  return match ? (
                    <SharedSyntaxHighlighter
                      {...(rest as any)}
                      PreTag="div"
                      language={match[1]}
                      showLineNumbers={false}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SharedSyntaxHighlighter>
                  ) : (
                    <code {...rest} className={styles.inlineCode}>
                      {children}
                    </code>
                  )
                },
              }}
            >
              {block.content}
            </Markdown>
          </div>
        )
      case 'image':
        return (
          <div className={styles.imageBlock}>
            <Img
              src={block.content}
              alt=""
              className={styles.courseImage}
              sizes="(max-width: 900px) 100vw, 900px"
              progressive
            />
          </div>
        )
      default:
        return (
          <div className={styles.unsupported}>
            [不支援的區塊格式: {block.type}]
          </div>
        )
    }
  }

  // 共用小卡頭部（檔名、語言、標籤等）
  const WindowHeader = ({
    program,
    isExpanded,
    onClick,
    showClose = false,
  }: {
    program: Program
    isExpanded: boolean
    onClick?: () => void
    showClose?: boolean
  }) => (
    <div
      className={`${styles.windowHeader} ${isExpanded ? styles.activeHeader : ''}`}
      onClick={onClick}
    >
      {!showClose && (
        <FontAwesomeIcon
          icon={isExpanded ? faChevronDown : faChevronRight}
          className={styles.chevron}
        />
      )}
      {/* <div className={styles.windowDots}>
        <span className={styles.dotRed}></span>
        <span className={styles.dotYellow}></span>
        <span className={styles.dotGreen}></span>
      </div> */}
      <div className={styles.windowTitle}>
        {program.name}
        {program.language && (
          <span className={styles.langBadge}>{program.language}</span>
        )}
      </div>
      <div className={styles.headerActions} onClick={(e) => e.stopPropagation()}>
        <CopyButton text={program.code_content} className={styles.actionBtn} />
        {showClose && (
          <button
            className={styles.actionBtn}
            onClick={(e) => {
              e.stopPropagation()
              onClick?.()
            }}
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        )}
      </div>
    </div>
  )

  return (
    <article
      className={`${styles.courseContentWrapper} ${programsList.length === 0 ? styles.noPrograms : ''}`}
    >
      {/* 內文欄位 */}
      <div className={styles.contentColumn}>
        {groupedContents.map((group, index) => {
          if (group.type === 'program-group') {
            const isGroupActive = finalDisplayId === group.program.id
            return (
              <section
                key={`group-${index}`}
                className={`${styles.blockWithProgram} ${isGroupActive ? styles.isActiveGroup : ''}`}
                data-program-group
                data-pid={group.program.id}
              >
                <button
                  className={`${styles.programAnchorIcon} ${isGroupActive ? styles.active : ''}`}
                  onClick={() => handleToggleManual(group.program.id, isGroupActive)}
                  title="展開/收合對應程式碼"
                  aria-label="展開對應程式碼"
                >
                  <FontAwesomeIcon icon={faCode} />
                </button>
                {group.blocks.map((block) => (
                  <div key={block.id} className={styles.innerBlock}>
                    {renderBlockContent(block)}
                  </div>
                ))}
              </section>
            )
          }

          return (
            <section key={group.block.id} className={styles.singleBlock}>
              {renderBlockContent(group.block)}
            </section>
          )
        })}
      </div>

      {/* 電腦版右側固定的所有 Program 列表 */}
      {!isMobile && programsList.length > 0 && (
        <div
          className={`${styles.programSidebar} ${isCompactHeader ? styles.headerCompact : ''}`}
        >
          {programsList.map((prog) => {
            const isExpanded = prog.id === finalDisplayId
            return (
              <div
                key={prog.id}
                className={`${styles.programWindowCard} ${isExpanded ? styles.expanded : styles.collapsed}`}
              >
                <WindowHeader
                  program={prog}
                  isExpanded={isExpanded}
                  onClick={() => handleToggleManual(prog.id, isExpanded)}
                />
                {isExpanded && (
                  <div className={styles.windowContent}>
                    <SharedSyntaxHighlighter language={prog.language || 'cpp'}>
                      {prog.code_content}
                    </SharedSyntaxHighlighter>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 手機版：展開後的浮層 */}
      {isMobile && finalDisplayProgram && isExpandedFAB && (
        <div className={`${styles.floatingOverlay} ${styles.isExpanded}`}>
          <div className={styles.mobileFloatingWindow}>
            <WindowHeader
              program={finalDisplayProgram}
              isExpanded={true}
              onClick={() => setIsExpandedFAB(false)}
              showClose={true}
            />
            <div className={styles.windowContent}>
              <SharedSyntaxHighlighter
                language={finalDisplayProgram.language || 'cpp'}
              >
                {finalDisplayProgram.code_content}
              </SharedSyntaxHighlighter>
            </div>
          </div>
        </div>
      )}
    </article>
  )
}
