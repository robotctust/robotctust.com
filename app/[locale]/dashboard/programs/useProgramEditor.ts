import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Program } from '@/app/types/course-admin'
import { requestJson } from '../members/client-utils'
import { useToast } from '@/app/contexts/ToastContext'

/**
 * @param programId 'new' 表示新增
 * @param initialProgram 編輯既有程式時由伺服器帶入
 */
export function useProgramEditor(programId: string, initialProgram?: Program) {
  const router = useRouter()
  const { showToast } = useToast()
  const isNew = programId === 'new'
  
  const [name, setName] = useState(initialProgram?.name ?? '')
  const [language, setLanguage] = useState(initialProgram?.language || 'cpp')
  const [codeContent, setCodeContent] = useState(initialProgram?.code_content ?? '')
  const [isSaving, setIsSaving] = useState(false)

  async function handleSave() {
    if (!name.trim() || !codeContent.trim()) {
      showToast('請填寫程式名稱與內容', 'error')
      return
    }

    setIsSaving(true)
    const url = isNew ? '/api/dashboard/programs' : `/api/dashboard/programs/${programId}`
    const method = isNew ? 'POST' : 'PATCH'

    try {
      const data = await requestJson<Program>(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          language,
          code_content: codeContent,
        }),
      })

      showToast(isNew ? '新增成功' : '儲存成功', 'success')
      
      if (isNew) {
        router.push(`/dashboard/programs/${data.id}`)
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : '儲存時發生錯誤', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return {
    state: {
      name,
      language,
      codeContent,
      isSaving,
      isNew
    },
    actions: {
      setName,
      setLanguage,
      setCodeContent,
      handleSave
    }
  }
}
