import type { JSONContent } from '@tiptap/core'

// 只 import 型別：postService 會被 client 元件引用，這裡不能把 TipTap 帶進 bundle

/** 取出純文字（摘要、搜尋、meta description 用），區塊之間以空白分隔 */
export function getPlainText(node: JSONContent | null | undefined): string {
  if (!node) return ''
  if (node.type === 'text') return node.text ?? ''
  if (node.type === 'hardBreak') return ' '
  const children = node.content ?? []
  const inline = children.every((c) => c.type === 'text' || c.type === 'hardBreak')
  return children
    .map(getPlainText)
    .join(inline ? '' : ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** 內文所有圖片的網址 */
export function collectImageUrls(node: JSONContent | null | undefined): string[] {
  if (!node) return []
  if (node.type === 'image') return node.attrs?.src ? [String(node.attrs.src)] : []
  return (node.content ?? []).flatMap(collectImageUrls)
}

/** 沒有任何文字、圖片、影片、表格或分隔線 */
export function isEmptyContent(node: JSONContent | null | undefined): boolean {
  if (!node) return true
  if (['image', 'video', 'table', 'horizontalRule'].includes(node.type ?? '')) return false
  if (node.type === 'text') return !node.text?.trim()
  return (node.content ?? []).every(isEmptyContent)
}
