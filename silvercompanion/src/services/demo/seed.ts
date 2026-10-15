/**
 * Demo world — the same cast as supabase/seed.sql, plus a little history so
 * every companion has reviews. All dates are relative to "today" (Taipei).
 */
import type {
  AppNotification,
  CareLog,
  HealthLog,
  KinshipRecipient,
  LatLng,
  Message,
  Mood,
  Order,
  PaymentMethod,
  Profile,
  ProviderDetails,
  ServiceType,
  Withdrawal,
} from '@/types'
import { expandWeeklyTemplate } from '@/lib/availability'
import { computePrice } from '@/lib/pricing'
import { addDays, currentMonth, hourLabel, taipeiParts, taipeiTimestamp, todayISO } from '@/lib/time'
import { DEMO_VERSION, type DemoState, type DemoUser } from './store'

export const DEMO_PASSWORD = 'SilverDemo#2026'

export const DEMO_ACCOUNTS = {
  seeker: 'a1111111-0000-4000-8000-000000000001',
  provider: 'b2222222-0000-4000-8000-000000000001',
} as const

const S = {
  yijun: 'a1111111-0000-4000-8000-000000000001',
  meiling: 'a1111111-0000-4000-8000-000000000002',
  wenhua: 'a1111111-0000-4000-8000-000000000003',
}

const P = (n: number) => `b2222222-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`
const O = (n: number) => `c3333333-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`
const C = (n: number) => `d4444444-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`

interface ProviderFixture {
  n: number
  email: string
  full_name: string
  nickname: string
  phone: string
  rate: number
  services: ServiceType[]
  tags: string[]
  city: string
  districts: string[]
  online: boolean
  video: string | null
  done: number
  rating: number
  reviews: number
  hours: number[]
  /** ISO weekday numbers (1 = Mon … 7 = Sun) */
  daysOff: number[]
  home: LatLng
  bio: string
}

