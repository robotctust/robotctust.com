'use client'

import { NodeViewContent, NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react'
import { useTranslations } from 'next-intl'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faImages, faObjectUngroup, faPlus, faSpinner, faTrash } from '@fortawesome/free-solid-svg-icons'
import { insertImages, pickImages } from './imageUpload'
import styles from './RichTextEditor.module.scss'

/** 程式碼區塊可選的語言（值為 highlight.js 的語言名稱，前台與編輯器共用同一套） */
const CODE_LANGUAGES: [string, string][] = [
  ['cpp', 'C / C++'],
  ['arduino', 'Arduino'],
  ['python', 'Python'],
  ['javascript', 'JavaScript'],
  ['typescript', 'TypeScript'],
  ['java', 'Java'],
  ['bash', 'Shell'],
  ['json', 'JSON'],
  ['xml', 'HTML / XML'],
  ['css', 'CSS'],
  ['sql', 'SQL'],
  ['yaml', 'YAML'],
]

/** 圖片：上傳中顯示遮罩，下方可直接輸入說明文字 */
export function ImageView({ node, updateAttributes, deleteNode, selected }: ReactNodeViewProps) {
  const t = useTranslations('Components.RichTextEditor')
  const { src, width, height, caption } = node.attrs
  const uploading = String(src).startsWith('blob:')

  return (
    <NodeViewWrapper
      as="figure"
      className={`${styles.image} ${selected ? styles.selected : ''}`}
      data-drag-handle
    >
      <div className={styles.imageFrame}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={width ?? undefined} height={height ?? undefined} alt="" draggable={false} />
        {uploading && (
          <div className={styles.uploading}>
            <FontAwesomeIcon icon={faSpinner} spin />
            <span>{t('image.uploading')}</span>
          </div>
        )}
        <button
          type="button"
          className={styles.imageDelete}
          onClick={deleteNode}
          title={t('image.delete')}
          aria-label={t('image.delete')}
        >
          <FontAwesomeIcon icon={faTrash} />
        </button>
      </div>
      <input
        className={styles.caption}
        value={caption ?? ''}
        placeholder={t('image.captionPlaceholder')}
        onChange={(e) => updateAttributes({ caption: e.target.value || null })}
      />
    </NodeViewWrapper>
  )
}

/** 圖片組：前台顯示成輪播；可加圖、拆回單張，組內圖片可拖曳排序 */
export function GalleryView({ node, editor, getPos }: ReactNodeViewProps) {
  const t = useTranslations('Components.RichTextEditor')

  const addImages = () =>
    pickImages((files) => {
      const pos = getPos()
      // 插在組內最後一張之後
      if (pos !== undefined) insertImages(editor, files, pos + node.nodeSize - 1)
    })

  const ungroup = () => {
    const pos = getPos()
    if (pos === undefined) return
    editor.view.dispatch(editor.state.tr.replaceWith(pos, pos + node.nodeSize, node.content))
  }

  return (
    <NodeViewWrapper className={styles.gallery}>
      <div className={styles.galleryBar} contentEditable={false}>
        <span className={styles.galleryLabel}>
          <FontAwesomeIcon icon={faImages} />
          {t('gallery.label', { count: node.childCount })}
        </span>
        <button type="button" onClick={addImages}>
          <FontAwesomeIcon icon={faPlus} />
          {t('gallery.add')}
        </button>
        <button type="button" onClick={ungroup}>
          <FontAwesomeIcon icon={faObjectUngroup} />
          {t('gallery.ungroup')}
        </button>
      </div>
      <NodeViewContent className={styles.galleryGrid} />
    </NodeViewWrapper>
  )
}

/** 程式碼區塊：右上角選語言，上色由 CodeBlockLowlight 處理 */
export function CodeBlockView({ node, updateAttributes }: ReactNodeViewProps) {
  const t = useTranslations('Components.RichTextEditor')
  const language: string | null = node.attrs.language
  // 舊文章可能用了清單外的語言，照樣列出以免被改掉
  const options =
    language && !CODE_LANGUAGES.some(([value]) => value === language)
      ? [...CODE_LANGUAGES, [language, language] as [string, string]]
      : CODE_LANGUAGES

  return (
    <NodeViewWrapper as="pre" className={styles.codeBlock}>
      <select
        contentEditable={false}
        className={styles.codeLanguage}
        value={language ?? ''}
        onChange={(e) => updateAttributes({ language: e.target.value || null })}
        aria-label={t('codeBlock.language')}
      >
        <option value="">{t('codeBlock.plain')}</option>
        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <NodeViewContent<'code'> as="code" className={language ? `hljs language-${language}` : undefined} />
    </NodeViewWrapper>
  )
}
