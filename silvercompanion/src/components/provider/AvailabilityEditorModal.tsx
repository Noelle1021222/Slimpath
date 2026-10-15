import { CalendarRange, Copy, Eraser, Lock, Moon, Sun, Sunrise, Sunset } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ResponsiveModal } from '@/components/ui/responsive-modal'
import { useBookedSlots } from '@/hooks/queries'
import { useUpdateProvider } from '@/hooks/useProviderMutations'
import { pruneAvailability } from '@/lib/availability'
import { formatMonthDay, relativeDayLabel } from '@/lib/format'
import { addDays, hourLabel, hourOf, nextDays, taipeiParts, WEEKDAY_LABELS, weekday } from '@/lib/time'
import { cn, haptic } from '@/lib/utils'
import type { AvailabilitySlots, ProviderDetails } from '@/types'

const PRESETS = [
  { label: '上午', icon: Sunrise, hours: [8, 9, 10, 11] },
  { label: '下午', icon: Sun, hours: [13, 14, 15, 16, 17] },
  { label: '晚上', icon: Sunset, hours: [18, 19, 20, 21] },
  { label: '深夜', icon: Moon, hours: [22, 23, 0, 1] },
]

/**
 * Spec 4.3.1 — 設定空檔時間: tap hours on/off for the next 14 days (24h),
 * apply presets, copy a day to the same weekday. Booked hours are locked.
 */
export function AvailabilityEditorModal({ open, onOpenChange, details }: { open: boolean; onOpenChange: (open: boolean) => void; details: ProviderDetails }) {
  const days = useMemo(() => nextDays(14), [])
  const [slots, setSlots] = useState<AvailabilitySlots>({})
  const [date, setDate] = useState(days[0])
  const booked = useBookedSlots(details.provider_id)
  const update = useUpdateProvider('可預約時段已更新')

  useEffect(() => {
    if (open) setSlots(pruneAvailability(details.availability_slots ?? {}))
  }, [open, details.availability_slots])

  const lockedHours = useMemo(() => {
    const set = new Set<string>()
    for (const b of booked.data ?? []) for (let h = hourOf(b.start_time); h < hourOf(b.end_time); h++) set.add(`${b.service_date}|${h}`)
    return set
  }, [booked.data])

  const { date: today, hour: nowHour } = taipeiParts()
  const hoursOf = (d: string) => new Set((slots[d] ?? []).map(hourOf))
  const set = (d: string, hours: Set<number>) =>
    setSlots((s) => {
      const next = { ...s }
      if (hours.size) next[d] = [...hours].sort((a, b) => a - b).map(hourLabel)
      else delete next[d]
      return next
    })
  const toggle = (h: number) => {
    if (lockedHours.has(`${date}|${h}`)) return toast.message('這個時段已有預約，無法關閉。')
    haptic(6)
    const current = hoursOf(date)
    if (current.has(h)) current.delete(h)
    else current.add(h)
    set(date, current)
  }
  const preset = (hours: number[]) => {
    const current = hoursOf(date)
    const allOn = hours.every((h) => current.has(h))
    hours.forEach((h) => (allOn && !lockedHours.has(`${date}|${h}`) ? current.delete(h) : current.add(h)))
    set(date, current)
  }
  const copyToWeekdays = () => {
    const hours = hoursOf(date)
    let count = 0
    for (let i = 7; i < 21; i += 7) {
      const target = addDays(date, i)
      if (target > days[days.length - 1]) break
      set(target, new Set([...hours, ...[...lockedHours].filter((k) => k.startsWith(target)).map((k) => Number(k.split('|')[1]))]))
      count++
    }
    toast.success(count ? `已套用到之後 ${count} 個${'週' + WEEKDAY_LABELS[weekday(date)]}` : '兩週內沒有相同的星期可以套用')
  }
  const total = Object.values(slots).reduce((n, h) => n + h.length, 0)
  const selected = hoursOf(date)

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      title="設定可預約時段"
      description="點選小時開放或關閉預約；家屬只會看到您開放、且還沒被預約的時段。"
      footer={
        <div className="flex items-center gap-4">
          <p className="flex-1 text-base text-ink-2">
            未來兩週共開放 <b className="font-num text-xl text-ink">{total}</b> 小時
          </p>
          <Button
            size="lg"
            loading={update.isPending}
            onClick={() => update.mutate({ availability_slots: pruneAvailability(slots) }, { onSuccess: () => onOpenChange(false) })}
          >
            <CalendarRange /> 儲存時段
          </Button>
        </div>
      }
    >
      <div className="-mx-1 scrollbar-none flex gap-2 overflow-x-auto px-1 pb-2" role="tablist" aria-label="選擇日期">
        {days.map((d) => {
          const n = (slots[d] ?? []).length
          return (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={d === date}
              onClick={() => setDate(d)}
              className={cn(
                'flex w-[70px] shrink-0 flex-col items-center rounded-2xl border-2 py-2 transition-colors',
                d === date ? 'border-primary bg-primary text-on-primary' : 'border-line hover:border-line-strong',
              )}
            >
              <span className={cn('text-sm font-bold', d === date ? 'text-on-primary/80' : 'text-ink-3')}>
                {relativeDayLabel(d) ?? `週${WEEKDAY_LABELS[weekday(d)]}`}
              </span>
              <span className="font-num text-2xl leading-tight font-bold">{Number(d.slice(8, 10))}</span>
              <span className={cn('text-xs font-bold', d === date ? 'text-on-primary/90' : n ? 'text-primary-ink' : 'text-ink-3')}>
                {n ? `${n} 小時` : '休息'}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-base font-bold">{formatMonthDay(date)}</span>
        {PRESETS.map((p) => (
          <Button key={p.label} variant="secondary" size="sm" onClick={() => preset(p.hours)}>
            <p.icon /> {p.label}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => set(date, new Set([...lockedHours].filter((k) => k.startsWith(date)).map((k) => Number(k.split('|')[1]))))}
        >
          <Eraser /> 全部關閉
        </Button>
        <Button variant="ghost" size="sm" onClick={copyToWeekdays}>
          <Copy /> 套用到之後的週{WEEKDAY_LABELS[weekday(date)]}
        </Button>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
        {Array.from({ length: 24 }, (_, h) => {
          const on = selected.has(h)
          const locked = lockedHours.has(`${date}|${h}`)
          const past = date === today && h <= nowHour
          return (
            <button
              key={h}
              type="button"
              aria-pressed={on}
              disabled={past}
              onClick={() => toggle(h)}
              className={cn(
                'relative h-14 rounded-2xl border-2 text-base font-bold tabular transition-colors disabled:opacity-35',
                locked
                  ? 'border-transparent bg-hero text-hero-ink'
                  : on
                    ? 'border-primary bg-primary-soft text-primary-ink'
                    : 'border-line text-ink-3 hover:border-line-strong hover:text-ink',
              )}
              aria-label={`${hourLabel(h)}${locked ? '（已預約）' : on ? '（開放）' : '（未開放）'}`}
            >
              {hourLabel(h)}
              {locked && <Lock className="absolute top-1.5 right-1.5 size-3.5" />}
            </button>
          )
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-sm font-bold text-ink-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-full border-2 border-primary bg-primary-soft" /> 開放預約
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-hero" /> 已被預約（鎖定）
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-full border-2 border-line" /> 未開放
        </span>
      </div>
    </ResponsiveModal>
  )
}
