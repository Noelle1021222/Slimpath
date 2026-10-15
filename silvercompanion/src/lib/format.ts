import { diffDays, hourOf, taipeiParts, todayISO, WEEKDAY_LABELS, weekday } from './time'

const ntd = new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 0 })

/** 1200 → "$1,200" */
export function formatMoney(amount: number) {
  const sign = amount < 0 ? '−' : ''
  return `${sign}$${ntd.format(Math.abs(amount))}`
}

export function formatNumber(n: number, digits = 0) {
  return new Intl.NumberFormat('zh-TW', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n)
}

/** "2026-10-15" → "10月15日" */
export function formatMonthDay(iso: string) {
  const [, m, d] = iso.split('-').map(Number)
  return `${m}月${d}日`
}

/** "2026-10-15" → "週四" */
export function formatWeekday(iso: string) {
  return `週${WEEKDAY_LABELS[weekday(iso)]}`
}

/** "今天" / "明天" / "後天" / "昨天" or null */
export function relativeDayLabel(iso: string, today: string = todayISO()) {
  const diff = diffDays(iso, today)
  if (diff === 0) return '今天'
  if (diff === 1) return '明天'
  if (diff === 2) return '後天'
  if (diff === -1) return '昨天'
  return null
}

/** "今天 · 10月15日（四）" */
export function formatDateLong(iso: string, today: string = todayISO()) {
  const rel = relativeDayLabel(iso, today)
  const base = `${formatMonthDay(iso)}（${WEEKDAY_LABELS[weekday(iso)]}）`
  return rel ? `${rel} · ${base}` : base
}

/** "09:00:00" → "09:00" */
export function shortTime(time: string) {
  return time.slice(0, 5)
}

export function formatTimeRange(start: string, end: string) {
  return `${shortTime(start)}–${shortTime(end)}`
}

export function hoursBetween(start: string, end: string) {
  return hourOf(end) - hourOf(start)
}

/** Order id → "SC-1A2B3C4D" (spec 3.5: 顯示時可取前 8 碼大寫) */
export function orderCode(id: string) {
  return `SC-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`
}

/** 0912345678 → 0912-345-678 */
export function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (/^09\d{8}$/.test(digits)) return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`
  if (/^0\d{8,9}$/.test(digits)) return `${digits.slice(0, 2)}-${digits.slice(2, digits.length - 4)}-${digits.slice(-4)}`
  return phone
}

export function normalizePhone(phone: string) {
  const trimmed = phone.trim()
  const plus = trimmed.startsWith('+') ? '+' : ''
  return plus + trimmed.replace(/\D/g, '')
}

export function isValidTaiwanPhone(phone: string) {
  const digits = normalizePhone(phone)
  return /^09\d{8}$/.test(digits) || /^\+8869\d{8}$/.test(digits) || /^0\d{8,9}$/.test(digits)
}

/** "1234567890123" → "•••• 0123" */
export function maskAccount(account: string) {
  return `•••• ${account.slice(-4)}`
}

const rtf = new Intl.RelativeTimeFormat('zh-TW', { numeric: 'auto' })

/** ISO timestamp → "剛剛" / "3 分鐘前" / "昨天" / "10月12日" */
export function formatRelativeTime(timestamp: string | number, now: number = Date.now()) {
  const t = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime()
  const diffSec = Math.round((t - now) / 1000)
  const abs = Math.abs(diffSec)
  if (abs < 45) return '剛剛'
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour')
  const days = Math.round(diffSec / 86400)
  if (Math.abs(days) < 7) return rtf.format(days, 'day')
  return formatMonthDay(todayISO(new Date(t)))
}

/** ISO timestamp → "14:05" in Taipei time */
export function formatClock(timestamp: string | number) {
  const p = taipeiParts(new Date(timestamp))
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`
}

export function greeting(at: Date = new Date()) {
  const h = taipeiParts(at).hour
  if (h < 5) return '夜深了'
  if (h < 11) return '早安'
  if (h < 14) return '午安'
  if (h < 18) return '下午好'
  return '晚安'
}

/** "陳怡君" → "怡君"; nickname wins when present */
export function shortName(fullName: string, nickname?: string | null) {
  if (nickname) return nickname
  return fullName.length >= 3 ? fullName.slice(1) : fullName
}

/** First visible character used for monogram avatars. */
export function monogram(name: string) {
  const clean = name.replace(/(老師|大哥|大姐|阿姨|先生|小姐)$/u, '').trim()
  return Array.from(clean).at(-1) ?? '伴'
}
