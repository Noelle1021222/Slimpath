import type { LucideIcon } from 'lucide-react'
import { BookOpenText, Footprints, MessageCircleHeart, Smartphone, Sparkles, Stethoscope, WandSparkles } from 'lucide-react'
import type { Mobility, Mood, NotificationType, OrderStatus, PaymentMethod, ServiceType } from '@/types'

export interface ServiceMeta {
  id: ServiceType
  label: string
  short: string
  description: string
  icon: LucideIcon
  /** soft tint + strong ink, readable on both themes */
  tint: string
  ink: string
}

/** 7 大服務 (spec 4.2.1) */
export const SERVICES: ServiceMeta[] = [
  { id: 'chat', label: '傾聽陪伴', short: '聊天', description: '聊聊往事、聽聽老歌，把話慢慢說完', icon: MessageCircleHeart, tint: '#fde7dc', ink: '#8e3510' },
  {
    id: 'medical',
    label: '陪同就醫',
    short: '就醫',
    description: '掛號、候診、記醫囑、領藥，一路陪到回家',
    icon: Stethoscope,
    tint: '#dcecf5',
    ink: '#24536f',
  },
  { id: 'walk', label: '外出散步', short: '散步', description: '公園曬太陽、市場買菜、輪椅也能出門', icon: Footprints, tint: '#e1efdf', ink: '#2f5c3a' },
  { id: 'tech', label: '手機教學', short: '學手機', description: 'LINE 視訊、拍照傳照片、網路掛號一次學會', icon: Smartphone, tint: '#ece4f6', ink: '#5a3d80' },
  { id: 'read', label: '讀報唸書', short: '讀報', description: '讀報紙、唸佛經、說故事，眼睛休息一下', icon: BookOpenText, tint: '#fbefd0', ink: '#7a5200' },
  { id: 'clean', label: '居家整理', short: '整理', description: '衣櫃換季、雜物分類，家裡清爽又安全', icon: Sparkles, tint: '#dff0ee', ink: '#1f5c58' },
  { id: 'custom', label: '客製服務', short: '客製', description: '寫書法、下象棋、回老家…說說您的需要', icon: WandSparkles, tint: '#f7e2e6', ink: '#7d2f42' },
]

export const SERVICE_MAP = Object.fromEntries(SERVICES.map((s) => [s.id, s])) as Record<ServiceType, ServiceMeta>

export const MOBILITY_OPTIONS: { id: Mobility; hint: string }[] = [
  { id: '可自理', hint: '能自己走動' },
  { id: '需攙扶', hint: '走路需要扶' },
  { id: '需輪椅', hint: '以輪椅代步' },
  { id: '臥床', hint: '大多時間在床' },
]

export const CHRONIC_SUGGESTIONS = ['高血壓', '糖尿病', '輕微失智', '心臟病', '關節退化', '重聽', '視力退化', '中風後復健', '帕金森氏症', '骨質疏鬆']

export const PROVIDER_TAG_SUGGESTIONS = [
  '會講台語',
  '會講客語',
  '護理系畢業',
  '照服員證照',
  'CPR 證照',
  '陪診經驗豐富',
  '失智症照護訓練',
  '可協助輪椅',
  '手機教學達人',
  '退休教師',
  '耐心十足',
  '會下象棋',
]

/** RatingModal quick tags */
export const RATING_TAGS = ['準時抵達', '態度親切', '細心耐心', '溝通順暢', '專業可靠', '長輩很開心']

export const MOODS: { id: Mood; label: string; caption: string; color: string; soft: string }[] = [
  { id: 'happy', label: '開心', caption: '笑容很多，聊得起勁', color: '#2f6b45', soft: '#e2f0e4' },
  { id: 'neutral', label: '平穩', caption: '狀況穩定，有點累', color: '#8a5600', soft: '#fdf0d5' },
  { id: 'sad', label: '低落', caption: '心情不太好，需要關心', color: '#2b6185', soft: '#e0eef6' },
]
export const MOOD_MAP = Object.fromEntries(MOODS.map((m) => [m.id, m])) as Record<Mood, (typeof MOODS)[number]>

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; tone: 'neutral' | 'primary' | 'info' | 'success' | 'warning' | 'danger' }> = {
  pending: { label: '待接單', tone: 'warning' },
  accepted: { label: '已接單', tone: 'primary' },
  navigating: { label: '前往中', tone: 'info' },
  in_progress: { label: '服務中', tone: 'success' },
  completed: { label: '已完成', tone: 'neutral' },
  cancelled: { label: '已取消', tone: 'danger' },
}

export const PAYMENT_METHOD_META: Record<PaymentMethod, { label: string; hint: string; available: boolean }> = {
  linepay: { label: 'LINE Pay', hint: '跳轉至 LINE Pay 授權付款，最快速', available: true },
  credit_card: { label: '信用卡', hint: '即將開放', available: false },
  cash: { label: '現金', hint: '服務結束時當面付給陪伴者', available: true },
}

export const NOTIFICATION_ROUTE: Partial<Record<NotificationType, { seeker?: string; provider?: string }>> = {
  order_new: { provider: '/provider/requests' },
  order_paid: { provider: '/provider/requests' },
  order_accepted: { seeker: '/seeker/orders' },
  order_declined: { seeker: '/seeker/orders' },
  order_cancelled: { seeker: '/seeker/orders', provider: '/provider/schedule' },
  order_navigating: { seeker: '/seeker' },
  order_arrived: { seeker: '/seeker/orders' },
  order_completed: { seeker: '/seeker/care-logs' },
  order_refunded: { seeker: '/seeker/orders' },
  rating: { provider: '/provider/profile' },
  withdrawal: { provider: '/provider' },
}

export const QUICK_REPLIES = {
  seeker: ['謝謝您！', '請問大概幾點到？', '鑰匙放在信箱裡', '媽媽今天狀況不錯'],
  provider: ['我出發囉！', '快到了，大約 5 分鐘', '已抵達樓下', '今天一切順利 😊'],
}

export const CARE_LOG_PROMPTS = ['今天聊了什麼話題？', '飲食與喝水狀況', '身體或情緒的變化', '給家屬的叮嚀']

export const TRACKING_INTERVAL_MS = 6000

export const SUPPORT_PHONE = '0800-000-123'
