import { Extension, type Editor, type JSONContent } from '@tiptap/core'
import { Plugin, type EditorState, type Transaction } from '@tiptap/pm/state'
import type { ContentImageUploader, UploadedImage } from '@/app/types/media'

/*
 * 編輯器專用：插圖上傳
 * 插入時先放一個 src 為 blob: 網址的圖片節點當預覽，背景上傳；完成後由 appendTransaction 換成正式網址與寬高，
 * 失敗則移除。結果記在 storage.results（blob 網址 → 上傳結果），所以就算使用者復原 / 重做把 blob 版的節點
 * 帶回來，也會再被換成正式網址。src 仍是 blob: 的圖片 = 還在上傳（存檔前要等它們完成）。
 */

interface ImageUploadStorage {
  upload: ContentImageUploader | null
  /** blob 網址 → 上傳結果；null = 上傳失敗 */
  results: Map<string, UploadedImage | null>
  /** 這篇文章自己的圖片 / 影片網址（載入時就有的、這次插入與上傳的），貼上時只保留這些（paste.ts） */
  known: Set<string>
}

declare module '@tiptap/core' {
  interface Storage {
    imageUpload: ImageUploadStorage
  }
}

const UPLOAD_META = 'imageUpload'

/** 是否還有上傳中的圖片 */
export function hasPendingUploads(content: JSONContent): boolean {
  if (content.type === 'image') return String(content.attrs?.src).startsWith('blob:')
  return (content.content ?? []).some(hasPendingUploads)
}

/**
 * 插入圖片並背景上傳：兩張以上自動組成圖片組
 * 位置落在圖片組內（例如選取了組內某張圖）時直接加進該組
 * @param pos - 插入位置；不給則插在游標處
 */
export function insertImages(editor: Editor, files: File[], pos?: number) {
  const { upload, results, known } = editor.storage.imageUpload
  const images = files.filter((f) => f.type.startsWith('image/'))
  if (!upload || images.length === 0) return
  const intoGallery =
    editor.state.doc.resolve(pos ?? editor.state.selection.from).parent.type.name === 'imageGallery'

  // ponytail: blob 網址不回收（復原 / 重做可能還會用到），一頁編輯的量不大
  const srcs = images.map((file) => URL.createObjectURL(file))
  srcs.forEach((src) => known.add(src))
  const nodes = srcs.map((src) => ({ type: 'image', attrs: { src } }))
  const content = nodes.length > 1 && !intoGallery ? { type: 'imageGallery', content: nodes } : nodes
  const chain = editor.chain().focus()
  ;(pos === undefined ? chain.insertContent(content) : chain.insertContentAt(pos, content)).run()

  images.forEach((file, i) => {
    upload(file)
      .then(
        (result) => {
          known.add(result.url)
          results.set(srcs[i], result)
        },
        () => results.set(srcs[i], null),
      )
      .finally(() => {
        if (!editor.isDestroyed) editor.view.dispatch(editor.state.tr.setMeta(UPLOAD_META, true))
      })
  })
}

/** 開檔案選擇器挑圖片（可多選） */
export function pickImages(onPick: (files: File[]) => void) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.multiple = true
  input.onchange = () => onPick(Array.from(input.files ?? []))
  input.click()
}

/** 把上傳完成的 blob 圖片換成正式網址，失敗的移除；不進復原紀錄 */
function resolveUploads(state: EditorState, results: ImageUploadStorage['results']): Transaction | null {
  const tr = state.tr
  const removals: { from: number; to: number }[] = []
  state.doc.descendants((node, pos) => {
    if (node.type.name !== 'image' || !results.has(node.attrs.src)) return
    const result = results.get(node.attrs.src)
    if (result) {
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: result.url, width: result.width, height: result.height })
    } else {
      removals.push({ from: pos, to: pos + node.nodeSize })
    }
  })
  // 換網址不改變節點大小，由後往前刪位置不會位移
  removals.reverse().forEach(({ from, to }) => tr.delete(from, to))
  return tr.docChanged ? tr.setMeta('addToHistory', false) : null
}

/** 只剩一張圖的圖片組拆回單張圖片 */
function unwrapSingleGalleries(state: EditorState): Transaction | null {
  const tr = state.tr
  const singles: { pos: number; size: number }[] = []
  state.doc.descendants((node, pos) => {
    if (node.type.name === 'imageGallery') {
      if (node.childCount === 1) singles.push({ pos, size: node.nodeSize })
      return false
    }
  })
  singles.reverse().forEach(({ pos, size }) => {
    tr.replaceWith(pos, pos + size, state.doc.nodeAt(pos)!.content)
  })
  return tr.docChanged ? tr : null
}

export const ImageUpload = Extension.create<{ upload: ContentImageUploader | null }, ImageUploadStorage>({
  name: 'imageUpload',

  addOptions: () => ({ upload: null }),

  addStorage() {
    return { upload: this.options.upload, results: new Map(), known: new Set() }
  },

  onCreate() {
    this.editor.state.doc.descendants((node) => {
      if (node.attrs.src) this.storage.known.add(node.attrs.src)
    })
  },

  addProseMirrorPlugins() {
    const editor = this.editor
    const { results } = this.storage

    const filesOf = (data: DataTransfer | null) =>
      Array.from(data?.files ?? []).filter((f) => f.type.startsWith('image/'))

    return [
      new Plugin({
        // appendTransaction 會重複呼叫直到沒有新交易：先換上傳結果（不進復原紀錄），再整理圖片組
        appendTransaction: (transactions, _oldState, state) => {
          if (!transactions.some((tr) => tr.docChanged || tr.getMeta(UPLOAD_META))) return null
          return resolveUploads(state, results) ?? unwrapSingleGalleries(state)
        },
        props: {
          handlePaste: (_view, event) => {
            const files = filesOf(event.clipboardData)
            if (!files.length) return false
            insertImages(editor, files)
            return true
          },
          handleDrop: (view, event, _slice, moved) => {
            const files = filesOf(event.dataTransfer)
            if (moved || !files.length) return false
            const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos
            insertImages(editor, files, pos)
            return true
          },
        },
      }),
    ]
  },
})
