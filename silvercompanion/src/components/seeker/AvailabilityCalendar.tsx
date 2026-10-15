import { Moon, Sun, Sunrise, Sunset } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { useBookedSlots } from '@/hooks/queries'
import { computeDaySlots, type DaySlot } from '@/lib/availability'
import { relativeDayLabel } from '@/lib/format'
import { nextDays, WEEKDAY_LABELS, weekday } from '@/lib/time'
import { cn, haptic } from '@/lib/utils'
import type { AvailabilitySlots } from '@/types'

const PERIODS = [
  { label: '凌晨', icon: Moon, from: 0, to: 6 },
  { label: '上午', icon: Sunrise, from: 6, to: 12 },
  { label: '下午', icon: Sun, from: 12, to: 18 },
  { label: '晚上', icon: Sunset, from: 18, to: 24 },
]

/**
 * Spec 4.2.2 — the companion's opening hours for the next 7 days, minus hours
 * already booked: orange = bookable, grey = full. Tapping a slot starts a
 * booking at that time.
 */
export function AvailabilityCalendar({
  providerId,
  slots,
  onPick,
  selected,
  days = 7,
}: {
  providerId: string
  slots: AvailabilitySlots
  onPick: (date: string, hour: number) => void
  selected?: { date: string; hour: number } | null
  days?: number
}) {
  const booked = useBookedSlots(providerId)
  const dates = useMemo(() => nextDays(days), [days])
  const perDay = useMemo(
    () => Object.fromEntries(dates.map((d) => [d, computeDaySlots(slots, booked.data ?? [], d)])) as Record<string, DaySlot[]>,
    [dates, slots, booked.data],
  )
  const firstOpen = dates.find((d) => perDay[d].some((s) => s.state === 'available')) ?? dates[0]
  const [date, setDate] = useState(selected?.date ?? firstOpen)
  const day = perDay[date] ?? []
  const visible = day.filter((s) => s.state !== 'past')

  return (
    <div>
      <div
        className="-mx-1 scrollbar-none flex gap-2 overflow-x-auto [mask-image:linear-gradient(to_right,black_88%,transparent)] px-1 pb-2"
        role="tablist"
        aria-label="選擇日期"
      >
        {dates.map((d) => {
          const open = perDay[d].filter((s) => s.state === 'available').length
          const full = perDay[d].some((s) => s.state === 'booked')
          const status = open ? `${open} 個空檔` : full ? '已額滿' : perDay[d].length ? '已結束' : '休息'
          const active = d === date
          return (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setDate(d)}
              className={cn(
                'relative flex w-[72px] shrink-0 flex-col items-center rounded-2xl border-2 py-2.5 transition-all',
                active ? 'border-primary bg-primary text-on-primary shadow-glow' : 'border-line bg-surface hover:border-line-strong',
                !open && !active && 'border-transparent bg-surface-2',
              )}
            >
              <span className={cn('text-sm font-bold', active ? 'text-on-primary' : 'text-ink-2')}>
                {relativeDayLabel(d) ?? `週${WEEKDAY_LABELS[weekday(d)]}`}
              </span>
              <span className="font-num text-2xl leading-tight font-bold">{Number(d.slice(8, 10))}</span>
              <span className={cn('text-xs font-bold', active ? 'text-on-primary' : open ? 'text-primary-ink' : 'text-ink-2')}>{status}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-4 min-h-40" role="tabpanel" aria-label={`${date} 的時段`}>
        {booked.isLoading ? (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <p className="rounded-2xl bg-surface-2 px-4 py-6 text-center text-base text-ink-3">
            {day.length ? '今天的時段已經結束，看看明天吧。' : '這天休息，沒有開放預約。'}
          </p>
        ) : (
          <div className="space-y-4">
            {PERIODS.map((p) => {
              const items = visible.filter((s) => s.hour >= p.from && s.hour < p.to)
              if (!items.length) return null
              return (
                <div key={p.label}>
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-ink-3">
                    <p.icon className="size-4" /> {p.label}
                  </p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {items.map((s) => {
                      const isSelected = selected?.date === date && selected.hour === s.hour
                      const full = s.state === 'booked'
                      return (
                        <motion.button
                          key={s.hour}
                          type="button"
                          whileTap={full ? undefined : { scale: 0.95 }}
                          disabled={full}
                          onClick={() => {
                            haptic(8)
                            onPick(date, s.hour)
                          }}
                          aria-label={`${s.label} ${full ? '已額滿' : '可預約'}`}
                          className={cn(
                            'h-12 rounded-xl border-2 text-base font-bold tabular transition-colors',
                            full
                              ? 'cursor-not-allowed border-transparent bg-surface-3 text-ink-3 line-through decoration-2'
                              : isSelected
                                ? 'border-primary bg-primary text-on-primary'
                                : 'border-accent/60 bg-[color-mix(in_oklab,var(--accent),white_88%)] text-primary-ink hover:border-primary hover:bg-primary hover:text-on-primary',
                          )}
                        >
                          {s.label}
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <div className="mt-4 flex items-center gap-4 text-sm font-bold text-ink-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-full border-2 border-accent bg-[color-mix(in_oklab,var(--accent),white_80%)]" /> 可預約
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-surface-3" /> 已額滿
        </span>
      </div>
    </div>
  )
}
