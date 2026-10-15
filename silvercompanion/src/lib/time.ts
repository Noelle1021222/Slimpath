/**
 * Date helpers pinned to Asia/Taipei, matching how the database interprets
 * service_date + start_time. ISO dates are plain "YYYY-MM-DD" strings.
 */
export const TAIPEI_TZ = 'Asia/Taipei'

const partsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TAIPEI_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

export interface TaipeiParts {
  date: string
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

export function taipeiParts(at: Date = new Date()): TaipeiParts {
  const p = Object.fromEntries(partsFormatter.formatToParts(at).map((x) => [x.type, x.value]))
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour) % 24,
    minute: Number(p.minute),
  }
}

export function todayISO(at: Date = new Date()) {
  return taipeiParts(at).date
}

export function currentMonth(at: Date = new Date()) {
  return todayISO(at).slice(0, 7)
}

export function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

export function diffDays(a: string, b: string) {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return Math.round((Date.UTC(ay, am - 1, ad) - Date.UTC(by, bm - 1, bd)) / 86_400_000)
}

/** 0 = Sunday … 6 = Saturday */
export function weekday(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

export const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'] as const

export function nextDays(count: number, from: string = todayISO()) {
  return Array.from({ length: count }, (_, i) => addDays(from, i))
}

/** "09:00" → 9, "24:00" → 24 */
export function hourOf(time: string) {
  return Number(time.slice(0, 2))
}

/** 9 → "09:00" */
export function hourLabel(hour: number) {
  return `${String(hour).padStart(2, '0')}:00`
}

/** Epoch ms of a Taipei wall-clock date + "HH:MM" time. */
export function taipeiTimestamp(iso: string, time: string) {
  const [y, m, d] = iso.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  // Taiwan has no DST: UTC+8 all year.
  return Date.UTC(y, m - 1, d, hh - 8, mm || 0)
}

export function monthStart(month: string) {
  return `${month}-01`
}

export function nextMonthStart(at: Date = new Date()) {
  const { year, month } = taipeiParts(at)
  const nextY = month === 12 ? year + 1 : year
  const nextM = month === 12 ? 1 : month + 1
  return `${nextY}-${String(nextM).padStart(2, '0')}-01`
}
