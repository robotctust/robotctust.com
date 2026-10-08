import { Extension } from '@tiptap/core'
import { Fragment, Slice, type Node as PMNode } from '@tiptap/pm/model'
import { Plugin } from '@tiptap/pm/state'
import { marked } from 'marked'

/*
 * 編輯器專用：貼上處理
 * - Markdown 純文字（本機 .md、VS Code 複製）轉成格式後再走一般的 HTML 貼上流程
 * - 標題對應到文章可用的 H2–H4（H1 → H2，H5 / H6 → H4），不然會變成一般段落
 * - 擋下不屬於這篇文章的圖片 / 影片（從別篇文章或網頁複製來的）：別篇的圖片刪文時會一起刪掉、
 *   外部網址可能失效，請編輯者另外插入；剪下再貼上自己的圖片不受影響（imageUpload.ts 的 known）
 */

/** 看起來像 Markdown：區塊語法（標題、清單、引言、程式碼、表格）或粗體、連結 */
const MARKDOWN_RE = /^(#{1,6}\s|[-*+]\s|\d+[.)]\s|>|```|~~~|\|.*\|\s*$)|\*\*\S|\[[^\]\n]+\]\([^)\s]+\)/m

const MEDIA_NODES = ['image', 'video']

/** 移除不在 keep 裡的圖片 / 影片；圖片組被清空就整組拿掉 */
function stripMedia(fragment: Fragment, keep: Set<string>, removed: { count: number }): Fragment {
  const nodes: PMNode[] = []
  fragment.forEach((node) => {
    if (MEDIA_NODES.includes(node.type.name) && !keep.has(node.attrs.src)) {
      removed.count++
      return
    }
    if (!node.childCount) {
      nodes.push(node)
      return
    }
    const content = stripMedia(node.content, keep, removed)
    if (node.type.name === 'imageGallery' && !content.childCount) return
    // 例如儲存格只放了一張圖，拿掉後補回必要的空段落
    const copy = node.type.validContent(content) ? node.copy(content) : node.type.createAndFill(node.attrs, content, node.marks)
    if (copy) nodes.push(copy)
  })
  return Fragment.from(nodes)
}

export const PasteHandling = Extension.create<{ onMediaRemoved: () => void }>({
  name: 'pasteHandling',

  addOptions: () => ({ onMediaRemoved: () => {} }),

  addProseMirrorPlugins() {
    const { editor, options } = this

    return [
      new Plugin({
        props: {
          handlePaste: (view, event) => {
            const data = event.clipboardData
            if (!data || view.state.selection.$from.parent.type.spec.code) return false
            const text = data.getData('text/plain')
            // 有 HTML 就照 HTML 貼（網頁、Word…）；VS Code 的 HTML 只是程式碼上色，當純文字看
            const html = data.getData('text/html')
            if (!text || (html && !data.types.includes('vscode-editor-data')) || !MARKDOWN_RE.test(text)) return false
            // marked 的程式碼區塊結尾多一個換行，拿掉
            const converted = marked.parse(text, { async: false }).trim().replace(/\n<\/code><\/pre>/g, '</code></pre>')
            // 只有一段文字（例如貼一句含粗體的話）就併進游標所在段落；多個區塊則整塊插入，
            // 不然第一個標題 / 程式碼會被併進目前的段落而失去格式（data-pm-slice="0 0 []" = 不開放的 slice）
            const singleParagraph = /^<p>((?!<p>)[\s\S])*<\/p>$/.test(converted)
            // 不帶 event：重新進入這裡時 clipboardData 為 null，不會無限轉換
            return view.pasteHTML(singleParagraph ? converted : `<div data-pm-slice="0 0 []">${converted}</div>`)
          },
          transformPastedHTML: (html) => html.replace(/<(\/?)h1\b/gi, '<$1h2').replace(/<(\/?)h[56]\b/gi, '<$1h4'),
          transformPasted: (slice) => {
            const removed = { count: 0 }
            const content = stripMedia(slice.content, editor.storage.imageUpload.known, removed)
            if (!removed.count) return slice
            options.onMediaRemoved()
            return new Slice(content, slice.openStart, slice.openEnd)
          },
        },
      }),
    ]
  },
})