const PROVIDERS: ProviderFixture[] = [
  {
    n: 1,
    email: 'xiaojun@silvercompanion.test',
    full_name: '林小君',
    nickname: '小君',
    phone: '0987654321',
    rate: 400,
    services: ['chat', 'medical', 'walk', 'read'],
    tags: ['護理系畢業', '會講台語', 'CPR 證照'],
    city: '台北市',
    districts: ['大安區', '信義區', '中正區'],
    online: false,
    video: 'aqz-KE-bpKQ',
    done: 126,
    rating: 4.92,
    reviews: 79,
    hours: [8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21],
    daysOff: [7],
    home: { lat: 25.0441, lng: 121.5291 },
    bio: '護理系畢業，在醫院病房工作過三年。我相信陪伴不只是照顧身體，更是讓長輩覺得自己被好好聽見。陪診時我會幫忙記下醫囑、整理藥袋，回家後再仔細跟家屬報告。',
  },
  {
    n: 2,
    email: 'ahong@silvercompanion.test',
    full_name: '王建宏',
    nickname: '阿宏',
    phone: '0920111333',
    rate: 300,
    services: ['tech', 'walk', 'chat'],
    tags: ['手機教學達人', '耐心十足', '會講台語'],
    city: '台北市',
    districts: ['中山區', '松山區', '大同區'],
    online: true,
    video: null,
    done: 61,
    rating: 4.88,
    reviews: 54,
    hours: [10, 11, 12, 13, 14, 15, 16, 17],
    daysOff: [1],
    home: { lat: 25.0526, lng: 121.5435 },
    bio: '在通訊行工作八年，最喜歡看到長輩第一次用 LINE 視訊打給孫子時的笑容。教學會準備放大字體的步驟小卡，下次忘記也能自己看。',
  },
  {
    n: 3,
    email: 'yating@silvercompanion.test',
    full_name: '張雅婷',
    nickname: '雅婷',
    phone: '0921222444',
    rate: 450,
    services: ['medical', 'chat', 'clean'],
    tags: ['照服員證照', '陪診經驗豐富', '會講客語'],
    city: '新北市',
    districts: ['板橋區', '中和區', '永和區'],
    online: false,
    video: null,
    done: 152,
    rating: 4.97,
    reviews: 113,
    hours: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    daysOff: [6, 7],
    home: { lat: 25.0106, lng: 121.5163 },
    bio: '照顧服務員資歷十年，熟悉雙和、亞東醫院的看診動線。陪診時會主動向醫師說明近況，回家後幫忙分裝一週藥盒。',
  },
  {
    n: 4,
    email: 'zhihao@silvercompanion.test',
    full_name: '黃志豪',
    nickname: '志豪',
    phone: '0922333555',
    rate: 250,
    services: ['walk', 'read', 'chat'],
    tags: ['大學生', '體育系', '會下象棋'],
    city: '台北市',
    districts: ['文山區', '大安區'],
    online: false,
    video: null,
    done: 23,
    rating: 4.7,
    reviews: 18,
    hours: [16, 17, 18, 19, 20],
    daysOff: [3],
    home: { lat: 24.9988, lng: 121.5409 },
    bio: '體育系大三，喜歡陪爺爺奶奶到公園散步、下象棋。力氣大、腳步穩，上下樓梯可以放心交給我。',
  },
  {
    n: 5,
    email: 'shufen@silvercompanion.test',
    full_name: '李淑芬',
    nickname: '淑芬老師',
    phone: '0923444666',
    rate: 500,
    services: ['chat', 'read', 'custom'],
    tags: ['退休國小老師', '會講台語', '書法'],
    city: '台北市',
    districts: ['士林區', '北投區'],
    online: true,
    video: null,
    done: 188,
    rating: 4.99,
    reviews: 167,
    hours: [9, 10, 11, 14, 15, 16],
    daysOff: [6, 7],
    home: { lat: 25.0928, lng: 121.5246 },
    bio: '教了三十年書，退休後最喜歡的事就是陪長輩讀報、寫書法、聊聊從前。說話慢、聲音清楚，重聽的長輩也聽得懂。',
  },
  {
    n: 6,
    email: 'xiaowu@silvercompanion.test',
    full_name: '吳承恩',
    nickname: '小吳',
    phone: '0924555777',
    rate: 350,
    services: ['tech', 'chat'],
    tags: ['資訊工程背景', '視訊教學', '一對一講義'],
    city: '新北市',
    districts: ['新店區', '永和區'],
    online: true,
    video: null,
    done: 41,
    rating: 4.82,
    reviews: 33,
    hours: [19, 20, 21, 22],
    daysOff: [],
    home: { lat: 24.9676, lng: 121.5418 },
    bio: '軟體工程師，週末兼職陪伴。可以到府或用視訊教手機、平板、叫車與網路掛號，每次都會留下一張圖解小講義。',
  },
  {
    n: 7,
    email: 'peishan@silvercompanion.test',
    full_name: '蔡佩珊',
    nickname: '佩珊',
    phone: '0925666888',
    rate: 400,
    services: ['medical', 'walk', 'clean'],
    tags: ['社工系', '失智症照護訓練', '會說日文'],
    city: '台北市',
    districts: ['信義區', '南港區', '內湖區'],
    online: false,
    video: null,
    done: 74,
    rating: 4.91,
    reviews: 61,
    hours: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
    daysOff: [2],
    home: { lat: 25.0553, lng: 121.6066 },
    bio: '社工系畢業，受過失智症照護訓練。陪伴時會配合長輩的步調，用懷舊照片和老歌幫助回憶，讓每一次見面都更安心。',
  },
  {
    n: 8,
    email: 'mingde@silvercompanion.test',
    full_name: '鄭明德',
    nickname: '明德大哥',
    phone: '0926777999',
    rate: 550,
    services: ['medical', 'walk', 'custom'],
    tags: ['退役消防員', 'EMT-1', '可協助輪椅'],
    city: '桃園市',
    districts: ['桃園區', '中壢區', '八德區'],
    online: false,
    video: null,
    done: 49,
    rating: 4.93,
    reviews: 41,
    hours: [6, 7, 8, 9, 10, 11, 12, 13, 14],
    daysOff: [5],
    home: { lat: 24.9936, lng: 121.301 },
    bio: '退役消防員，具 EMT-1 救護技術員資格。協助輪椅上下車、復健散步都很熟練，緊急狀況處理經驗豐富。',
  },
  {
    n: 9,
    email: 'jingyi@silvercompanion.test',
    full_name: '許靜宜',
    nickname: '靜宜',
    phone: '0927888000',
    rate: 350,
    services: ['chat', 'read', 'tech'],
    tags: ['心理系', '傾聽練習', '會講粵語'],
    city: '台中市',
    districts: ['西屯區', '南屯區', '北屯區'],
    online: true,
    video: null,
    done: 32,
    rating: 4.86,
    reviews: 27,
    hours: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
    daysOff: [1, 2],
    home: { lat: 24.1631, lng: 120.6406 },
    bio: '心理系研究生，專長是傾聽。很多時候長輩需要的不是建議，而是有人願意聽完他的故事。也可以視訊陪聊。',
  },
  {
    n: 10,
    email: 'ajie@silvercompanion.test',
    full_name: '劉文傑',
    nickname: '阿傑',
    phone: '0928999111',
    rate: 300,
    services: ['walk', 'clean', 'chat'],
    tags: ['居家整理', '力氣大', '會講台語'],
    city: '高雄市',
    districts: ['苓雅區', '前鎮區', '鳳山區'],
    online: false,
    video: null,
    done: 37,
    rating: 4.78,
    reviews: 30,
    hours: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
    daysOff: [7],
    home: { lat: 22.6219, lng: 120.3125 },
    bio: '做過搬家與居家整理，衣櫃換季、雜物分類、陪長輩去市場買菜都沒問題。一起整理家裡，也一起聊天。',
  },
]

