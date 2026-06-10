import { faUserGear } from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'

/**
 * [Config] 設定分類 registry —— 設定頁導向、aside 導航、Header 入口的單一真實來源。
 * 新增設定分類時只需在 SETTINGS_SECTIONS 加入一筆。
 */
export interface SettingsSectionDef {
  /** 唯一鍵 */
  key: string
  /** 路由，如 '/settings/account' */
  href: string
  /** 對應 i18n 的 Settings.aside.nav.<labelKey> */
  labelKey: string
  icon: IconDefinition
  /** 是否需登入才可見 / 可用 */
  requiresAuth: boolean
}

export const SETTINGS_SECTIONS: SettingsSectionDef[] = [
  {
    key: 'account',
    href: '/settings/account',
    labelKey: 'account',
    icon: faUserGear,
    requiresAuth: true,
  },
  // 未來：{ key: 'appearance', href: '/settings/appearance', labelKey: 'appearance', icon: faPalette, requiresAuth: false }
]

/**
 * [Function] 取得目前使用者可見的設定分類（陣列順序即優先序）
 * @param isAuthed 是否已登入
 */
export function getVisibleSettingsSections(
  isAuthed: boolean,
): SettingsSectionDef[] {
  return SETTINGS_SECTIONS.filter((s) => !s.requiresAuth || isAuthed)
}
