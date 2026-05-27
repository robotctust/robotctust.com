'use client'

import React, { useEffect, useState } from 'react'
import styles from './MarkdownRenderer.module.scss'
// dependencies
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
// styles
import 'highlight.js/styles/github-dark.css'
// shared markdown config
import { markdownComponents, remarkImageGallery } from './markdownConfig'

export interface MarkdownRendererProps {
  content?: string
  filePath?: string
  className?: string
}

/**
 * Markdown 渲染器（Client Component）。
 *
 * 適用於需要在 client 端渲染的情境：
 * - 編輯器即時預覽（content 隨輸入即時變動）
 * - 以 fetch 載入遠端 / 靜態 .md 檔案（filePath）
 *
 * 若內容已在 server 端取得，建議改用 Server Component 版本 MarkdownContent，
 * 以將內文輸出進 SSR HTML，並避免把 react-markdown 打包進 client bundle。
 *
 * @param content 直接傳入的 Markdown 內容
 * @param filePath 要以 fetch 載入的檔案路徑
 * @param className 額外樣式類名
 */
const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  filePath,
  className = '',
}) => {
  // 以 filePath 載入的內容
  const [fetchedContent, setFetchedContent] = useState<string>('')
  // 載入狀態
  const [loading, setLoading] = useState<boolean>(false)
  // 錯誤狀態
  const [error, setError] = useState<string | null>(null)

  // 僅在沒有直接傳入 content、且提供 filePath 時才以 fetch 載入
  useEffect(() => {
    if (!content && filePath) {
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

    try {
      const response = await fetch(path)
      if (!response.ok) {
        throw new Error(`Failed to load markdown file: ${response.statusText}`)
      }
      const text = await response.text()
      setFetchedContent(text)
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

  // 直接傳入的 content 優先；否則使用 fetch 載入的內容
  const markdown = content ?? fetchedContent

  return (
    <article className={`${styles.markdownContent} ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkImageGallery]}
        rehypePlugins={[rehypeHighlight, rehypeRaw]}
        components={markdownComponents}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  )
}

export default MarkdownRenderer
