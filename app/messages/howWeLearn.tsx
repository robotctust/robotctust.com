import React, { ReactNode } from 'react'
import { Link } from '@/i18n/navigation'

export interface HowWeLearnItem {
  title: string
  description: string | ReactNode
  points: {
    title: string
    points: string[]
  }
}

export const howWeLearn: HowWeLearnItem[] = [
  {
    title: '從零到一，打造你的第一台機器人',
    description:
      '別擔心沒有任何基礎！我們的基礎社課將帶你從最核心的觀念入門，認識電子元件、學習基礎的程式邏輯。社團幹部們會一步步引導你，從點亮一顆 LED 燈開始，到理解馬達與感測器，讓你親手賦予機器人生命。',
    points: {
      title: '學習重點',
      points: [
        '硬體認識：Arduino/ESP 開發版、感測器、馬達驅動。',
        '程式基礎：C/C++ 或 MicroPython 程式邏輯與語法。',
        '電路概念：基礎電學與麵包版實作。',
      ],
    },
  },
  {
    title: '不只紙上談兵，我們動手實現！',
    description:
      '理論學完當然要馬上應用！社團會定期舉辦主題式的工作坊，像是行事曆規劃的「自走車 DIY」，讓每位社員都能親手組裝、焊接、編寫程式，將課堂所學轉化為眼前會動的實體。解決實作中遇到的問題，是成長最快的捷徑！',
    points: {
      title: '活動形式',
      points: [
        '分組合作，共同打造。',
        '幹部現場指導，解決疑難雜症。',
        '提供完整材料包，輕鬆上手。',
      ],
    },
  },
  {
    title: '在挑戰中競技，在合作中成長',
    description: (
      <>
        學習成果的最佳試煉場就是競賽！我們每學期都會舉辦如「
        <Link
          href="/competitions/obstacle-avoidance-2025-11-12"
          className="link"
        >
          機器人避障比賽
        </Link>
        」和「
        <Link href="/competitions/line-following-2025-12-31" className="link">
          機器人循線比賽
        </Link>
        」等社內競賽。這不只是技術的較量，更是團隊合作、策略思考與臨場反應的綜合考驗。快來與夥伴們一同享受這份緊張又刺激的成就感！
      </>
    ),
    points: {
      title: '競賽特色',
      points: [
        '趣味與挑戰性兼具的賽道。',
        '培養實戰經驗與團隊默契。',
        '觀摩他人作品，激發新靈感。',
      ],
    },
  },
  {
    title: '不只是興趣，我們創造價值',
    description:
      '當你具備基礎後，我們鼓勵你將腦中的酷炫點子變成真實的專案！社團將引導社員進行跨領域的主題專案開發，從生活應用到學術研究，目標是打造出具有實際應用價值的專屬機器人，並積極參與校外大型競賽，爭取榮譽！',
    points: {
      title: '未來展望',
      points: [
        '組建競賽團隊，挑戰台灣智慧型機器人大賽等指標賽事。',
        '與他校、企業合作，進行技術交流。',
        '開發具潛力的作品，甚至挑戰專利申請。',
      ],
    },
  },
  {
    title: '拓展視野，連結未來的科技人脈',
    description:
      '在社團裡，你不只會遇到志同道合的夥伴，我們也計畫邀請校內專業老師、業界專家，分享最新的技術趨勢與實務經驗。透過交流，不僅能學習新知，更能提早佈局你未來的科技職涯！',
    points: {
      title: '交流方式',
      points: [
        '定期技術分享會。',
        '邀請業界專家演講。',
        '期末成果展與作品發表會。',
      ],
    },
  },
]
