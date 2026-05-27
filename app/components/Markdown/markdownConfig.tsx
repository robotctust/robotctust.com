import React from 'react'
import Image from 'next/image'
import type { Components } from 'react-markdown'
import styles from './MarkdownRenderer.module.scss'
import ImageCarousel from './ImageCarousel'

/**
 * 共用的 Markdown 渲染設定。
 *
 * 本模組沒有 'use client' 宣告，因此 server 與 client 兩種渲染器都能匯入，
 * 確保新聞頁（server）與編輯器預覽（client）的渲染結果完全一致。
 * 其中 ImageCarousel 為 client island，server 渲染時會自動成為互動邊界。
 */

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
 * remark 外掛：將「相鄰、且只含圖片的段落」群組成一個圖庫容器。
 * - 連續多張（總計 >= 2 張）圖片 → 包成 div.markdown-image-gallery
 * - 單張圖片 → 維持原本的段落，照常顯示
 */
export function remarkImageGallery() {
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
          // 多張 → 群組成圖片輪播容器
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
 * react-markdown 的元件對應表（HTML 標籤 → 自訂渲染）。
 */
export const markdownComponents: Components = {
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
      <ul className={isTaskList ? styles.taskList : undefined} {...props}>
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
    // 由 remarkImageGallery 產生的圖庫容器 → 渲染成圖片輪播（client island）
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
}
