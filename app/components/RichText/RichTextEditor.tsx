'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { EditorContent, ReactNodeViewRenderer, useEditor, useEditorState, type Editor } from '@tiptap/react'
import type { JSONContent } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { TableKit } from '@tiptap/extension-table'
import { Placeholder } from '@tiptap/extensions'
import { common, createLowlight } from 'lowlight'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBold,
  faCode,
  faFileCode,
  faImage,
  faItalic,
  faLink,
  faListOl,
  faListUl,
  faMinus,
  faQuoteLeft,
  faRotateLeft,
  faRotateRight,
  faStrikethrough,
  faTable,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons'
import type { ContentImageUploader } from '@/app/types/media'
import { ImageGallery, RichImage, Video, starterKitOptions } from './extensions'
import { ImageUpload, insertImages, pickImages } from './imageUpload'
import { PasteHandling } from './paste'
import { useToast } from '@/app/contexts/ToastContext'
import { CodeBlockView, GalleryView, ImageView } from './nodeViews'
// styles：內文排版與前台共用，所見即所得
import contentStyles from '@/app/components/Markdown/MarkdownRenderer.module.scss'
import styles from './RichTextEditor.module.scss'
import 'highlight.js/styles/github-dark.css'

export interface RichTextEditorProps {
  /** 初始內容（只在建立時讀取） */
  content: JSONContent | null
  onChange: (content: JSONContent) => void
  onUploadImage: ContentImageUploader
  placeholder?: string
}

const lowlight = createLowlight(common)

/**
 * 文章編輯器：節點定義與前台渲染共用 extensions.ts，只多了編輯用的 node view、程式碼上色與插圖上傳。
 * 支援 Markdown 快捷輸入（## 標題、- 清單、``` 程式碼、**粗體** 等）與貼上 Markdown 文字，圖片可貼上、拖曳或從工具列插入。
 */
