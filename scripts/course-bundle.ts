/**
 * 課程包（課程 JSON）匯出 / 匯入 / 跨學期複製，與後台「學期管理」走同一套檢查與寫入
 * 格式說明：app/utils/dashboard/courseBundleGuide.ts（或執行 guide 指令）
 *
 * 執行方式（寫入正式資料庫與 R2，需 .env.local）：
 *   npx tsx --conditions=react-server --env-file=.env.local scripts/course-bundle.ts guide
 *   … course-bundle.ts export --semester 114-2 [--course id1,id2] [--out file.json]
 *   … course-bundle.ts import file.json --semester 115-1 [--apply]
 *   … course-bundle.ts copy --from 114-2 --to 115-1 [--course id1,id2] [--apply]
 *
 * import / copy 預設只預覽（檢查格式、slug 是否已被使用），加 --apply 才寫入；課程一律存成草稿
 */

import * as fs from 'fs'
import { createAdminClient } from '@/app/utils/supabase/admin'
import {
  exportCourseBundle,
  importCourseBundle,
  previewCourseBundle,
} from '@/app/utils/dashboard/courseBundle'
import { retargetBundle } from '@/app/utils/dashboard/courseBundleFormat'
import { COURSE_BUNDLE_GUIDE } from '@/app/utils/dashboard/courseBundleGuide'

const args = process.argv.slice(2)
const command = args[0]
const option = (name: string) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}
const apply = args.includes('--apply')

async function findSemester(name: string | undefined) {
  if (!name) throw new Error('缺少學期名稱')
  const { data, error } = await createAdminClient()
    .from('semesters')
    .select('id, name')
    .eq('name', name)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error(`找不到學期「${name}」`)
  return data
}

/** 指定 --course 時用它，否則取學期內所有課程 */
async function pickCourseIds(semesterId: string): Promise<string[]> {
  const listed = option('course')
  if (listed) return listed.split(',').map((id) => id.trim())
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('courses')
    .select('id, chapters!inner(semester_id)')
    .eq('chapters.semester_id', semesterId)
  if (error) throw new Error(error.message)
  return data.map((row) => row.id)
}

async function previewOrImport(bundle: unknown, semester: { id: string; name: string }) {
  const { bundle: _bundle, ...preview } = await previewCourseBundle(bundle, semester.id)
  console.log(JSON.stringify(preview, null, 2))
  if (preview.errors.length > 0) process.exit(1)
  if (!apply) {
    console.log(`\n預覽完成，加 --apply 匯入到「${semester.name}」`)
    return
  }
  const ids = await importCourseBundle(bundle, semester.id)
  console.log(`\n已在「${semester.name}」建立 ${ids.length} 堂課程（草稿）：${ids.join(', ')}`)
}

async function main() {
  switch (command) {
    case 'guide':
      console.log(COURSE_BUNDLE_GUIDE)
      return
    case 'export': {
      const semester = await findSemester(option('semester'))
      const json = JSON.stringify(await exportCourseBundle(await pickCourseIds(semester.id)), null, 2)
      const out = option('out')
      if (out) {
        fs.writeFileSync(out, json + '\n')
        console.error(`已匯出到 ${out}`)
      } else {
        console.log(json)
      }
      return
    }
    case 'import': {
      const file = args[1]
      if (!file || file.startsWith('--')) throw new Error('缺少 JSON 檔案路徑')
      const semester = await findSemester(option('semester'))
      await previewOrImport(JSON.parse(fs.readFileSync(file, 'utf8')), semester)
      return
    }
    case 'copy': {
      const from = await findSemester(option('from'))
      const to = await findSemester(option('to'))
      const bundle = await exportCourseBundle(await pickCourseIds(from.id))
      await previewOrImport(retargetBundle(bundle, from.name, to.name), to)
      return
    }
    default:
      console.error('用法：guide | export | import | copy，詳見檔案開頭說明')
      process.exit(1)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