/** Deterministic pseudo-random numbers so the demo looks the same every visit. */
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function weeklyTemplate(f: ProviderFixture) {
  const template: Record<number, number[]> = {}
  for (let weekday = 0; weekday < 7; weekday++) {
    const iso = weekday === 0 ? 7 : weekday
    if (!f.daysOff.includes(iso)) template[weekday] = [...f.hours]
  }
  return template
}

export function createDemoState(now: Date): DemoState {
  const today = todayISO(now)
  const nowMs = now.getTime()
  const ago = (minutes: number) => new Date(nowMs - minutes * 60_000).toISOString()
  const atDay = (offset: number, time: string) => new Date(taipeiTimestamp(addDays(today, offset), time)).toISOString()
  const rand = mulberry32(20261014)
  const tripHour = Math.min(taipeiParts(now).hour + 1, 21)

  const users: DemoUser[] = []
  const profiles: Profile[] = []
  const addPerson = (id: string, email: string, full_name: string, nickname: string, phone: string, role: 'seeker' | 'provider') => {
    users.push({ id, email, phone: null, password: DEMO_PASSWORD, createdAt: ago(60 * 24 * 200) })
    profiles.push({
      id,
      role,
      full_name,
      nickname,
      phone,
      avatar_url: null,
      emergency_contact_name: null,
      emergency_contact_phone: null,
      created_at: ago(60 * 24 * 200),
      updated_at: ago(60 * 24 * 30),
    })
  }

  addPerson(S.yijun, 'yijun@silvercompanion.test', '陳怡君', '怡君', '0912345678', 'seeker')
  addPerson(S.meiling, 'meiling@silvercompanion.test', '王美玲', '美玲', '0933456789', 'seeker')
  addPerson(S.wenhua, 'wenhua@silvercompanion.test', '張文華', '文華', '0955123987', 'seeker')
  Object.assign(profiles[0], { emergency_contact_name: '陳志明（哥哥）', emergency_contact_phone: '0922111222' })

  const providers: ProviderDetails[] = []
  const homeBase: Record<string, LatLng> = {}
  const templates: Record<string, Record<number, number[]>> = {}
  for (const f of PROVIDERS) {
    const id = P(f.n)
    addPerson(id, f.email, f.full_name, f.nickname, f.phone, 'provider')
    templates[id] = weeklyTemplate(f)
    homeBase[id] = f.home
    providers.push({
      provider_id: id,
      bio: f.bio,
      hourly_rate: f.rate,
      service_types: f.services,
      tags: f.tags,
      service_switch_is_online: true,
      youtube_video_id: f.video,
      is_verified: true,
      rating_avg: f.rating,
      review_count: f.reviews,
      bank_code: null,
      bank_account: null,
      available_balance: 0,
      last_withdraw_month: null,
      availability_slots: expandWeeklyTemplate(templates[id], 14, today),
      city: f.city,
      districts: f.districts,
      offers_online: f.online,
      completed_orders: f.done,
      updated_at: ago(60 * 24),
    })
  }
  const xiaojun = providers[0]
  Object.assign(xiaojun, {
    bank_code: '822',
    bank_account: '123456789012',
    available_balance: 12450,
    last_withdraw_month: currentMonth(new Date(taipeiTimestamp(addDays(today, -32), '12:00'))),
  })

  const home = '台北市大安區仁愛路四段 300 巷 12 號 3 樓'
  const kinship: KinshipRecipient[] = [
    {
      id: 1,
      seeker_id: S.yijun,
      name: '林秀英',
      nickname: '陳媽媽',
      age: 78,
      mobility: '需攙扶',
      chronic_diseases: ['高血壓', '輕微失智'],
      notes: '右耳重聽，說話請靠左側、放慢速度。喜歡聽鄧麗君的老歌，聊到台南老家會特別開心。',
      address: home,
      lat: 25.0375,
      lng: 121.5509,
      created_at: ago(60 * 24 * 190),
      updated_at: ago(60 * 24 * 20),
    },
    {
      id: 2,
      seeker_id: S.yijun,
      name: '陳國雄',
      nickname: '陳爸爸',
      age: 82,
      mobility: '需輪椅',
      chronic_diseases: ['糖尿病', '關節退化'],
      notes: '每天下午三點量血糖，飯後要提醒吃藥。喜歡下象棋、看棒球轉播。',
      address: home,
      lat: 25.0375,
      lng: 121.5509,
      created_at: ago(60 * 24 * 190),
      updated_at: ago(60 * 24 * 40),
    },
    {
      id: 3,
      seeker_id: S.meiling,
      name: '王李月娥',
      nickname: '王奶奶',
      age: 86,
      mobility: '可自理',
      chronic_diseases: ['重聽'],
      notes: '獨居，喜歡有人陪她去市場。',
      address: '台北市信義區松仁路 100 號',
      lat: 25.033,
      lng: 121.568,
      created_at: ago(60 * 24 * 120),
      updated_at: ago(60 * 24 * 120),
    },
    {
      id: 4,
      seeker_id: S.wenhua,
      name: '黃阿嬌',
      nickname: '黃阿嬤',
      age: 85,
      mobility: '需輪椅',
      chronic_diseases: ['心臟病', '高血壓'],
      notes: '需輪椅，計程車需預約無障礙車。',
      address: '台北市中正區羅斯福路一段 50 號',
      lat: 25.031,
      lng: 121.518,
      created_at: ago(60 * 24 * 90),
      updated_at: ago(60 * 24 * 90),
    },
  ]
  const kinOf = (id: number) => kinship.find((k) => k.id === id)!

  const health: HealthLog[] = []
  for (let d = 13; d >= 0; d--) {
    health.push({
      id: crypto.randomUUID(),
      seeker_id: S.yijun,
      recipient_id: 1,
      bp_high: 122 + Math.round(rand() * 12),
      bp_low: 75 + Math.round(rand() * 8),
      heart_rate: 68 + Math.round(rand() * 9),
      temperature: Math.round((36.3 + rand() * 0.5) * 10) / 10,
      steps: 2600 + Math.round(rand() * 2400),
      weight: Math.round((52 + rand() * 0.8) * 10) / 10,
      source: d % 3 === 0 ? 'device' : 'manual',
      recorded_at: atDay(-d, '08:30'),
      created_at: atDay(-d, '08:31'),
    })
    if (d % 2 === 0) {
      health.push({
        id: crypto.randomUUID(),
        seeker_id: S.yijun,
        recipient_id: 2,
        bp_high: 128 + Math.round(rand() * 14),
        bp_low: 78 + Math.round(rand() * 8),
        heart_rate: 72 + Math.round(rand() * 8),
        temperature: Math.round((36.4 + rand() * 0.4) * 10) / 10,
        steps: 900 + Math.round(rand() * 900),
        weight: Math.round((68 + rand() * 0.6) * 10) / 10,
        source: 'manual',
        recorded_at: atDay(-d, '15:10'),
        created_at: atDay(-d, '15:11'),
      })
    }
  }

  const orders: Order[] = []
  const addOrder = (o: {
    id: string
    seeker: string
    provider: string | null
    recipient: number
    service: ServiceType
    day: number
    start: number
    end: number
    method: PaymentMethod
    paid: boolean
    status: Order['order_status']
    notes?: string | null
    rate?: number
    createdMinutesAgo: number
    online?: boolean
    tx?: string | null
    cancelReason?: string | null
    cancelledBy?: string | null
  }) => {
    const rate = o.provider ? providers.find((p) => p.provider_id === o.provider)!.hourly_rate : (o.rate ?? 350)
    const hours = o.end - o.start
    const price = computePrice(rate, hours)
    const kin = kinOf(o.recipient)
    const date = addDays(today, o.day)
    const startIso = new Date(taipeiTimestamp(date, hourLabel(o.start))).toISOString()
    const endIso = new Date(taipeiTimestamp(date, hourLabel(o.end))).toISOString()
    const done = o.status === 'completed'
    orders.push({
      id: o.id,
      seeker_id: o.seeker,
      provider_id: o.provider,
      recipient_id: o.recipient,
      service_type: o.service,
      service_date: date,
      start_time: `${hourLabel(o.start)}:00`,
      end_time: `${hourLabel(o.end)}:00`,
      hours,
      location_address: kin.address,
      location_lat: kin.lat,
      location_lng: kin.lng,
      is_online: o.online ?? false,
      notes: o.notes ?? null,
      hourly_rate: rate,
      total_amount: price.total,
      platform_fee: price.platformFee,
      provider_earning: price.providerEarning,
      payment_method: o.method,
      payment_status: o.paid ? 'paid' : 'unpaid',
      linepay_transaction_id: o.method === 'linepay' ? (o.tx ?? `20261014${String(orders.length + 1).padStart(11, '0')}`) : null,
      order_status: o.status,
      cancel_reason: o.cancelReason ?? null,
      cancelled_by: o.cancelledBy ?? null,
      paid_at: o.paid ? ago(o.createdMinutesAgo - 2) : null,
      accepted_at: ['accepted', 'navigating', 'in_progress', 'completed'].includes(o.status) ? ago(Math.max(o.createdMinutesAgo - 30, 1)) : null,
      navigation_started_at: o.status === 'navigating' ? ago(6) : done ? startIso : null,
      arrived_at: done ? startIso : null,
      completed_at: done ? endIso : null,
      cancelled_at: o.status === 'cancelled' ? ago(o.createdMinutesAgo - 60) : null,
      created_at: ago(o.createdMinutesAgo),
      updated_at: ago(Math.max(o.createdMinutesAgo - 60, 1)),
    })
  }

  addOrder({
    id: O(1),
    seeker: S.yijun,
    provider: P(1),
    recipient: 1,
    service: 'medical',
    day: 0,
    start: tripHour,
    end: tripHour + 3,
    method: 'linepay',
    paid: true,
    status: 'navigating',
    notes: '台大醫院神經內科回診，掛號單在客廳桌上的藍色資料夾。',
    createdMinutesAgo: 60 * 24 * 3,
    tx: '2026101400000000001',
  })
  addOrder({
    id: O(2),
    seeker: S.yijun,
    provider: P(1),
    recipient: 2,
    service: 'walk',
    day: 3,
    start: 9,
    end: 11,
    method: 'cash',
    paid: false,
    status: 'accepted',
    notes: '陳爸爸坐輪椅，想去大安森林公園曬太陽。',
    createdMinutesAgo: 60 * 24 * 2,
  })
  addOrder({
    id: O(3),
    seeker: S.yijun,
    provider: P(3),
    recipient: 1,
    service: 'chat',
    day: -2,
    start: 14,
    end: 17,
    method: 'linepay',
    paid: true,
    status: 'completed',
    createdMinutesAgo: 60 * 24 * 6,
  })
  addOrder({
    id: O(4),
    seeker: S.yijun,
    provider: P(1),
    recipient: 1,
    service: 'medical',
    day: -5,
    start: 8,
    end: 12,
    method: 'linepay',
    paid: true,
    status: 'completed',
    createdMinutesAgo: 60 * 24 * 9,
  })
  addOrder({
    id: O(5),
    seeker: S.yijun,
    provider: P(2),
    recipient: 2,
    service: 'tech',
    day: -9,
    start: 15,
    end: 17,
    method: 'cash',
    paid: true,
    status: 'completed',
    createdMinutesAgo: 60 * 24 * 12,
  })
  addOrder({
    id: O(6),
    seeker: S.yijun,
    provider: P(4),
    recipient: 2,
    service: 'walk',
    day: -4,
    start: 16,
    end: 18,
    method: 'cash',
    paid: false,
    status: 'cancelled',
    createdMinutesAgo: 60 * 24 * 7,
    cancelReason: '當天下雨，改期再約。',
    cancelledBy: S.yijun,
  })
  addOrder({
    id: O(7),
    seeker: S.meiling,
    provider: P(1),
    recipient: 3,
    service: 'chat',
    day: 1,
    start: 15,
    end: 17,
    method: 'cash',
    paid: false,
    status: 'pending',
    notes: '奶奶獨居，平常很少出門，想找人陪她聊聊天、一起看老照片。',
    createdMinutesAgo: 40,
  })
  addOrder({
    id: O(8),
    seeker: S.wenhua,
    provider: null,
    recipient: 4,
    service: 'medical',
    day: 2,
    start: 8,
    end: 12,
    method: 'linepay',
    paid: true,
    status: 'pending',
    rate: 400,
    notes: '需輪椅！台大醫院心臟內科回診，需協助推輪椅與批價領藥。',
    createdMinutesAgo: 60,
  })
  addOrder({
    id: O(9),
    seeker: S.meiling,
    provider: P(1),
    recipient: 3,
    service: 'walk',
    day: 5,
    start: 9,
    end: 11,
    method: 'linepay',
    paid: true,
    status: 'pending',
    notes: '想去象山步道入口附近走走，奶奶走路還算穩。',
    createdMinutesAgo: 120,
  })

  // History that gives each companion a few visible reviews.
  const history: [number, string, string, number, ServiceType, number, number, number, number, boolean?][] = [
    [11, S.meiling, P(1), 3, 'chat', -12, 14, 16, 5],
    [12, S.wenhua, P(1), 4, 'medical', -20, 8, 11, 5],
    [13, S.meiling, P(5), 3, 'read', -7, 10, 12, 5],
    [14, S.wenhua, P(5), 4, 'chat', -15, 14, 16, 5],
    [15, S.meiling, P(7), 3, 'walk', -6, 9, 11, 5],
    [16, S.wenhua, P(8), 4, 'medical', -11, 7, 11, 5],
    [17, S.meiling, P(2), 3, 'tech', -16, 15, 17, 4],
    [18, S.wenhua, P(6), 4, 'tech', -8, 20, 21, 5, true],
    [19, S.meiling, P(9), 3, 'chat', -10, 19, 20, 5, true],
    [20, S.wenhua, P(3), 4, 'medical', -13, 9, 12, 5],
    [21, S.meiling, P(10), 3, 'clean', -18, 9, 12, 4],
    [22, S.wenhua, P(4), 4, 'walk', -21, 16, 18, 5],
  ]
  for (const [n, seeker, provider, recipient, service, day, start, end, , online] of history) {
    addOrder({
      id: O(n),
      seeker,
      provider,
      recipient,
      service,
      day,
      start,
      end,
      method: n % 2 ? 'cash' : 'linepay',
      paid: true,
      status: 'completed',
      createdMinutesAgo: 60 * 24 * (Math.abs(day) + 3),
      online: Boolean(online),
    })
  }

  const careLogs: CareLog[] = []
  const addLog = (n: number, order: number, mood: Mood, message: string, photos: string[], rating?: [number, string[], string]) => {
    const o = orders.find((x) => x.id === O(order))!
    careLogs.push({
      id: C(n),
      order_id: o.id,
      mood,
      message,
      photos: photos.map((p) => `${o.id}/${p}`),
      seeker_rating: rating?.[0] ?? null,
      seeker_tags: rating?.[1] ?? [],
      seeker_comment: rating?.[2] ?? null,
      rated_at: rating ? new Date(new Date(o.completed_at!).getTime() + 3 * 3600_000).toISOString() : null,
      created_at: o.completed_at!,
    })
  }
  addLog(
    1,
    3,
    'happy',
    '今天陪陳媽媽聊了好多年輕時在台南的故事，她說最懷念外婆做的碗粿。我們一起聽了〈月亮代表我的心〉，媽媽跟著哼了兩段，心情很好！午餐吃了半碗飯和青菜，飯後量血壓 126/80。',
    ['tea.svg', 'songbook.svg'],
    [5, ['態度親切', '細心耐心', '長輩很開心'], '雅婷很有耐心，媽媽一直說下次還要找她！'],
  )
  addLog(
    2,
    4,
    'neutral',
    '今天陪同至台大醫院神經內科回診。醫師表示記憶狀況穩定，藥量維持不變，下次回診排在下個月 20 日上午 9:30。候診約一小時，媽媽有點累，回程在車上小睡了一下。藥袋已放在客廳桌上，早晚各一包，已用便條紙標示。',
    ['hospital.svg', 'pills.svg'],
  )
  addLog(
    3,
    5,
    'happy',
    '教陳爸爸用 LINE 視訊打給孫子！練習了三次，已經能自己按綠色的視訊按鈕。也幫他把字體調大、把常用聯絡人放到桌面。他說下週想學怎麼傳照片給家人。',
    ['video-call.svg'],
    [5, ['準時抵達', '溝通順暢', '專業可靠'], '阿宏教得很清楚，爸爸現在每天都主動視訊。'],
  )
  const historyLogs: [number, Mood, string, number, string[], string][] = [
    [
      11,
      'happy',
      '陪王奶奶翻了一整本老相簿，她指著每張照片說故事，還教我怎麼包粽子。',
      5,
      ['態度親切', '細心耐心'],
      '小君很貼心，奶奶說好久沒有人這樣陪她聊天了。',
    ],
    [
      12,
      'neutral',
      '陪黃阿嬤到心臟內科回診，醫師調整了利尿劑，已在藥袋上標註新的服用時間。',
      5,
      ['專業可靠', '溝通順暢'],
      '陪診超專業，醫生交代的事都整理成筆記傳給我。',
    ],
    [
      13,
      'happy',
      '一起讀了今天的聯合報副刊，奶奶對社區新聞特別有興趣。',
      5,
      ['長輩很開心', '態度親切'],
      '淑芬老師聲音好溫柔，奶奶聽報紙聽到睡著，醒來還說要再約。',
    ],
    [14, 'happy', '和阿嬤聊她年輕時在大稻埕做布莊的日子，還寫了兩張春聯。', 5, ['細心耐心'], '阿嬤很喜歡寫書法，謝謝老師！'],
    [15, 'happy', '在公園慢慢走了兩圈，中途在涼亭休息喝水，奶奶說腳比上週有力。', 5, ['細心耐心', '長輩很開心'], '佩珊很有耐心，陪奶奶在公園慢慢走了一小時。'],
    [16, 'neutral', '協助輪椅上下無障礙計程車，候診時量了血壓 132/84，已告知醫師。', 5, ['專業可靠', '準時抵達'], '輪椅上下車都處理得很穩，讓人很放心。'],
    [17, 'happy', '教奶奶用手機拍照與傳照片到家族群組，她拍了窗台的蘭花。', 4, ['溝通順暢'], '教得很清楚，下次希望可以再慢一點點。'],
    [18, 'happy', '視訊教學：叫車 App 與網路掛號，已傳一份圖解講義到 LINE。', 5, ['專業可靠'], '視訊教學很方便，講義做得好清楚！'],
    [19, 'happy', '視訊陪聊一小時，奶奶分享了她年輕時在香港工作的故事。', 5, ['長輩很開心'], '靜宜很會聽，奶奶跟她講了一個小時的故事。'],
    [20, 'neutral', '陪診並協助批價領藥，藥物已分裝成一週藥盒。', 5, ['細心耐心', '專業可靠'], '雅婷處理得很細心，藥盒分裝好方便。'],
    [21, 'happy', '整理了衣櫃與廚房，把常用物品移到伸手可及的高度。', 4, ['準時抵達'], '整理得很乾淨，家裡走動更安全了。'],
    [22, 'happy', '陪阿嬤在河濱公園散步，順便買了她最愛的紅豆餅。', 5, ['長輩很開心', '態度親切'], '志豪很有活力，阿嬤很喜歡他。'],
  ]
  historyLogs.forEach(([order, mood, message, stars, tags, comment], i) => addLog(10 + i, order, mood, message, [], [stars, tags, comment]))

  let messageId = 0
  const messages: Message[] = []
  const msg = (from: string, to: string, content: string, minutesAgo: number, read = true) =>
    messages.push({ id: ++messageId, sender_id: from, receiver_id: to, content, is_read: read, created_at: ago(minutesAgo) })
  msg(S.yijun, P(1), '小君妳好，今天陪我媽媽去台大醫院回診，掛號單我放在客廳桌上的藍色資料夾裡。', 60 * 26)
  msg(P(1), S.yijun, '好的收到！我會提早十分鐘到，也會幫阿姨帶保溫杯 😊', 60 * 25)
  msg(S.yijun, P(1), '謝謝妳，媽媽最近膝蓋比較不舒服，走路要慢一點。', 60 * 24 + 50)
  msg(P(1), S.yijun, '了解，我會全程攙扶，看完診也會把醫生的叮嚀整理給您。', 60 * 24 + 40)
  msg(P(1), S.yijun, '我出發囉，大概 20 分鐘後到！', 6, false)
  msg(S.yijun, P(3), '雅婷，謝謝妳前天的陪伴，媽媽一直提到妳！', 60 * 40)
  msg(P(3), S.yijun, '不客氣！陳媽媽好可愛，下次再一起聽老歌 🎵', 60 * 39)
  msg(S.meiling, P(1), '小君妳好，明天下午可以陪我奶奶嗎？她很期待！', 35, false)

  let notificationId = 0
  const notifications: AppNotification[] = []
  const note = (user: string, type: AppNotification['type'], title: string, body: string, minutesAgo: number, read: boolean, orderId: string | null = null) =>
    notifications.push({ id: ++notificationId, user_id: user, type, title, body, order_id: orderId, is_read: read, created_at: ago(minutesAgo) })
  const md = (o: Order) => `${Number(o.service_date.slice(5, 7))}/${Number(o.service_date.slice(8, 10))} ${o.start_time.slice(0, 5)}`
  const o = (n: number) => orders.find((x) => x.id === O(n))!
  note(P(1), 'rating', '收到 5 顆星的評價', '小君很貼心，奶奶說好久沒有人這樣陪她聊天了。', 60 * 24 * 11, true, O(11))
  note(P(1), 'withdrawal', '提領已入帳', '$18,620 已匯入中國信託帳戶末四碼 9012。', 60 * 24 * 22, true)
  note(P(1), 'system', '記得更新下週的可預約時段', '保持時段最新，家屬才能順利預約到您。', 60 * 24, false)
  note(P(1), 'order_paid', '新的預約請求（已付款）', `美玲 預約了 ${md(o(9))} 的外出散步，已完成 LINE Pay 付款。`, 120, false, O(9))
  note(P(1), 'order_new', '新的預約請求', `美玲 預約了 ${md(o(7))} 的傾聽陪伴（現金付款）`, 40, false, O(7))
  note(S.yijun, 'order_completed', '服務完成，聯絡簿已更新', '雅婷 寫下了今天的陪伴紀錄，也歡迎給予評價。', 60 * 24 * 2, true, O(3))
  note(S.yijun, 'order_accepted', '小君 已接受預約', `${md(o(2))} 的外出散步已確認，可以在「我的訂單」查看細節。`, 60 * 24, true, O(2))
  note(S.yijun, 'order_navigating', '小君 正在前往', '點擊首頁的即時位置，就能看到陪伴者離家還有多遠。', 6, false, O(1))

  const withdrawals: Withdrawal[] = [
    {
      id: crypto.randomUUID(),
      provider_id: P(1),
      amount: 18620,
      month: currentMonth(new Date(taipeiTimestamp(addDays(today, -32), '12:00'))),
      bank_code: '822',
      bank_account: '123456789012',
      account_name: '林小君',
      status: 'paid',
      created_at: ago(60 * 24 * 25),
      processed_at: ago(60 * 24 * 22),
    },
    {
      id: crypto.randomUUID(),
      provider_id: P(1),
      amount: 15980,
      month: currentMonth(new Date(taipeiTimestamp(addDays(today, -62), '12:00'))),
      bank_code: '822',
      bank_account: '123456789012',
      account_name: '林小君',
      status: 'paid',
      created_at: ago(60 * 24 * 55),
      processed_at: ago(60 * 24 * 52),
    },
  ]

  return {
    version: DEMO_VERSION,
    anchorDate: today,
    users,
    profiles,
    providers,
    kinship,
    health,
    orders,
    careLogs,
    messages,
    notifications,
    sos: [],
    withdrawals,
    dismissals: [],
    documents: [
      { provider_id: P(1), name: '警察刑事紀錄證明書.pdf', kind: '良民證', path: `${P(1)}/police-record.pdf`, uploaded_at: ago(60 * 24 * 180) },
      { provider_id: P(1), name: '護理師證書.jpg', kind: '專業證照', path: `${P(1)}/nurse-license.jpg`, uploaded_at: ago(60 * 24 * 180) },
    ],
    photos: {},
    homeBase,
    templates,
    seq: { kinship: kinship.length, messages: messageId, notifications: notificationId },
  }
}

