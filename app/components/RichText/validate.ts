import 'server-only'
import { getSchema, type JSONContent } from '@tiptap/core'
import { Node as PMNode } from '@tiptap/pm/model'
import { richTextExtensions } from './extensions'

const schema = getSchema(richTextExtensions)

/** 驗證失敗：訊息可直接回給前端 */
export class ContentError extends Error {}

/** 圖片與影片只接受 http(s) 網址（blob: 代表還在上傳） */
function checkMediaSources(node: JSONContent) {
  if (node.type === 'image' || node.type === 'video') {
    const src = String(node.attrs?.src ?? '')
    if (src.startsWith('blob:')) throw new ContentError('還有圖片在上傳中，請稍候再儲存')
    if (!/^https?:\/\//.test(src)) throw new ContentError('內文含有不合法的圖片或影片網址')
  }
  node.content?.forEach(checkMediaSources)
}

/**
 * 驗證並整理要存進 posts.content 的內文（API 寫入前一律經過這裡）
 * - 必須符合共用節點定義（extensions.ts），否則前台渲染不了
 * - 圖片 / 影片必須是已上傳的 http(s) 網址
 * - 移除結尾多餘的空段落（編輯器的 TrailingNode 會自動補一個）
 * @returns 正規化後的 JSON（未定義的屬性會被丟掉）
 */
export function normalizePostContent(input: unknown): JSONContent {
  let json: JSONContent
  try {
    const doc = PMNode.fromJSON(schema, input as JSONContent)
    if (doc.type.name !== 'doc') throw new Error('not a doc')
    doc.check()
    json = doc.toJSON()
  } catch {
    throw new ContentError('內文格式不正確')
  }
  checkMediaSources(json)

  const blocks = json.content ?? []
  // doc 至少要有一個區塊，最後一段保留
  while (blocks.length > 1 && blocks.at(-1)?.type === 'paragraph' && !blocks.at(-1)?.content?.length) {
    blocks.pop()
  }
  return json
}
