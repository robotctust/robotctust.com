/**
 * 圖片種類（決定處理規格、R2 key 前綴與上傳權限）
 * - avatar / background：使用者本人
 * - post：新聞封面與內文圖（需 news 模組權限）
 * - course：課程圖片區塊（需 courses 模組權限）
 */
export type MediaKind = 'avatar' | 'background' | 'post' | 'course'

/** 圖片版本：sm 給列表、縮圖等小視圖；lg 給內頁大圖。資料庫只存 lg 的網址 */
export type MediaVariant = 'sm' | 'lg'

/** 背景裁切位置（0~1，0.5 = 置中），沿用個人背景編輯器的裁切偏移 */
export interface MediaCrop {
  x: number
  y: number
}

/** 上傳完成的圖片：網址為 lg 版，寬高為 lg 版實際像素（給編輯器寫入 width / height，避免版面跳動） */
export interface UploadedImage {
  url: string
  width: number
  height: number
}

/**
 * 內文插圖的上傳函式（與編輯器無關的接口）
 * Markdown 編輯器與日後的 TipTap（貼上、拖曳、插圖按鈕）都只依賴這個型別；
 * 錯誤提示由提供者負責，失敗時拋出錯誤讓編輯器移除佔位
 */
export type ContentImageUploader = (file: File) => Promise<UploadedImage>
