import { Node, mergeAttributes } from '@tiptap/core'
import StarterKit, { type StarterKitOptions } from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { TableKit } from '@tiptap/extension-table'

/*
 * 文章內文（posts.content）的 TipTap 節點定義，單一來源：
 * 編輯器、伺服器渲染（RichTextContent）、API 驗證與 scripts/ 的遷移腳本都用這一份。
 * 這裡不能 import 樣式或 React 元件，否則腳本與伺服器載入不了。
 * 改動節點名稱或屬性等於改資料格式，既有文章要一併遷移。
 */

/** 圖片：width / height 為原圖實際尺寸（避免版面跳動），caption 為圖片下方的說明文字 */
export const RichImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      caption: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-caption'),
        renderHTML: (attrs) => (attrs.caption ? { 'data-caption': attrs.caption } : {}),
      },
    }
  },
})

/** 圖片組：兩張以上的圖片，前台顯示成輪播 */
export const ImageGallery = Node.create({
  name: 'imageGallery',
  group: 'block',
  content: 'image+',
  draggable: true,
  parseHTML: () => [
    { tag: 'div[data-type="image-gallery"]' },
    // 舊 Markdown 渲染（remarkImageGallery）產生的圖庫容器
    { tag: 'div.markdown-image-gallery' },
  ],
  renderHTML: ({ HTMLAttributes }) => [
    'div',
    mergeAttributes(HTMLAttributes, { 'data-type': 'image-gallery' }),
    0,
  ],
})

/** 影片：只為保留舊文章的 <video>，編輯器不提供插入 */
export const Video = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  addAttributes: () => ({
    src: { default: null },
    width: { default: null },
    height: { default: null },
  }),
  parseHTML: () => [
    {
      tag: 'video',
      getAttrs: (el) => ({
        src: el.getAttribute('src') || el.querySelector('source')?.getAttribute('src'),
        width: el.getAttribute('width'),
        height: el.getAttribute('height'),
      }),
    },
  ],
  renderHTML: ({ HTMLAttributes }) => ['video', mergeAttributes(HTMLAttributes, { controls: '' })],
})

/** 編輯器沿用同一份設定，只把 codeBlock 換成會上色的 CodeBlockLowlight（節點名稱與屬性相同） */
export const starterKitOptions: Partial<StarterKitOptions> = {
  heading: { levels: [2, 3, 4] },
  underline: false,
  // 同舊 Markdown 文章：同分頁開啟、不加 nofollow（預設是 target=_blank + rel=nofollow）
  link: { openOnClick: false, protocols: ['mailto'], HTMLAttributes: { target: null, rel: null } },
}

export const richTextExtensions = [
  StarterKit.configure(starterKitOptions),
  RichImage,
  ImageGallery,
  Video,
  TableKit,
]