const DAY_MS = 86_400_000

function shiftIso(value: string | null, days: number) {
  return value ? new Date(new Date(value).getTime() + days * DAY_MS).toISOString() : value
}

/**
 * Moves the whole demo timeline forward so a visit days later still shows a
 * trip in progress, upcoming visits and recent care logs.
 */
export function rebaseDemoState(state: DemoState, today: string): DemoState {
  const [ay, am, ad] = state.anchorDate.split('-').map(Number)
  const [by, bm, bd] = today.split('-').map(Number)
  const days = Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / DAY_MS)
  if (days <= 0) return state

  const next: DemoState = structuredClone(state)
  next.anchorDate = today
  for (const o of next.orders) {
    o.service_date = addDays(o.service_date, days)
    for (const key of ['paid_at', 'accepted_at', 'navigation_started_at', 'arrived_at', 'completed_at', 'cancelled_at', 'created_at', 'updated_at'] as const) {
      o[key] = shiftIso(o[key], days) as never
    }
  }
  for (const h of next.health) {
    h.recorded_at = shiftIso(h.recorded_at, days)!
    h.created_at = shiftIso(h.created_at, days)!
  }
  for (const c of next.careLogs) {
    c.created_at = shiftIso(c.created_at, days)!
    c.rated_at = shiftIso(c.rated_at, days)
  }
  for (const m of next.messages) m.created_at = shiftIso(m.created_at, days)!
  for (const n of next.notifications) n.created_at = shiftIso(n.created_at, days)!
  for (const w of next.withdrawals) {
    w.created_at = shiftIso(w.created_at, days)!
    w.processed_at = shiftIso(w.processed_at, days)
  }
  for (const p of next.providers) {
    const shifted: Record<string, string[]> = {}
    for (const [date, hours] of Object.entries(p.availability_slots)) {
      const moved = addDays(date, days)
      if (moved >= today) shifted[moved] = hours
    }
    const template = next.templates[p.provider_id]
    if (template) {
      const rolling = expandWeeklyTemplate(template, 14, today)
      for (const [date, hours] of Object.entries(rolling)) if (!shifted[date]) shifted[date] = hours
    }
    p.availability_slots = shifted
  }
  return next
}
