'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSave, faChevronLeft } from '@fortawesome/free-solid-svg-icons'
import { Link } from '@/i18n/navigation'
import styles from '../programs.module.scss'
import { useProgramEditor } from '../useProgramEditor'

interface ProgramEditorClientProps {
  programId: string // 'new' for creating a new program
}

export default function ProgramEditorClient({ programId }: ProgramEditorClientProps) {
  const { state, actions } = useProgramEditor(programId)

  if (state.loading) return <div className={styles.loading}>載入中...</div>

  return (
    <div className={styles.editorContainer}>
      <header className={styles.editorHeader}>
        <div className={styles.headerLeft}>
          <Link href="/dashboard/programs" className={styles.backButton}>
            <FontAwesomeIcon icon={faChevronLeft} />
          </Link>
          <h1 className={styles.title}>{state.isNew ? '新增程式檔案' : '編輯程式檔案'}</h1>
        </div>
        <button 
          className={styles.primaryButton} 
          onClick={() => void actions.handleSave()}
          disabled={state.isSaving}
        >
          <FontAwesomeIcon icon={faSave} />
          <span>{state.isSaving ? '儲存中...' : '儲存變更'}</span>
        </button>
      </header>

      <main className={styles.editorWrapper}>
        <div className={styles.editorFields}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>程式名稱</label>
            <input 
              type="text" 
              className={styles.input} 
              value={state.name}
              onChange={(e) => actions.setName(e.target.value)}
              placeholder="例如：Arduino 基礎 LED 閃爍"
              autoFocus
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>程式語言</label>
            <select 
              className={styles.select}
              value={state.language}
              onChange={(e) => actions.setLanguage(e.target.value)}
            >
              <option value="cpp">C++ (Arduino)</option>
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="markdown">Markdown</option>
              <option value="text">Plain Text</option>
            </select>
          </div>
        </div>

        <div className={styles.editorMain}>
          <textarea 
            className={styles.codeArea}
            value={state.codeContent}
            onChange={(e) => actions.setCodeContent(e.target.value)}
            placeholder="// 在此輸入程式碼..."
            spellCheck={false}
          />
        </div>
      </main>
    </div>
  )
}
