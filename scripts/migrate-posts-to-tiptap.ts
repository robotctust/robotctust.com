/**
 * 文章內文 Markdown → TipTap JSON（posts.content_markdown → posts.content）
 *
 * 執行方式（需 .env.local 提供 Supabase service role）：
 *   npx tsx --env-file=.env.local scripts/migrate-posts-to-tiptap.ts           # dry-run：轉換並檢查，不寫資料庫
 *   npx tsx --env-file=.env.local scripts/migrate-posts-to-tiptap.ts --apply   # 寫入 posts.content
 *
 * 路線：Markdown → 現有 react-markdown 管線（remark-gfm、remarkImageGallery、rehype-raw）輸出 HTML
 *   → @tiptap/html 的 generateJSON（節點定義與編輯器、前台共用 RichText/extensions.ts）。
 *   不用 @tiptap/markdown：它會漏掉清單裡的程式碼區塊、把 <video> 當成文字。
 * 圖片：下載後讀出實際寬高，寫入 image 節點的 width / height（前台避免版面跳動）。
 * 檢查：每篇都要通過 schema 檢查，且純文字、圖片、圖片組、表格、程式碼區塊、影片數量與 HTML 一致；
 *   任何一篇不符就整批不寫。
 * 範圍：content_markdown 不為空的文章（新編輯器寫的文章沒有 markdown），每次都重新轉換並覆寫 content。
 *   只寫 content，不動 updated_at。
 *
 * 發布 v2.7.0 前要再跑一次 --apply，接上 Beta 期間正式站用舊編輯器改過的文章；
 * v2.7.0 上線後就不能再跑——會蓋掉用新編輯器改過的內容。
 *
 * 輸出（git 忽略）：scripts/.tiptap-migration/{id}.json（轉換結果，供人工檢查）
 */

import * as fs from 'fs'
import * as path from 'path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import sharp from 'sharp'
import { generateJSON } from '@tiptap/html/server'
import { getSchema, type JSONContent } from '@tiptap/core'
import { Node as PMNode } from '@tiptap/pm/model'
import { createAdminClient } from '@/app/utils/supabase/admin'
import { remarkImageGallery } from '@/app/components/Markdown/remarkImageGallery'
import { richTextExtensions } from '@/app/components/RichText/extensions'
import { getPlainText } from '@/app/components/RichText/plainText'

const APPLY = process.argv.includes('--apply')
const OUT_DIR = path.join(process.cwd(), 'scripts/.tiptap-migration')
const schema = getSchema(richTextExtensions)

function markdownToHtml(markdown: string): string {
  return renderToStaticMarkup(
    createElement(
      ReactMarkdown,
      { remarkPlugins: [remarkGfm, remarkImageGallery], rehypePlugins: [rehypeRaw] },
      markdown,
    ),
  )
}

/** 遞迴走訪所有節點 */
function walk(node: JSONContent, fn: (n: JSONContent) => void) {
  fn(node)
  node.content?.forEach((c) => walk(c, fn))
}

/** 區塊圖片被拆出 <p> 後留下的空段落（Markdown 本身寫不出空段落，可放心移除） */
function dropEmptyParagraphs(node: JSONContent) {
  if (!node.content) return
  node.content = node.content.filter((c) => c.type !== 'paragraph' || c.content?.length)
  node.content.forEach(dropEmptyParagraphs)
}

const imageSizes = new Map<string, { width: number; height: number }>()

async function probeImage(src: string) {
  if (!imageSizes.has(src)) {
    const res = await fetch(src)
    if (!res.ok) throw new Error(`圖片下載失敗 ${res.status}: ${src}`)
    const { width, height } = await sharp(Buffer.from(await res.arrayBuffer())).metadata()
    if (!width || !height) throw new Error(`讀不到圖片尺寸: ${src}`)
    imageSizes.set(src, { width, height })
  }
  return imageSizes.get(src)!
}

const count = (node: JSONContent, type: string) => {
  let n = 0
  walk(node, (c) => c.type === type && n++)
  return n
}

const decode = (s: string) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')

const noSpace = (s: string) => s.replace(/\s+/g, '')

/** 轉換一篇，回傳問題清單（空陣列 = 通過） */
async function convert(markdown: string): Promise<{ json: JSONContent; issues: string[] }> {
  const html = markdownToHtml(markdown)
  const json = generateJSON(html, richTextExtensions)
  dropEmptyParagraphs(json)

  for (const node of collect(json, 'image')) {
    Object.assign(node.attrs!, await probeImage(node.attrs!.src))
  }

  const issues: string[] = []
  try {
    PMNode.fromJSON(schema, json).check()
  } catch (e) {
    issues.push(`schema: ${(e as Error).message}`)
  }

  const expected: Record<string, number> = {
    image: (html.match(/<img /g) ?? []).length,
    imageGallery: (html.match(/markdown-image-gallery/g) ?? []).length,
    table: (html.match(/<table/g) ?? []).length,
    codeBlock: (html.match(/<pre/g) ?? []).length,
    video: (html.match(/<video/g) ?? []).length,
  }
  for (const [type, want] of Object.entries(expected)) {
    const got = count(json, type)
    if (got !== want) issues.push(`${type} ${want} → ${got}`)
  }

  const want = noSpace(decode(html))
  const got = noSpace(getPlainText(json))
  if (got !== want) {
    let i = 0
    while (got[i] === want[i]) i++
    issues.push(`文字在第 ${i} 字不同：原 ${JSON.stringify(want.slice(i, i + 30))}，轉換後 ${JSON.stringify(got.slice(i, i + 30))}`)
  }

  return { json, issues }
}

function collect(node: JSONContent, type: string): JSONContent[] {
  const found: JSONContent[] = []
  walk(node, (c) => c.type === type && found.push(c))
  return found
}

async function main() {
  const admin = createAdminClient()
  const { data: posts, error } = await admin
    .from('posts')
    .select('id, title, content_markdown')
    .not('content_markdown', 'is', null)
    .order('created_at')
  if (error) throw error

  fs.mkdirSync(OUT_DIR, { recursive: true })
  const results: { id: string; json: JSONContent }[] = []
  let failed = 0

  for (const post of posts) {
    const { json, issues } = await convert(post.content_markdown)
    fs.writeFileSync(path.join(OUT_DIR, `${post.id}.json`), JSON.stringify(json, null, 2))
    const summary = ['image', 'imageGallery', 'table', 'codeBlock', 'video']
      .map((t) => `${t}:${count(json, t)}`)
      .join(' ')
    console.log(`${issues.length ? '✗' : '✓'} ${post.id}  ${summary}  ${post.title}`)
    issues.forEach((i) => console.log(`    ${i}`))
    if (issues.length) failed++
    results.push({ id: post.id, json })
  }

  console.log(`\n${posts.length} 篇，${failed} 篇有問題，共 ${imageSizes.size} 張圖片`)
  if (failed) {
    console.log('有問題，不寫入資料庫')
    process.exit(1)
  }
  if (!APPLY) {
    console.log('dry-run：未寫入資料庫（加 --apply 寫入）')
    return
  }

  for (const { id, json } of results) {
    const { error } = await admin.from('posts').update({ content: json }).eq('id', id)
    if (error) throw new Error(`${id} 寫入失敗：${error.message}`)
  }
  console.log(`已寫入 ${results.length} 篇的 posts.content`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
