import type { AvailabilitySlots, BookedSlot, ProviderPublic } from '@/types'
import { hourLabel, hourOf, nextDays, taipeiParts, todayISO, weekday } from './time'

export type SlotState = 'available' | 'booked' | 'past'

export interface DaySlot {
  hour: number
  label: string
  state: SlotState
}

/**
 * Hours a companion opened on `date`, marked booked when an existing order
 * overlaps and past when already gone (today only). Hours the companion did
 * not open are omitted — the calendar only shows what can be considered.
 */
export function computeDaySlots(slots: AvailabilitySlots | null | undefined, booked: BookedSlot[], date: string, now: Date = new Date()): DaySlot[] {
  const open = (slots?.[date] ?? []).map(hourOf).filter((h) => Number.isInteger(h) && h >= 0 && h < 24)
  const { date: today, hour: currentHour } = taipeiParts(now)
  const bookedHours = new Set<number>()
  for (const b of booked) {
    if (b.service_date !== date) continue
    for (let h = hourOf(b.start_time); h < hourOf(b.end_time); h++) bookedHours.add(h)
  }
  return [...new Set(open)]
    .sort((a, b) => a - b)
    .map((hour) => ({
      hour,
      label: hourLabel(hour),
      state: date < today || (date === today && hour <= currentHour) ? 'past' : bookedHours.has(hour) ? 'booked' : 'available',
    }))
}

/** How many consecutive bookable hours start at `startHour` (max `cap`). */
export function maxConsecutiveHours(daySlots: DaySlot[], startHour: number, cap = 12) {
  const available = new Set(daySlots.filter((s) => s.state === 'available').map((s) => s.hour))
  let n = 0
  while (n < cap && available.has(startHour + n)) n++
  return n
}

export interface DaySummary {
  date: string
  available: number
  booked: number
}

export function summarizeWeek(slots: AvailabilitySlots | null | undefined, booked: BookedSlot[], days = 7, now: Date = new Date()): DaySummary[] {
  return nextDays(days, todayISO(now)).map((date) => {
    const day = computeDaySlots(slots, booked, date, now)
    return {
      date,
      available: day.filter((s) => s.state === 'available').length,
      booked: day.filter((s) => s.state === 'booked').length,
    }
  })
}

/** Weekly template (weekday → hours) expanded into concrete dates. */
export function expandWeeklyTemplate(template: Record<number, number[]>, days: number, from: string = todayISO()): AvailabilitySlots {
  const out: AvailabilitySlots = {}
  for (const date of nextDays(days, from)) {
    const hours = template[weekday(date)] ?? []
    if (hours.length) out[date] = [...hours].sort((a, b) => a - b).map(hourLabel)
  }
  return out
}

/** Drop dates before today and empty days so the JSON stays small. */
export function pruneAvailability(slots: AvailabilitySlots, today: string = todayISO()): AvailabilitySlots {
  return Object.fromEntries(
    Object.entries(slots)
      .filter(([date, hours]) => date >= today && hours.length > 0)
      .sort(([a], [b]) => a.localeCompare(b)),
  )
}

export function toggleHour(slots: AvailabilitySlots, date: string, hour: number): AvailabilitySlots {
  const current = new Set(slots[date] ?? [])
  const label = hourLabel(hour)
  if (current.has(label)) current.delete(label)
  else current.add(label)
  const next = { ...slots }
  if (current.size) next[date] = [...current].sort()
  else delete next[date]
  return next
}

/** Earliest opening hour that has not passed yet (bookings are checked on the detail page). */
export function nextOpening(p: Pick<ProviderPublic, 'availability_slots'>) {
  const today = todayISO()
  const hour = taipeiParts().hour
  const days = Object.keys(p.availability_slots ?? {})
    .filter((d) => d >= today)
    .sort()
  for (const d of days) {
    const hours = (p.availability_slots[d] ?? []).map((h) => Number(h.slice(0, 2))).filter((h) => d > today || h > hour)
    if (hours.length) return { date: d, hour: Math.min(...hours) }
  }
  return null
}
