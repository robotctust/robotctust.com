/**
 * 舊圖遷移到 Cloudflare R2
 *
 * 把資料庫中 Firebase Storage 與 Google（Drive 外連、Google 登入頭像）的圖片，
 * 以和 /api/media 相同的規格（sm / lg WebP、移除 EXIF）上傳到 R2，並改寫資料庫網址。
 *
 * 執行方式（需 .env.local 提供 Supabase service role 與 R2 金鑰）：
 *   npx tsx --conditions=react-server --env-file=.env.local scripts/migrate-images-to-r2.ts            # dry-run
 *   npx tsx --conditions=react-server --env-file=.env.local scripts/migrate-images-to-r2.ts --apply    # 上傳並改寫資料庫
 *   npx tsx --conditions=react-server --env-file=.env.local scripts/migrate-images-to-r2.ts --revert   # 資料庫改回舊網址
 *
 *   --conditions=react-server：讓 r2.ts 的 `import 'server-only'` 在腳本中可用
 *
 * 模式：
 *   - dry-run（預設）：下載並處理所有圖片，不上傳、不寫資料庫，只輸出報告
 *   - --apply：上傳到 R2 並改寫資料庫；每成功一張就寫入對照表，中斷後重跑會跳過已上傳的圖
 *   - --revert：依對照表把資料庫的新網址換回舊網址（R2 上的新圖不刪，Firebase 原檔也未動過）
 *
 * 範圍：
 *   - users.avatar_url（avatar）、users.background_url（background）
 *   - posts.cover_image_url 與 posts.content_markdown 內的 Markdown 圖片（post）
 *   - course_contents 的圖片區塊（course）
 *   只處理 firebasestorage.googleapis.com 與 lh3.googleusercontent.com；其他外連（如廠商圖）不動。
 *   Google 圖片一律加 =s0 下載原圖（預設只給 1600px / 96px 的縮圖）。
 *
 * 每篇文章擁有自己的圖片：同一張圖出現在兩篇文章會各存一份，
 * 避免刪除其中一篇時（會清除內文 R2 圖片）連帶刪掉另一篇的圖。
 *
 * 輸出（git 忽略）：scripts/.image-migration/map.json（對照表）、report-{模式}.json（報告）
 */

import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import { processImage } from '@/app/utils/media/process'
import { newMediaFolder, putMedia } from '@/app/utils/media/r2'
import type { MediaKind } from '@/app/types/media'

const MODE = process.argv.includes('--apply')
  ? 'apply'
  : process.argv.includes('--revert')
    ? 'revert'
    : 'dry-run'

const OUT_DIR = path.join(process.cwd(), 'scripts/.image-migration')
const MAP_PATH = path.join(OUT_DIR, 'map.json')
const REPORT_PATH = path.join(OUT_DIR, `report-${MODE}.json`) // 依模式分檔，dry-run 不會蓋掉 apply 的報告
const CONCURRENCY = 4

const MIGRATABLE = /^https:\/\/(firebasestorage\.googleapis\.com|lh3\.googleusercontent\.com)\//
const MD_IMAGE = /!\[[^\]]*\]\((\S+?)\)/g

type Table = 'users' | 'posts' | 'course_contents'

/** 一個資料庫欄位值，以及它引用的舊圖 */
interface Target {
  table: Table
  id: string
  column: string
  value: string
  /** 此欄位中要遷移的圖片（同一欄位可能有多張，如文章內文） */
  images: { url: string; key: string; kind: MediaKind; ownerId?: string }[]
}

/** 對照表：key → 新網址（key 決定圖片歸屬，見 imageKey） */
interface MapEntry {
  from: string
  to: string
  kind: MediaKind
  inBytes: number
  lgBytes: number
  smBytes: number
}

/**
 * 圖片歸屬的唯一鍵：同一 key 只上傳一次
 * - post 以文章 id 區分（每篇文章各自一份）
 * - avatar / background / course 以擁有者區分
 */
function imageKey(kind: MediaKind, ownerOrRow: string, url: string) {
  return `${kind}|${ownerOrRow}|${url}`
}

/** Google 圖片改成下載原圖（去掉 =s96-c 之類的尺寸參數，加上 =s0） */
function downloadUrl(url: string) {
  if (!url.startsWith('https://lh3.googleusercontent.com/')) return url
  return url.replace(/=[^/]*$/, '') + '=s0'
}

