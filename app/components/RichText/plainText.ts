import type { JSONContent } from '@tiptap/core'

// 獨立成檔、只 import 型別：postService 會被 client 元件引用，不能把 TipTap 帶進 bundle

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
