import type { JSONContent } from '@tiptap/core'
import { renderToReactElement } from '@tiptap/static-renderer/pm/react'
import hljs from 'highlight.js/lib/common'
// styles：與舊 Markdown 文章共用排版
import styles from '@/app/components/Markdown/MarkdownRenderer.module.scss'
import 'highlight.js/styles/github-dark.css'
// components
import Img from '@/app/components/Img/Img'
import ImageCarousel from '@/app/components/Markdown/ImageCarousel'
import { richTextExtensions } from './extensions'

/**
 * 文章內文渲染器（Server Component）：把 TipTap JSON 直接轉成 React 元素，
 * 內文出現在 SSR HTML 中，TipTap 與 highlight.js 都不會進 client bundle。
 * 互動的圖片輪播以 ImageCarousel（client island）呈現。
 */
export default function RichTextContent({
  content,
  className = '',
}: {
  content: JSONContent | null
  className?: string
}) {
  if (!content) return null

  return (
    <article className={`${styles.markdownContent} ${className}`}>
      {renderToReactElement({
        content,
        extensions: richTextExtensions,
        options: {
          nodeMapping: {
            image: ({ node }) => (
              <figure className={styles.imageWrapper}>
                <Img
                  src={node.attrs.src}
                  alt={node.attrs.alt ?? ''}
                  width={node.attrs.width ?? undefined}
                  height={node.attrs.height ?? undefined}
                  sizes="(max-width: 800px) 100vw, 1200px"
                  className={styles.markdownImage}
                  progressive
                />
                {node.attrs.caption && (
                  <figcaption className={styles.imageCaption}>{node.attrs.caption}</figcaption>
                )}
              </figure>
            ),
            imageGallery: ({ children }) => <ImageCarousel>{children}</ImageCarousel>,
            video: ({ node }) => (
              <video
                src={node.attrs.src}
                width={node.attrs.width ?? undefined}
                height={node.attrs.height ?? undefined}
                controls
                playsInline
                preload="metadata"
              />
            ),
            codeBlock: ({ node }) => {
              const language: string | null = node.attrs.language
              // 只替有標語言的程式碼上色（同舊版 rehype-highlight，不自動偵測）
              if (!language || !hljs.getLanguage(language)) {
                return (
                  <pre>
                    <code>{node.textContent}</code>
                  </pre>
                )
              }
              // hljs 輸出的 HTML 已跳脫原始碼，可安全插入
              const html = hljs.highlight(node.textContent, { language, ignoreIllegals: true }).value
              return (
                <pre>
                  <code
                    className={`hljs language-${language}`}
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                </pre>
              )
            },
            table: ({ children }) => (
              <div className={styles.tableWrapper}>
                <table>
                  <tbody>{children}</tbody>
                </table>
              </div>
            ),
          },
        },
      })}
    </article>
  )
}