async function download(url: string): Promise<Buffer> {
  let lastError: unknown
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(downloadUrl(url), { signal: AbortSignal.timeout(60_000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return Buffer.from(await res.arrayBuffer())
    } catch (err) {
      lastError = err
      await new Promise((r) => setTimeout(r, 1000 * attempt))
    }
  }
  throw lastError
}

/** 以固定並行數處理工作 */
async function pool<T>(items: T[], worker: (item: T, index: number) => Promise<void>) {
  let next = 0
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < items.length) {
        const i = next++
        await worker(items[i], i)
      }
    }),
  )
}

type AdminClient = ReturnType<typeof createAdmin>

function createAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function collectTargets(admin: AdminClient): Promise<Target[]> {
  const targets: Target[] = []

  const { data: users, error: usersError } = await admin
    .from('users')
    .select('id, avatar_url, background_url')
  if (usersError) throw usersError
  for (const u of users as { id: string; avatar_url: string | null; background_url: string | null }[]) {
    if (u.avatar_url && MIGRATABLE.test(u.avatar_url)) {
      targets.push({
        table: 'users', id: u.id, column: 'avatar_url', value: u.avatar_url,
        images: [{ url: u.avatar_url, key: imageKey('avatar', u.id, u.avatar_url), kind: 'avatar', ownerId: u.id }],
      })
    }
    if (u.background_url && MIGRATABLE.test(u.background_url)) {
      targets.push({
        table: 'users', id: u.id, column: 'background_url', value: u.background_url,
        images: [{ url: u.background_url, key: imageKey('background', u.id, u.background_url), kind: 'background', ownerId: u.id }],
      })
    }
  }

  const { data: posts, error: postsError } = await admin
    .from('posts')
    .select('id, cover_image_url, content_markdown')
  if (postsError) throw postsError
  for (const p of posts as { id: string; cover_image_url: string | null; content_markdown: string }[]) {
    if (p.cover_image_url && MIGRATABLE.test(p.cover_image_url)) {
      targets.push({
        table: 'posts', id: p.id, column: 'cover_image_url', value: p.cover_image_url,
        images: [{ url: p.cover_image_url, key: imageKey('post', p.id, p.cover_image_url), kind: 'post' }],
      })
    }
    const urls = [...new Set([...p.content_markdown.matchAll(MD_IMAGE)].map((m) => m[1]))].filter((u) =>
      MIGRATABLE.test(u),
    )
    if (urls.length > 0) {
      targets.push({
        table: 'posts', id: p.id, column: 'content_markdown', value: p.content_markdown,
        images: urls.map((url) => ({ url, key: imageKey('post', p.id, url), kind: 'post' as const })),
      })
    }
  }

  const { data: contents, error: contentsError } = await admin
    .from('course_contents')
    .select('id, course_id, content')
    .eq('type', 'image')
  if (contentsError) throw contentsError
  for (const c of contents as { id: string; course_id: string; content: string }[]) {
    if (MIGRATABLE.test(c.content)) {
      targets.push({
        table: 'course_contents', id: c.id, column: 'content', value: c.content,
        images: [{ url: c.content, key: imageKey('course', c.course_id, c.content), kind: 'course', ownerId: c.course_id }],
      })
    }
  }

  return targets
}

/** 依對照表改寫欄位值（replace 方向：from→to 或 to→from） */
function rewrite(value: string, pairs: [string, string][]) {
  return pairs.reduce((v, [a, b]) => v.split(a).join(b), value)
}

