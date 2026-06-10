'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import styles from './accounts.module.scss'
import {
  fetchAccountUsers,
  updateAccountRoles,
  AccountUserRow,
} from './client-utils'
import { UserRole, getUserRoleName } from '@/app/types/user'
import Selector from '@/app/components/Selector/Selector'
import { useToast } from '@/app/contexts/ToastContext'
import { Table, TableColumn } from '@/app/components/Table'

interface AccountsClientProps {
  currentUserId: string
  /** 操作者可指派的角色（super_admin / admin 為全部；admin_accounts 為模組管理員 + member） */
  assignableRoles: UserRole[]
}

export default function AccountsClient({
  currentUserId,
  assignableRoles,
}: AccountsClientProps) {
  const { showToast } = useToast()

  const assignableSet = useMemo(
    () => new Set(assignableRoles),
    [assignableRoles],
  )
  const roleOptions = useMemo(
    () =>
      assignableRoles.map((role) => ({
        value: role,
        label: getUserRoleName(role),
      })),
    [assignableRoles],
  )

  const [users, setUsers] = useState<AccountUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingUserId, setSavingUserId] = useState<string | null>(null)
  const [dirtyUsers, setDirtyUsers] = useState<Set<string>>(new Set())

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchAccountUsers()
      setUsers(data)
      setDirtyUsers(new Set())
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : '載入使用者失敗',
        'error',
      )
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const handleRolesChange = useCallback(
    (targetUserId: string, newRoles: UserRole[]) => {
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id !== targetUserId) return u
          return {
            ...u,
            roles: newRoles.length === 0 ? (['member'] as UserRole[]) : newRoles,
          }
        }),
      )
      setDirtyUsers((prev) => new Set(prev).add(targetUserId))
    },
    [],
  )

  const handleSaveRoles = useCallback(
    async (targetUserId: string, newRoles: UserRole[]) => {
      try {
        setSavingUserId(targetUserId)
        const saved = await updateAccountRoles(targetUserId, newRoles)
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, roles: saved } : u)),
        )
        setDirtyUsers((prev) => {
          const next = new Set(prev)
          next.delete(targetUserId)
          return next
        })
        showToast('權限已成功更新', 'success')
      } catch (error) {
        showToast(error instanceof Error ? error.message : '儲存失敗', 'error')
        await loadUsers()
      } finally {
        setSavingUserId(null)
      }
    },
    [showToast, loadUsers],
  )

  const columns = useMemo<TableColumn<AccountUserRow>[]>(
    () => [
      {
        key: 'display_name',
        header: '使用者',
        width: '180px',
        searchable: true,
        searchAccessor: (u) =>
          [u.display_name, u.username].filter(Boolean).join(' '),
        render: (u) => (
          <div className={styles.userCell}>
            <span className={styles.userName}>
              {u.display_name || u.username || '未知身分'}
            </span>
            {u.id === currentUserId && (
              <span className={styles.selfBadge}>（您）</span>
            )}
          </div>
        ),
      },
      {
        key: 'username',
        header: '帳號',
        render: (u) => (
          <span className={styles.username}>{u.username ?? '—'}</span>
        ),
      },
      {
        key: 'email',
        header: '信箱',
        render: (u) => <span className={styles.email}>{u.email}</span>,
      },
      {
        key: 'roles',
        header: '權限分配',
        render: (u) => {
          const roles = Array.isArray(u.roles) ? u.roles : (['member'] as UserRole[])
          // 操作者是否有權編輯此列：目標目前持有的角色必須全部落在可指派範圍內。
          // （super_admin 的可指派範圍涵蓋全部角色，故對任何人皆可編輯。）
          const editable = roles.every((role) => assignableSet.has(role))

          if (!editable) {
            return (
              <div className={styles.readonlyRoles}>
                {roles.map((role) => (
                  <span key={role} className={styles.roleBadge}>
                    {getUserRoleName(role)}
                  </span>
                ))}
                <span className={styles.lockedHint}>（權限不足，無法編輯）</span>
              </div>
            )
          }

          return (
            <div className={styles.rolesCell}>
              <Selector<UserRole>
                mode="multiple"
                options={roleOptions}
                values={roles}
                onMultipleChange={(vals) => handleRolesChange(u.id, vals)}
                onClose={() => {
                  if (dirtyUsers.has(u.id)) void handleSaveRoles(u.id, u.roles)
                }}
                placeholder="請選擇權限..."
                disabled={savingUserId === u.id}
              />
              {savingUserId === u.id && (
                <FontAwesomeIcon
                  icon={faSpinner}
                  spin
                  className={styles.saveSpinner}
                />
              )}
            </div>
          )
        },
      },
    ],
    [
      currentUserId,
      assignableSet,
      roleOptions,
      dirtyUsers,
      savingUserId,
      handleRolesChange,
      handleSaveRoles,
    ],
  )

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <h2>帳號管理</h2>
        <p className={styles.heroDescription}>
          管理所有使用者的角色與權限。調整後點擊其他區域即會自動儲存。
        </p>
      </header>

      <Table<AccountUserRow>
        columns={columns}
        data={users}
        rowKey={(u) => u.id}
        loading={loading}
        emptyMessage="目前沒有使用者資料。"
        searchable
        searchPlaceholder="搜尋名稱或帳號..."
      />
    </div>
  )
}