export default function RichTextEditor({ content, onChange, onUploadImage, placeholder }: RichTextEditorProps) {
  const t = useTranslations('Components.RichTextEditor')
  const { showToast } = useToast()
  const editor = useEditor({
    // Next.js SSR：等到 client 才建立，避免 hydration 不一致
    immediatelyRender: false,
    content,
    extensions: [
      StarterKit.configure({ ...starterKitOptions, codeBlock: false }),
      CodeBlockLowlight.extend({ addNodeView: () => ReactNodeViewRenderer(CodeBlockView) }).configure({
        lowlight,
      }),
      RichImage.extend({ addNodeView: () => ReactNodeViewRenderer(ImageView) }),
      ImageGallery.extend({ addNodeView: () => ReactNodeViewRenderer(GalleryView) }),
      Video,
      TableKit,
      Placeholder.configure({ placeholder }),
      ImageUpload.configure({ upload: onUploadImage }),
      PasteHandling.configure({ onMediaRemoved: () => showToast(t('pastedMediaRemoved'), 'info') }),
    ],
    editorProps: {
      attributes: { class: `${contentStyles.markdownContent} ${contentStyles.articleContent} ${styles.content}` },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  })

  if (!editor) return <div className={styles.editor} />

  return (
    <div className={styles.editor}>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  const t = useTranslations('Components.RichTextEditor')
  const [linkUrl, setLinkUrl] = useState<string | null>(null)

  // 只在這些狀態改變時重繪工具列
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      block: ([2, 3, 4] as const).find((level) => editor.isActive('heading', { level })) ?? 0,
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      strike: editor.isActive('strike'),
      code: editor.isActive('code'),
      link: editor.isActive('link'),
      bulletList: editor.isActive('bulletList'),
      orderedList: editor.isActive('orderedList'),
      blockquote: editor.isActive('blockquote'),
      codeBlock: editor.isActive('codeBlock'),
      table: editor.isActive('table'),
      canUndo: editor.can().undo(),
      canRedo: editor.can().redo(),
    }),
  })

  const chain = () => editor.chain().focus()

  const setBlock = (level: number) =>
    level ? chain().setHeading({ level: level as 2 | 3 | 4 }).run() : chain().setParagraph().run()

  const openLink = () => setLinkUrl(editor.getAttributes('link').href ?? '')

  // ⌘K / Ctrl+K 開連結輸入框
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setLinkUrl(editor.getAttributes('link').href ?? '')
      }
    }
    const dom = editor.view.dom
    dom.addEventListener('keydown', onKeyDown)
    return () => dom.removeEventListener('keydown', onKeyDown)
  }, [editor])

  const applyLink = () => {
    const url = linkUrl?.trim() ?? ''
    setLinkUrl(null)
    if (!url) {
      chain().extendMarkRange('link').unsetLink().run()
      return
    }
    // 沒寫協定就當成 https
    const href = /^(https?:|mailto:)/i.test(url) ? url : `https://${url}`
    if (editor.state.selection.empty && !editor.isActive('link')) {
      chain().insertContent({ type: 'text', text: url, marks: [{ type: 'link', attrs: { href } }] }).run()
    } else {
      chain().extendMarkRange('link').setLink({ href }).run()
    }
  }

  const button = (icon: IconDefinition, label: string, onClick: () => void, active = false, disabled = false) => (
    <button
      type="button"
      className={active ? styles.active : undefined}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
    >
      <FontAwesomeIcon icon={icon} />
    </button>
  )

  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarRow}>
        {button(faRotateLeft, t('undo'), () => chain().undo().run(), false, !state.canUndo)}
        {button(faRotateRight, t('redo'), () => chain().redo().run(), false, !state.canRedo)}
        <span className={styles.divider} />
        <select
          className={styles.blockSelect}
          value={state.block}
          onChange={(e) => setBlock(Number(e.target.value))}
          aria-label={t('blockType')}
        >
          <option value={0}>{t('paragraph')}</option>
          <option value={2}>{t('heading', { level: 2 })}</option>
          <option value={3}>{t('heading', { level: 3 })}</option>
          <option value={4}>{t('heading', { level: 4 })}</option>
        </select>
        <span className={styles.divider} />
        {button(faBold, t('bold'), () => chain().toggleBold().run(), state.bold)}
        {button(faItalic, t('italic'), () => chain().toggleItalic().run(), state.italic)}
        {button(faStrikethrough, t('strike'), () => chain().toggleStrike().run(), state.strike)}
        {button(faCode, t('code'), () => chain().toggleCode().run(), state.code)}
        {button(faLink, `${t('link.label')} (⌘K)`, openLink, state.link)}
        <span className={styles.divider} />
        {button(faListUl, t('bulletList'), () => chain().toggleBulletList().run(), state.bulletList)}
        {button(faListOl, t('orderedList'), () => chain().toggleOrderedList().run(), state.orderedList)}
        {button(faQuoteLeft, t('blockquote'), () => chain().toggleBlockquote().run(), state.blockquote)}
        {button(faFileCode, t('codeBlock.label'), () => chain().toggleCodeBlock().run(), state.codeBlock)}
        {button(faMinus, t('horizontalRule'), () => chain().setHorizontalRule().run())}
        <span className={styles.divider} />
        {button(faImage, t('image.insert'), () => pickImages((files) => insertImages(editor, files)))}
        {button(faTable, t('table.insert'), () =>
          chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
        )}
      </div>

      {state.table && (
        <div className={`${styles.toolbarRow} ${styles.subRow}`}>
          <button type="button" onClick={() => chain().addRowAfter().run()}>{t('table.addRow')}</button>
          <button type="button" onClick={() => chain().addColumnAfter().run()}>{t('table.addColumn')}</button>
          <button type="button" onClick={() => chain().deleteRow().run()}>{t('table.deleteRow')}</button>
          <button type="button" onClick={() => chain().deleteColumn().run()}>{t('table.deleteColumn')}</button>
          <button type="button" onClick={() => chain().toggleHeaderRow().run()}>{t('table.toggleHeader')}</button>
          <button type="button" className={styles.danger} onClick={() => chain().deleteTable().run()}>
            {t('table.delete')}
          </button>
        </div>
      )}

      {linkUrl !== null && (
        <form
          className={`${styles.toolbarRow} ${styles.subRow}`}
          onSubmit={(e) => {
            e.preventDefault()
            applyLink()
          }}
        >
          <input
            autoFocus
            className={styles.linkInput}
            value={linkUrl}
            placeholder="https://"
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setLinkUrl(null)}
          />
          <button type="submit">{t('link.apply')}</button>
          {state.link && (
            <button
              type="button"
              className={styles.danger}
              onClick={() => {
                setLinkUrl(null)
                chain().extendMarkRange('link').unsetLink().run()
              }}
            >
              {t('link.remove')}
            </button>
          )}
          <button type="button" onClick={() => setLinkUrl(null)}>{t('link.cancel')}</button>
        </form>
      )}
    </div>
  )
}