async function main() {
  const admin = createAdmin()
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const map: Record<string, MapEntry> = fs.existsSync(MAP_PATH)
    ? JSON.parse(fs.readFileSync(MAP_PATH, 'utf-8'))
    : {}

  // ─── revert：把資料庫中的新網址換回舊網址 ───────────────────────────
  if (MODE === 'revert') {
    const pairs = Object.values(map).map((e) => [e.to, e.from] as [string, string])
    let updated = 0
    for (const table of ['users', 'posts', 'course_contents'] as const) {
      const columns = { users: ['avatar_url', 'background_url'], posts: ['cover_image_url', 'content_markdown'], course_contents: ['content'] }[table]
      const { data, error } = await admin.from(table).select(['id', ...columns].join(', '))
      if (error) throw error
      for (const row of data as unknown as Record<string, string | null>[]) {
        const patch: Record<string, string> = {}
        for (const col of columns) {
          const v = row[col]
          if (v && pairs.some(([to]) => v.includes(to))) patch[col] = rewrite(v, pairs)
        }
        if (Object.keys(patch).length === 0) continue
        const { error: updateError } = await admin.from(table).update(patch).eq('id', row.id!)
        if (updateError) throw updateError
        updated++
      }
    }
    console.log(`已還原 ${updated} 筆資料（R2 上的新圖保留未刪）`)
    return
  }

  // ─── 收集要遷移的圖片 ────────────────────────────────────────────────
  const targets = await collectTargets(admin)
  const jobs = new Map<string, Target['images'][number]>()
  for (const t of targets) for (const img of t.images) jobs.set(img.key, img)
  const pending = [...jobs.values()].filter((img) => !map[img.key])

  console.log(`模式：${MODE}`)
  console.log(`欄位 ${targets.length} 個，圖片 ${jobs.size} 張（已完成 ${jobs.size - pending.length}，待處理 ${pending.length}）`)

  // ─── 下載、處理、（apply 時）上傳 ─────────────────────────────────────
  const failures: { url: string; key: string; error: string }[] = []
  const dryResults: Record<string, Omit<MapEntry, 'to'>> = {}
  let done = 0
  await pool(pending, async (img) => {
    try {
      const input = await download(img.url)
      const { files } = await processImage(input, img.kind)
      const sizes = { inBytes: input.length, lgBytes: files.lg.length, smBytes: files.sm.length }
      if (MODE === 'apply') {
        const to = await putMedia(newMediaFolder(img.kind, img.ownerId), files)
        map[img.key] = { from: img.url, to, kind: img.kind, ...sizes }
        fs.writeFileSync(MAP_PATH, JSON.stringify(map, null, 2)) // 每張都存，中斷可續跑
      } else {
        dryResults[img.key] = { from: img.url, kind: img.kind, ...sizes }
      }
    } catch (err) {
      failures.push({ url: img.url, key: img.key, error: err instanceof Error ? err.message : String(err) })
    }
    done++
    if (done % 10 === 0 || done === pending.length) console.log(`  ${done}/${pending.length}`)
  })

  // ─── apply：改寫資料庫 ───────────────────────────────────────────────
  let updatedRows = 0
  const skippedTargets: string[] = []
  if (MODE === 'apply') {
    for (const t of targets) {
      const pairs = t.images.filter((img) => map[img.key]).map((img) => [img.url, map[img.key].to] as [string, string])
      if (pairs.length === 0) continue
      if (pairs.length < t.images.length) skippedTargets.push(`${t.table}.${t.column} ${t.id}（部分圖片失敗，已遷移的仍會改寫）`)
      const next = rewrite(t.value, pairs)
      if (next === t.value) continue
      // 以舊值為條件更新，避免覆蓋腳本執行期間被人修改過的資料
      const { data, error } = await admin
        .from(t.table)
        .update({ [t.column]: next })
        .eq('id', t.id)
        .eq(t.column, t.value)
        .select('id')
      if (error) throw error
      if (data.length === 0) skippedTargets.push(`${t.table}.${t.column} ${t.id}（執行期間資料已變更，未改寫，請重跑）`)
      else updatedRows++
    }
  }

  // ─── 報告 ───────────────────────────────────────────────────────────
  const entries = MODE === 'apply' ? Object.values(map) : Object.values(dryResults)
  const sum = (k: 'inBytes' | 'lgBytes' | 'smBytes') => entries.reduce((s, e) => s + e[k], 0)
  const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)}MB`
  const byKind = entries.reduce<Record<string, number>>((acc, e) => ({ ...acc, [e.kind]: (acc[e.kind] ?? 0) + 1 }), {})
  const byHost = [...jobs.values()].reduce<Record<string, number>>((acc, img) => {
    const host = new URL(img.url).host + (img.url.includes('/d/') ? '（Drive）' : img.url.includes('/a/') ? '（Google 頭像）' : '')
    return { ...acc, [host]: (acc[host] ?? 0) + 1 }
  }, {})
  const report = {
    mode: MODE,
    fields: targets.length,
    images: jobs.size,
    byKind,
    byHost,
    processed: entries.length,
    size: { originals: mb(sum('inBytes')), lg: mb(sum('lgBytes')), sm: mb(sum('smBytes')) },
    updatedRows,
    failures,
    skippedTargets,
  }
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
