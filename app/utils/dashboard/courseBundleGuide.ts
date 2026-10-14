/**
 * 課程包格式指南：給 AI 撰寫課程內容用
 * 後台匯入對話框的「複製 AI 指南」與 `scripts/course-bundle.ts guide` 都輸出這份文字
 * 格式變更時（courseBundleFormat.ts、課程頁的渲染方式）要一起更新
 */
export const COURSE_BUNDLE_GUIDE = `# 中臺科大機器人研究社：課程包 JSON 格式

你要產生一份「課程包」JSON，社團幹部會把它匯入網站的課程系統。只輸出 JSON 本身（可以放在一個 json 程式碼區塊裡），不要加其他說明。

## 結構

- 課程包 → 章節（chapters）→ 課程（courses）→ 內容區塊（blocks）。
- 程式檔（programs）放在最外層，區塊用 \`program\` 欄位引用它的 \`key\`。
- 匯入時會選一個學期。章節標題和該學期已有的章節相同時，課程會加到那個章節的最後；否則建立新章節。
- 匯入的課程一律是草稿，幹部檢查後才會發布。

## 完整範例

~~~json
{
  "version": 1,
  "chapters": [
    {
      "title": "循線機器人入門",
      "courses": [
        {
          "id": "basic-followline-115-1",
          "name": "用最簡單的邏輯讓機器人循著線",
          "description": "用中間感測器判斷方向，寫出第一支循線程式。",
          "reward_exp": 20,
          "blocks": [
            { "type": "header1", "content": "循線邏輯設計" },
            { "type": "markdown", "content": "以**中間感測器**為判斷基準：\\n\\n| 中 | 動作 |\\n|---|---|\\n| 1 | 直走 |\\n| 0 | 轉向 |" },
            { "type": "header2", "content": "第一段：腳位宣告", "program": "pins" },
            { "type": "markdown", "content": "用有意義的名稱取代裸數字，例如 \`S_MID\`。", "program": "pins" },
            { "type": "header2", "content": "完整程式碼", "program": "followline" },
            { "type": "markdown", "content": "把上面幾段組合起來，就是完整的循線程式。", "program": "followline" },
            { "type": "image", "content": "https://example.com/robot.jpg" }
          ]
        }
      ]
    }
  ],
  "programs": [
    { "key": "pins", "name": "腳位宣告", "language": "cpp", "code": "const int S_MID = A2;\\nconst int S_LEFT = A1;" },
    { "key": "followline", "name": "followline.ino", "language": "cpp", "code": "void setup() {\\n  // ...\\n}\\n\\nvoid loop() {\\n  // ...\\n}" }
  ]
}
~~~

## 欄位

最外層：
- \`version\`：固定為 1。
- \`chapters\`：章節陣列，至少一個。
- \`programs\`：程式檔陣列，沒有程式碼時可省略。

章節：
- \`title\`：章節標題（必填）。
- \`courses\`：課程陣列，至少一堂。

課程：
- \`id\`（必填）：課程網址 slug，全站唯一。只能用小寫英文、數字、單一連字號，最多 100 字，例如 \`motor-control-115-1\`。習慣在結尾加上學期（如 \`-115-1\`）。已經被使用的 slug 會被擋下。
- \`name\`（必填）：課程名稱。
- \`description\`：一兩句話的簡介，顯示在課程列表，也用於搜尋引擎描述。
- \`reward_exp\`：完成課程並通過驗證後獲得的經驗值，0 以上的整數，預設 0。
- \`blocks\`：內容區塊陣列，依顯示順序排列。

區塊：
- \`type\`（必填）：區塊類型，見下表。
- \`content\`（必填）：區塊內容，不能是空字串。
- \`program\`：要搭配顯示的程式檔 \`key\`。

程式檔：
- \`key\`（必填）：只在課程包內用來對應區塊，不會顯示，例如 \`pins\`。不可重複。
- \`name\`（必填）：顯示在程式碼視窗標題的名稱，例如 \`followline.ino\` 或「第一段：腳位宣告」。
- \`language\`：語法上色用的語言，例如 \`cpp\`（Arduino 用 cpp）、\`python\`。
- \`code\`（必填）：完整程式碼。

## 區塊類型

| type | 用途 | content |
|---|---|---|
| \`header1\` | 大段落標題，會出現在右側目錄 | 純文字一行 |
| \`header2\` | 小節標題，會出現在目錄 | 純文字一行 |
| \`header3\` | 更小的標題，會出現在目錄 | 純文字一行 |
| \`markdown\` | 主要的內文，最常用 | GitHub 風格 Markdown |
| \`text\` | 不需要任何格式的純文字段落 | 純文字 |
| \`code\` | 直接嵌在內文裡的一段程式碼（固定用 C++ 上色） | 程式碼 |
| \`image\` | 圖片 | 圖片的 https 網址 |

\`markdown\` 支援：粗體、斜體、清單、表格、引用、連結、行內程式碼、分隔線（\`---\`），以及標註語言的程式碼區塊（三個反引號加上 cpp 等語言名稱，會語法上色）。標題請用 header 區塊，不要在 markdown 裡寫 # 標題。

## 程式檔與分段（重要）

課程頁會把「連續、掛同一個 program 的區塊」合成一段，畫面右側同時顯示這個程式檔的程式碼；讀者捲到哪一段，右側就切換到那段的程式。

建議的寫法：
- 把程式拆成幾段講解，每段建立一個程式檔（只放這段的程式碼），用一個 \`header2\` 加上一到數個 \`markdown\` 說明，全部掛同一個 \`program\`。
- 最後一段「完整程式碼」掛上完整程式的程式檔。
- 只有前後連續的區塊會合併；中間插入沒有 \`program\` 的區塊，就會斷成兩段。
- 不需要搭配程式的段落（概念介紹、調整建議）不要加 \`program\`。

## 圖片

\`image\` 只能放 https 網址，匯入時不會上傳圖片。沒有合適的圖片網址時，就不要放圖片區塊，在 markdown 裡用文字描述需要什麼圖（例如「（此處放接線圖）」），幹部之後會在後台補上傳。

## JSON 注意事項

- 字串內的換行寫成 \\n，雙引號寫成 \\"。
- 不要有註解、不要有結尾逗號。
- 所有文字用繁體中文（台灣用語），程式碼與專有名詞可保留英文。

## 送出前檢查

- 每個 \`program\` 都能在 \`programs\` 找到相同的 \`key\`。
- 課程 \`id\` 只有小寫英數字和連字號，且不重複。
- 每個區塊都有非空的 \`content\`。
- 同一段的區塊連續排列，且掛同一個 \`program\`。
`
