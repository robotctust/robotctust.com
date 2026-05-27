'use client'

import React, { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import styles from './MarkdownRenderer.module.scss'
// dependencies
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
// icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChevronLeft,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons'
// styles
import 'highlight.js/styles/github-dark.css'

export interface MarkdownRendererProps {
  content?: string
  filePath?: string
  className?: string
}

/**
 * mdast 節點的最小型別（只取本外掛需要的欄位）
 */
interface MdNode {
  type: string
  children?: MdNode[]
  value?: string
  data?: { hName?: string; hProperties?: Record<string, unknown> }
}

/**
 * remark 外掛：將「相鄰、且只含圖片的段落」群組成一個水平滾動的圖庫容器。
 * - 連續多張（總計 >= 2 張）圖片 → 包成 div.markdown-image-gallery
 * - 單張圖片 → 維持原本的段落，照常顯示
 */
function remarkImageGallery() {
  const isImageParagraph = (node: MdNode): boolean =>
    node.type === 'paragraph' &&
    !!node.children &&
    node.children.length > 0 &&
    node.children.every(
      (child) =>
        child.type === 'image' ||
        child.type === 'break' ||
        (child.type === 'text' && (child.value ?? '').trim() === '')
    ) &&
    node.children.some((child) => child.type === 'image')

  return (tree: MdNode) => {
    const children = tree.children ?? []
    const result: MdNode[] = []
    let i = 0

    while (i < children.length) {
      if (isImageParagraph(children[i])) {
        // 收集這一段連續的圖片段落
        let j = i
        const images: MdNode[] = []
        while (j < children.length && isImageParagraph(children[j])) {
          for (const child of children[j].children ?? []) {
            if (child.type === 'image') images.push(child)
          }
          j++
        }

        if (images.length >= 2) {
          // 多張 → 群組成水平滾動圖庫
          result.push({
            type: 'imageGallery',
            data: {
              hName: 'div',
              hProperties: { className: ['markdown-image-gallery'] },
            },
            children: images,
          })
        } else {
          // 單張 → 原樣保留
          for (let k = i; k < j; k++) result.push(children[k])
        }
        i = j
      } else {
        result.push(children[i])
        i++
      }
    }

    tree.children = result
  }
}

/**
 * 圖片輪播：一次顯示一張圖片，透過左右按鈕切換上下張，
 * 下方圓點顯示總張數與目前位置。
 */
const ImageCarousel: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const slides = React.Children.toArray(children)
  const count = slides.length
  const [index, setIndex] = useState(0)

  // 理論上只會在 >= 2 張時使用，單張時保險直接渲染
  if (count <= 1) {
    return <>{children}</>
  }

  // 循環切換（環狀）
  const goTo = (i: number) => setIndex((i + count) % count)

  // 觸控滑動：記錄起始觸點，放開時依水平位移量決定切換方向
  const touchStartX = useRef<number | null>(null)
  // 觸發切換的最小水平位移（px），避免輕觸誤判
  const SWIPE_THRESHOLD = 50

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(deltaX) >= SWIPE_THRESHOLD) {
      // 向左滑（deltaX < 0）看下一張，向右滑看上一張
      goTo(deltaX < 0 ? index + 1 : index - 1)
    }
    touchStartX.current = null
  }

  return (
    <div className={styles.carousel}>
      <div
        className={styles.carouselViewport}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className={styles.carouselTrack}
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((slide, i) => (
            <div className={styles.carouselSlide} key={i}>
              {slide}
            </div>
          ))}
        </div>

        <button
          type="button"
          className={`${styles.carouselArrow} ${styles.carouselArrowPrev}`}
          onClick={() => goTo(index - 1)}
          aria-label="上一張"
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <button
          type="button"
          className={`${styles.carouselArrow} ${styles.carouselArrowNext}`}
          onClick={() => goTo(index + 1)}
          aria-label="下一張"
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>

      <div className={styles.carouselDots}>
        {slides.map((_, i) => (
          <button
            type="button"
            key={i}
            className={`${styles.carouselDot} ${
              i === index ? styles.carouselDotActive : ''
            }`}
            onClick={() => goTo(i)}
            aria-label={`第 ${i + 1} 張，共 ${count} 張`}
            aria-current={i === index}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Markdown 渲染器
 * @param content 內容
 * @param filePath 文件路徑
 * @param className 樣式類名
 * @returns 渲染後的 Markdown 內容（html 結構）
 */
const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  filePath,
  className = '',
}) => {
  // Markdown 內容
  const [markdownContent, setMarkdownContent] = useState<string>('')
  // 載入狀態
  const [loading, setLoading] = useState<boolean>(false)
  // 錯誤狀態
  const [error, setError] = useState<string | null>(null)

  // 當內容或文件路徑變化時，加載 Markdown 文件
  useEffect(() => {
    if (content) {
      setMarkdownContent(content)
    } else if (filePath) {
      loadMarkdownFile(filePath)
    }
  }, [content, filePath])

  /**
   * 加載 Markdown 文件
   * @param path 文件路徑
   */
  const loadMarkdownFile = async (path: string) => {
    setLoading(true)
    setError(null)

    // 嘗試加載 Markdown 文件
    try {
      // 加載 Markdown 文件
      const response = await fetch(path)
      // 如果加載失敗，則拋出錯誤
      if (!response.ok) {
        throw new Error(`Failed to load markdown file: ${response.statusText}`)
      }
      // 加載 Markdown 文件
      const text = await response.text()
      setMarkdownContent(text)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // 當正在加載時，顯示載入中
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">載入中...</div>
      </div>
    )
  }

  // 當加載失敗時，顯示錯誤
  if (error) {
    return (
      <div className="error-container">
        <p>Error: {error}</p>
      </div>
    )
  }

  return (
    <article className={`${styles.markdownContent} ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkImageGallery]}
        rehypePlugins={[rehypeHighlight, rehypeRaw]}
        components={{
          code({ children, ...props }) {
            return <code {...props}>{children}</code>
          },
          pre({ children }) {
            return <pre>{children}</pre>
          },
          blockquote({ children }) {
            return <blockquote>{children}</blockquote>
          },
          table({ children }) {
            return (
              <div className={styles.tableWrapper}>
                <table>{children}</table>
              </div>
            )
          },
          th({ children }) {
            return <th>{children}</th>
          },
          td({ children }) {
            return <td>{children}</td>
          },
          ol({ children, ...props }) {
            return <ol {...props}>{children}</ol>
          },
          ul({ children, ...props }) {
            const isTaskList = React.Children.toArray(children).some(
              (child: React.ReactNode) => {
                const className = (
                  child as React.ReactElement<{
                    node: { properties: { className: string } }
                  }>
                )?.props?.node?.properties?.className
                return Array.isArray(className)
                  ? className.includes('task-list-item')
                  : className === 'task-list-item'
              }
            )

            return (
              <ul
                className={isTaskList ? styles.taskList : undefined}
                {...props}
              >
                {children}
              </ul>
            )
          },
          li({ children }) {
            return <li>{children}</li>
          },
          h1({ children }) {
            return <h1>{children}</h1>
          },
          h2({ children }) {
            return <h2>{children}</h2>
          },
          h3({ children }) {
            return <h3>{children}</h3>
          },
          h4({ children }) {
            return <h4>{children}</h4>
          },
          h5({ children }) {
            return <h5>{children}</h5>
          },
          h6({ children }) {
            return <h6>{children}</h6>
          },
          p({ children }) {
            return <p>{children}</p>
          },
          div({ className, children, ...props }) {
            // 由 remarkImageGallery 產生的圖庫容器 → 渲染成圖片輪播
            if (className === 'markdown-image-gallery') {
              return <ImageCarousel>{children}</ImageCarousel>
            }
            return (
              <div className={className} {...props}>
                {children}
              </div>
            )
          },
          img({ src, alt }) {
            // 如果沒有 src，返回空
            if (!src) return null

            // 使用 Next.js Image 元件優化圖片載入
            return (
              <span className={styles.imageWrapper}>
                <Image
                  src={typeof src === 'string' ? src : ''}
                  alt={alt || ''}
                  className={styles.markdownImage}
                  width={1200}
                  height={800}
                  loading="lazy"
                  quality={85}
                />
              </span>
            )
          },
        }}
      >
        {markdownContent}
      </ReactMarkdown>
    </article>
  )
}

export default MarkdownRenderer
