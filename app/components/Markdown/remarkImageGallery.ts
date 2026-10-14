/*
 * 獨立成檔（不 import 樣式與元件），讓 scripts/ 的遷移腳本也能直接使用
 */

/**
 * mdast 節點的最小型別（只取本外掛需要的欄位）
 */
interface MdNode {
  type: string
  children?: MdNode[]
  value?: string
  data?: { hName?: string; hProperties?: Record<string, unknown> }
}

/**
 * remark 外掛：將「相鄰、且只含圖片的段落」群組成一個圖庫容器。
 * - 連續多張（總計 >= 2 張）圖片 → 包成 div.markdown-image-gallery
 * - 單張圖片 → 維持原本的段落，照常顯示
 */
export function remarkImageGallery() {
  const isImageParagraph = (node: MdNode): boolean =>
    node.type === 'paragraph' &&
    !!node.children &&
    node.children.length > 0 &&
    node.children.every(
      (child) =>
        child.type === 'image' ||
        child.type === 'break' ||
        (child.type === 'text' && (child.value ?? '').trim() === '')
    ) &&
    node.children.some((child) => child.type === 'image')

  return (tree: MdNode) => {
    const children = tree.children ?? []
    const result: MdNode[] = []
    let i = 0

    while (i < children.length) {
      if (isImageParagraph(children[i])) {
        // 收集這一段連續的圖片段落
        let j = i
        const images: MdNode[] = []
        while (j < children.length && isImageParagraph(children[j])) {
          for (const child of children[j].children ?? []) {
            if (child.type === 'image') images.push(child)
          }
          j++
        }

        if (images.length >= 2) {
          // 多張 → 群組成圖片輪播容器
          result.push({
            type: 'imageGallery',
            data: {
              hName: 'div',
              hProperties: { className: ['markdown-image-gallery'] },
            },
            children: images,
          })
        } else {
          // 單張 → 原樣保留
          for (let k = i; k < j; k++) result.push(children[k])
        }
        i = j
      } else {
        result.push(children[i])
        i++
      }
    }

    tree.children = result
  }
}
