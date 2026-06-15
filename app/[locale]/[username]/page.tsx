import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import styles from './User.module.scss'

// utils
import { getUserProfileStatusByUsername } from '@/app/utils/userServiceServer'
import { getFollowCounts } from '@/app/utils/followService'
import { serializeUserProfile } from '@/app/types/serialized'
import { metadata } from '@/app/utils/metadata'

// components
import UserProfileClient from './UserProfileClient'

/**
 * [Page] 使用者資訊頁面
 * @param params
 * @returns JSX.Element
 */
export default async function UserPage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  // 獲取使用者名稱
  const { username: rawUsername } = await params
  const decodedUsername = decodeURIComponent(rawUsername)

  if (!decodedUsername.startsWith('@')) {
    notFound()
  }

  const username = decodedUsername.slice(1)

  //* 在 Server 端獲取使用者資料
  const result = await getUserProfileStatusByUsername(username)

  if (result.status === 'not_found') {
    notFound()
  }

  //* 序列化使用者資料以安全傳遞給 Client 端
  const serializedUserProfile =
    result.status === 'found' ? serializeUserProfile(result.profile) : null

  //* 取得追蹤數字（永遠公開）
  const initialFollowCounts =
    result.status === 'found'
      ? await getFollowCounts(result.profile.uid)
      : null

  return (
    <div className={`page ${styles.user_page}`}>
      <div className={styles.user_page_container}>
        <UserProfileClient
          username={username}
          initialUserProfile={serializedUserProfile}
          initialFollowCounts={initialFollowCounts}
          isPrivate={result.status === 'private'}
        />
        <div className={`page-container ${styles.user_contents}`}>
          <p className={styles.feature_coming_soon}>更多社群功能，敬請期待！</p>
        </div>
      </div>
    </div>
  )
}

/**
 * [Function] 生成使用者資訊頁面的 Metadata
 * @param params
 * @returns Metadata
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}): Promise<Metadata> {
  // 獲取使用者名稱
  const { username: rawUsername } = await params
  const decodedUsername = decodeURIComponent(rawUsername)

  if (!decodedUsername.startsWith('@')) {
    return { title: '使用者不存在｜中臺機器人研究社' }
  }

  const username = decodedUsername.slice(1)
  const result = await getUserProfileStatusByUsername(username)

  if (result.status === 'not_found') {
    return { title: `@${username} 不存在｜中臺機器人研究社` }
  }

  if (result.status === 'private') {
    return {
      title: `@${username}｜中臺機器人研究社`,
      description: `@${username} 的帳號目前設為不公開`,
    }
  }

  const { profile } = result
  const title = `${profile.displayName} (@${profile.username})｜中臺機器人研究社`
  const description = `查看 ${profile.displayName} 在中臺機器人研究社的個人資料`

  return metadata({
    title,
    description,
    image: profile.photoURL,
    url: `/@${username}`,
    category: 'profile',
  })
}
