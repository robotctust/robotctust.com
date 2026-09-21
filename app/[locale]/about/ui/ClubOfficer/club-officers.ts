export interface ClubOfficer {
  name: string
  position: string
  /** 一句話介紹；留空則不渲染 */
  tagline: string
  /** Supabase UID；留空則不查頭像、不產生個人頁連結 */
  userId: string
}

// 新增幹部：補 userId 後頭像與個人頁連結會自動接上；tagline 可之後再填
export const CLUB_OFFICERS: ClubOfficer[] = [
  { name: '藍世錡', position: '社長',  tagline: '', userId: 'ba387c98-30d1-49aa-b4e5-fa21aeca1cd0' },
  { name: '趙泰齡', position: '副社長', tagline: '', userId: '3e14215c-dade-41fa-b724-9045b3da7256' },
  { name: '王朝育', position: '活動',  tagline: '', userId: '86de539d-7512-4904-b508-dcd1d32d12a3' },
  { name: '林廷亘', position: '總務',  tagline: '', userId: '478b65b6-f2ef-49ad-9301-ddda4b4c16fa' },
  { name: '陳宜均', position: '財務',  tagline: '', userId: '' },
  { name: '林昌龍', position: '技術',  tagline: '', userId: 'd814a649-0f9b-4223-80ed-c334f93deba0' },
]
