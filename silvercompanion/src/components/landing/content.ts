/** Landing copy kept apart from layout so it can be edited (or translated) in one place. */

/** The page's one easing curve: quick start, long soft landing. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const

export const LANDING_LINKS = [
  { href: '#services', label: '服務項目' },
  { href: '#how', label: '怎麼運作' },
  { href: '#safety', label: '安全機制' },
  { href: '#companions', label: '成為陪伴者' },
  { href: '#faq', label: '常見問題' },
]

/** One concrete moment per service — what a family is actually asking for. */
export const SERVICE_MOMENTS: Record<string, string> = {
  chat: '爸爸又講起當兵的故事，這次終於有人從頭聽到尾。',
  medical: '從掛號到領藥，醫師交代的每一句話都寫進聯絡簿。',
  walk: '推著輪椅去公園曬太陽，順路買了媽媽愛吃的芭樂。',
  tech: '學會用 LINE 視訊，週末就能看到在國外的孫子。',
  read: '眼睛容易累，就請人把今天的報紙慢慢唸給他聽。',
  clean: '衣櫃換季、走道淨空，家裡清爽，也少一分跌倒的風險。',
  custom: '想回老家看看、想練書法、想有人陪下盤棋——說出來就好。',
}

export const STEPS = [
  {
    no: '01',
    title: '建立長輩的照顧檔案',
    body: '行動能力、慢性病、說話要靠哪一側、怕不怕冷——寫一次，之後每位陪伴者出發前都會先讀過。',
    facts: ['四種行動能力分級', '慢性病與注意事項', '地址自動定位'],
  },
  {
    no: '02',
    title: '挑一位合得來的陪伴者',
    body: '依地區、服務、日期與預算篩選。看自我介紹影片、其他家屬的評價，再從他開放的空檔直接預約。',
    facts: ['實名＋良民證審核', '自我介紹影片', '未來兩週空檔一目了然'],
  },
  {
    no: '03',
    title: '出發、抵達，都即時知道',
    body: '陪伴者按下「開始導航」，你的手機就能看到他在地圖上移動，抵達時立刻收到通知。',
    facts: ['每 6 秒更新位置', '預估抵達時間', '只在服務期間分享'],
  },
  {
    no: '04',
    title: '每次陪伴，都有一本聯絡簿',
    body: '服務結束前，陪伴者會記下長輩的心情、今天做了什麼，附上照片。像小時候的聯絡簿，只是這次換你讀。',
    facts: ['心情紀錄', '最多 9 張照片', '評分與回饋'],
  },
]

export const DAY = [
  { time: '08:52', lane: 'home', title: '小君從捷運古亭站出發', detail: '帶著媽媽的健保卡影本與上次的藥袋清單。' },
  { time: '08:52', lane: 'you', notify: true, title: '「小君已出發，預計 09:10 抵達」', detail: '你在通勤的公車上，看著她在地圖上移動。' },
  { time: '09:10', lane: 'home', title: '門鈴響了', detail: '「妳就是小君喔？比照片還要瘦耶。」' },
  { time: '09:10', lane: 'you', notify: true, title: '「小君已抵達」', detail: '你把手機收進口袋，走進會議室。' },
  { time: '09:40', lane: 'home', title: '台大醫院・心臟內科', detail: '候診時聊到年輕時在鳳梨工廠上班的事。' },
  { time: '11:30', lane: 'home', title: '回程在巷口吃了碗湯麵', detail: '媽媽說好久沒有出門吃飯了。' },
  { time: '12:05', lane: 'you', notify: true, title: '收到聯絡簿：心情「開心」', detail: '「血壓控制得很好，藥量不變。」附上兩張照片。' },
  { time: '12:07', lane: 'you', title: '你回了一句「謝謝妳」', detail: '然後把照片傳到家族群組。' },
] as const

export const FAQ = [
  {
    q: '費用怎麼計算？有其他隱藏費用嗎？',
    a: '每位陪伴者自訂時薪（$200–$1,000），以小時計費，預約時就會看到總金額。沒有訂閱費或媒合費；平台服務費已包含在時薪內，由陪伴者的收入中扣除。',
  },
  {
    q: '陪伴者是怎麼審核的？',
    a: '所有陪伴者都需完成實名註冊，並上傳警察刑事紀錄證明（良民證）與相關證照，經平台逐一核對通過後才能上線接案。通過審核的陪伴者頁面會顯示「實名認證」標章。',
  },
  {
    q: '付款安全嗎？可以取消嗎？',
    a: '可以選擇 LINE Pay 或服務當天付現金。LINE Pay 付款會在陪伴者接單前完成授權；陪伴者出發前取消或被婉拒，款項會原路全額退回。',
  },
  {
    q: '爸媽不太會用手機，也能使用嗎？',
    a: '可以。預約、付款、查看位置與聯絡簿都由家屬操作，長輩不需要安裝任何 App。若長輩想自己使用，介面提供三段字級與大按鈕。',
  },
  {
    q: '服務中發生緊急狀況怎麼辦？',
    a: '陪伴者與家屬的畫面上都有 SOS 按鈕：一按就能撥打 119，同時把當下位置傳給緊急聯絡人。我們也建議在長輩檔案寫下慢性病與用藥，讓陪伴者事先了解。',
  },
  {
    q: '長輩的地址和健康資料誰看得到？',
    a: '只有你，以及負責這筆預約的陪伴者。公開媒合的需求在接單前只顯示大略區域；健康紀錄要等陪伴者接單後才開放，服務完成就自動關閉。這些規則都在資料庫層級把關，不靠畫面隱藏。',
  },
]
