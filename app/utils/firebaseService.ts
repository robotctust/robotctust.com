import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage'
import { storage } from './firebase'

/**
 * 為 Promise 加入 timeout，逾時則 reject
 * 同時回傳 cancel 函式以便外部在 Promise 提前完成時取消計時器
 * @param {Promise<T>} promise - 操作
 * @param {number} ms - 逾時時間
 * @param {string} label - 操作標籤
 * @returns {Promise<T>} 操作結果
 */
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label = '操作',
): Promise<T> {
  // 設定逾時計時器
  let timerId: ReturnType<typeof setTimeout>
  // 設定逾時 Promise
  const timeout = new Promise<never>((_, reject) => {
    timerId = setTimeout(
      () =>
        reject(
          new Error(`${label}逾時（超過 ${ms / 1000} 秒），請檢查網路後重試`),
        ),
      ms,
    )
  })
  return Promise.race([promise.finally(() => clearTimeout(timerId)), timeout])
}

/**
 * 上傳課程圖片到 Firebase Storage（專用路徑）
 * @param {File} image - 圖片檔案
 * @param {string} courseId - 課程 ID
 * @returns {Promise<string>} 圖片下載 URL
 */
export const uploadCourseImageToFirebaseStorage = async (
  image: File,
  courseId: string,
): Promise<string> => {
  try {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const safeCourseId = courseId
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '_')
    const extension = image.name.includes('.')
      ? image.name.split('.').pop()?.toLowerCase()
      : 'jpg'
    const uniqueId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const fileName = `${Date.now()}-${uniqueId}.${extension || 'jpg'}`

    const storageRef = ref(
      storage,
      `courses/images/${year}/${month}/${safeCourseId}/${fileName}`,
    )

    const snapshot = await uploadBytes(storageRef, image)
    try {
      return await withTimeout(
        getDownloadURL(snapshot.ref),
        15000,
        '取得課程圖片下載網址',
      )
    } catch (err) {
      deleteObject(snapshot.ref).catch(() => {})
      throw err
    }
  } catch (error) {
    console.error('上傳課程圖片到 Firebase Storage 失敗:', error)
    throw error
  }
}
