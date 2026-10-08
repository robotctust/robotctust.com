# Markdown 組件

渲染靜態 Markdown 內容（文件、隱私權政策、使用條款、競賽說明等）。
新聞文章自 v2.7 起改用 TipTap，見 `app/components/RichText/`；這裡的樣式（`MarkdownRenderer.module.scss` 的 `.markdownContent`）兩邊共用。

| 元件 | 用途 |
| --- | --- |
| `MarkdownContent` | Server Component：內容已在伺服器取得時使用，內文直接進 SSR HTML，react-markdown 不進 client bundle |
| `MarkdownRenderer` | Client Component：以 `filePath` fetch 載入 `.md` 檔，或需要在 client 即時渲染時使用 |

兩者共用 `markdownConfig.tsx`：GFM、highlight.js 上色、`remarkImageGallery`（相鄰的多張圖片組成輪播 `ImageCarousel`），圖片一律以 `Img` 渲染。

```tsx
import { MarkdownContent, MarkdownRenderer } from '@/app/components/Markdown'

<MarkdownContent content={markdown} />
<MarkdownRenderer filePath="/docs/example.md" />
```
