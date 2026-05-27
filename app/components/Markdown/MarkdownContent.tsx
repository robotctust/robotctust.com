import React from 'react'
// dependencies
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
// styles
import styles from './MarkdownRenderer.module.scss'
import 'highlight.js/styles/github-dark.css'
// shared markdown config
import { markdownComponents, remarkImageGallery } from './markdownConfig'

export interface MarkdownContentProps {
  content: string
  className?: string
}

/**
 * Markdown 內容渲染器（Server Component）。
 *
 * 直接在 server 端同步渲染傳入的 markdown 字串，內文會出現在 SSR HTML 中，
 * 且 react-markdown 與相關外掛不會被打包進 client bundle。
 * 互動的圖片輪播以 ImageCarousel（client island）形式存在。
 *
 * 適用於已在 server 端取得內容的「檢視」情境（如新聞詳情頁）。
 * 需要即時預覽或以 fetch 載入檔案的情境，請改用 client 版 MarkdownRenderer。
 */
const MarkdownContent: React.FC<MarkdownContentProps> = ({
  content,
  className = '',
}) => {
  return (
    <article className={`${styles.markdownContent} ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkImageGallery]}
        rehypePlugins={[rehypeHighlight, rehypeRaw]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </article>
  )
}

export default MarkdownContent
