'use client'

import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faUsers,
  faLock,
  faSpinner,
  faSync,
  faDatabase,
} from '@fortawesome/free-solid-svg-icons'
import styles from './admin.module.scss'
import Page from '@/app/components/page/Page'
import { AuthContext } from '@/app/contexts/AuthContext'
import { batchSyncCompetitions } from '@/app/utils/competitionService'
import { competitions } from '@/app/[locale]/competitions/Competitions'
import { fetchAllUsers, updateUserRoles } from './actions'
import { UserRole, getUserRoleName, ALL_ROLES } from '@/app/types/user'
import Selector from '@/app/components/Selector/Selector'
import { useToast } from '@/app/contexts/ToastContext'
import { Table, TableColumn } from '@/app/components/Table'

const ROLE_OPTIONS = ALL_ROLES.map(role => ({
  value: role,
  label: getUserRoleName(role)
}))

interface AdminUserRow {
  id: string
  email: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  roles: UserRole[]
  created_at: string
}

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
  
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingUserId, setSavingUserId] = useState<string | null>(null)
  const [dirtyUsers, setDirtyUsers] = useState<Set<string>>(new Set())

  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle')
  const [syncResult, setSyncResult] = useState<{ success: number; errors: string[] } | null>(null)

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchAllUsers()
      setUsers(data as AdminUserRow[])
      setDirtyUsers(new Set())
    } catch (error) {
      showToast(error instanceof Error ? error.message : '載入使用者失敗', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  const userId = supabaseUser?.id
  useEffect(() => {
    if (!authLoading && userId && isCurrentUserSuperAdmin) {
      void loadUsers()
    } else if (!authLoading) {
      setLoading(false)
    }
  }, [authLoading, userId, isCurrentUserSuperAdmin, loadUsers])

  const handleRolesChange = useCallback((targetUserId: string, newRoles: UserRole[]) => {
    setUsers(prev => prev.map(u => {
      if (u.id !== targetUserId) return u
      return { ...u, roles: newRoles.length === 0 ? (['member'] as UserRole[]) : newRoles }
    }))
    setDirtyUsers(prev => new Set(prev).add(targetUserId))
  }, [])

  const handleSaveRoles = useCallback(async (targetUserId: string, newRoles: UserRole[]) => {
    try {
      setSavingUserId(targetUserId)
      await updateUserRoles(targetUserId, newRoles)
      setDirtyUsers(prev => {
        const next = new Set(prev)
        next.delete(targetUserId)
        return next
      })
      showToast('權限已成功更新', 'success')
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : '儲存失敗', 'error')
      await loadUsers()
    } finally {
      setSavingUserId(null)
    }
  }, [showToast, loadUsers])

  const columns = useMemo<TableColumn<AdminUserRow>[]>(() => [
    {
      key: 'display_name',
      header: '使用者',
      width: '180px',
      searchable: true,
      searchAccessor: (u) => [u.display_name, u.username].filter(Boolean).join(' '),
      render: (u) => (
        <div className={styles.userCell}>
          <span className={styles.userName}>{u.display_name || u.username || '未知身分'}</span>
          {u.id === supabaseUser?.id && <span className={styles.selfBadge}>（您）</span>}
        </div>
      ),
    },
    {
      key: 'username',
      header: '帳號',
      render: (u) => <span className={styles.username}>{u.username ?? '—'}</span>,
    },
    {
      key: 'email',
      header: '信箱',
      render: (u) => <span className={styles.email}>{u.email}</span>,
    },
    {
      key: 'roles',
      header: '權限分配',
      render: (u) => (
        <div className={styles.rolesCell}>
          <Selector<UserRole>
            mode="multiple"
            options={ROLE_OPTIONS}
            values={Array.isArray(u.roles) ? u.roles : ['member']}
            onMultipleChange={(vals) => handleRolesChange(u.id, vals)}
            onClose={() => { if (dirtyUsers.has(u.id)) void handleSaveRoles(u.id, u.roles) }}
            placeholder="請選擇權限..."
            disabled={savingUserId === u.id}
          />
          {savingUserId === u.id && (
            <FontAwesomeIcon icon={faSpinner} spin className={styles.saveSpinner} />
          )}
        </div>
      ),
    },
  ], [supabaseUser?.id, dirtyUsers, savingUserId, handleRolesChange, handleSaveRoles])

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
          <header className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <FontAwesomeIcon icon={faUsers} /> 使用者角色設定
            </h2>
            <p className={styles.sectionDescription}>
              管理所有使用者的權限，分配後點擊儲存即可生效。
            </p>
          </header>

          <Table<AdminUserRow>
            columns={columns}
            data={users}
            rowKey={(u) => u.id}
            loading={loading}
            emptyMessage="目前沒有使用者資料。"
            searchable
            searchPlaceholder="搜尋名稱或帳號..."
          />
        </section>

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
