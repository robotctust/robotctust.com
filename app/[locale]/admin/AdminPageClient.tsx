'use client'

import React, { useState, useContext } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLock, faSpinner, faSync, faDatabase } from '@fortawesome/free-solid-svg-icons'
import styles from './admin.module.scss'
import Page from '@/app/components/page/Page'
import { AuthContext } from '@/app/contexts/AuthContext'
import { batchSyncCompetitions } from '@/app/utils/competitionService'
import { competitions } from '@/app/[locale]/competitions/Competitions'
import { useToast } from '@/app/contexts/ToastContext'

export default function AdminPageClient() {
  const { showToast } = useToast()
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('AdminPage must be used within an AuthProvider')
  }

  const {
    supabaseUser,
    isSuperAdmin: isCurrentUserSuperAdmin,
    loading: authLoading,
  } = context

  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle')
  const [syncResult, setSyncResult] = useState<{ success: number; errors: string[] } | null>(null)

  const handleSyncCompetitions = async () => {
    if (!supabaseUser) return
    if (!window.confirm(`確定要同步 ${competitions.length} 個競賽到 Firestore 嗎？`)) return

    try {
      setSyncStatus('syncing')
      const result = await batchSyncCompetitions(competitions, supabaseUser.id)
      setSyncResult(result)
      if (result.errors.length > 0) {
        setSyncStatus('error')
        showToast(`同步完成，但有 ${result.errors.length} 個錯誤`, 'error')
      } else {
        setSyncStatus('success')
        showToast('競賽資料同步成功', 'success')
      }
    } catch (error) {
      setSyncStatus('error')
      showToast(error instanceof Error ? error.message : '同步失敗', 'error')
    }
  }

  if (authLoading) {
    return (
      <Page style={styles.adminContainer}>
        <div className={styles.adminContent}>
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <span>載入中...</span>
          </div>
        </div>
      </Page>
    )
  }

  if (!isCurrentUserSuperAdmin) {
    return (
      <Page style={styles.adminContainer}>
        <div className={styles.adminContent}>
          <div className={styles.accessDenied}>
            <FontAwesomeIcon icon={faLock} className={styles.accessIcon} />
            <h2>存取被拒絕</h2>
            <p>您沒有權限存取管理員頁面。</p>
          </div>
        </div>
      </Page>
    )
  }

  return (
    <Page style={styles.adminContainer}>
      <div className={styles.adminContent}>
        <header className={styles.header}>
          <div className={styles.headerTitle}>
            <h1>系統控制台</h1>
            <div className={styles.adminInfo}>
              <span className={styles.adminBadge}>超級管理員</span>
              <span className={styles.adminEmail}>{supabaseUser?.email}</span>
            </div>
          </div>
        </header>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <FontAwesomeIcon icon={faDatabase} /> 資料同步工具
          </h2>

          <div className={styles.syncGrid}>
            <article className={styles.syncCard}>
              <h3>競賽資料同步</h3>
              <p>同步本地 Competitions.ts 至雲端。</p>
              <div className={styles.syncMeta}>
                <span>待同步: {competitions.length}</span>
                {syncStatus === 'success' && <span className={styles.successText}>已成功</span>}
                {syncResult && syncResult.errors.length > 0 && (
                  <span className={styles.successText}>{syncResult.errors.length} 個錯誤</span>
                )}
              </div>
              <button
                onClick={() => void handleSyncCompetitions()}
                className={styles.syncButton}
                disabled={syncStatus === 'syncing'}
              >
                <FontAwesomeIcon icon={syncStatus === 'syncing' ? faSpinner : faSync} spin={syncStatus === 'syncing'} />
                同步競賽
              </button>
            </article>
          </div>
        </section>
      </div>
    </Page>
  )
}
