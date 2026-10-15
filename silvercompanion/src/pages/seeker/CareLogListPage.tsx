import { Star } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router'
import { MoodFace } from '@/components/common/MoodFace'
import { PageContainer, PageHeader } from '@/components/common/PageHeader'
import { ServiceLabel } from '@/components/common/ServiceIcon'
import { PhotoLightbox } from '@/components/seeker/PhotoLightbox'
import { RatingModal, type RatingTarget } from '@/components/seeker/RatingModal'
import { UserAvatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton'
import { StarRating } from '@/components/ui/star-rating'
import { useCareLogs, usePhotoUrls } from '@/hooks/queries'
import { MOOD_MAP, MOODS } from '@/lib/constants'
import { formatTimeRange, formatWeekday } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CareLogDetails } from '@/types'

/** Spec 4.2.4 — every visit, the elder's mood and the companion's photos. */
export default function CareLogListPage() {
  const { data = [], isLoading } = useCareLogs()
  const location = useLocation()
  const focus = (location.state as { focus?: string } | null)?.focus ?? null
  const [rating, setRating] = useState<RatingTarget | null>(null)
  const [elder, setElder] = useState<number | null>(null)

  const elders = useMemo(() => {
    const map = new Map<number, string>()
    data.forEach((l) => map.set(l.recipient_id, l.recipient_nickname ?? l.recipient_name))
    return [...map.entries()]
  }, [data])
  const logs = elder == null ? data : data.filter((l) => l.recipient_id === elder)
  const counts = MOODS.map((m) => ({ ...m, n: logs.filter((l) => l.mood === m.id).length }))
  const total = Math.max(1, logs.length)

  const months = useMemo(() => {
    const groups: [string, CareLogDetails[]][] = []
    for (const l of logs) {
      const key = l.service_date.slice(0, 7)
      const g = groups.find(([k]) => k === key)
      if (g) g[1].push(l)
      else groups.push([key, [l]])
    }
    return groups
  }, [logs])

  useEffect(() => {
    if (focus) setTimeout(() => document.getElementById(`log-${focus}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 400)
  }, [focus, isLoading])

  return (
    <PageContainer>
      <PageHeader eyebrow="Care journal" title="數位聯絡簿" description="每次服務結束，陪伴者都會寫下長輩的心情、照片與給家人的叮嚀。" />

      {elders.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <FilterChip active={elder == null} onClick={() => setElder(null)}>
            全部
          </FilterChip>
          {elders.map(([id, name]) => (
            <FilterChip key={id} active={elder === id} onClick={() => setElder(id)}>
              {name}
            </FilterChip>
          ))}
        </div>
      )}

      {!isLoading && logs.length > 0 && (
        <section className="mb-10 rounded-[28px] border border-line bg-surface p-5 shadow-soft md:p-6" aria-label="心情統計">
          <p className="text-base font-bold text-ink-2">最近 {logs.length} 次陪伴的心情</p>
          <div className="mt-3 flex h-4 overflow-hidden rounded-full" aria-hidden>
            {counts.map((c) => (
              <motion.span
                key={c.id}
                initial={{ width: 0 }}
                animate={{ width: `${(c.n / total) * 100}%` }}
                transition={{ duration: 0.8 }}
                style={{ background: c.color }}
              />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            {counts.map((c) => (
              <span key={c.id} className="flex items-center gap-2 text-base">
                <MoodFace mood={c.id} className="size-8" label={false} />
                <span className="font-bold">{c.label}</span>
                <span className="font-num text-lg font-bold" style={{ color: c.color }}>
                  {c.n}
                </span>
              </span>
            ))}
          </div>
        </section>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
      ) : logs.length === 0 ? (
        <EmptyState illustration="book" title="還沒有聯絡簿" description="第一次服務結束後，這裡就會出現陪伴者寫給您的紀錄。" />
      ) : (
        <div className="space-y-10">
          {months.map(([month, items]) => (
            <section key={month} aria-label={`${Number(month.slice(5))} 月`}>
              <h2 className="mb-5 font-serif text-2xl">
                {month.slice(0, 4)} 年 {Number(month.slice(5))} 月
              </h2>
              <ol className="relative space-y-5 border-l-2 border-dashed border-line-strong pl-6 md:pl-8">
                {items.map((log) => (
                  <LogEntry
                    key={log.id}
                    log={log}
                    focused={log.id === focus}
                    onRate={() => setRating({ orderId: log.order_id, providerName: log.provider_name })}
                  />
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
      <RatingModal target={rating} onOpenChange={(v) => !v && setRating(null)} />
    </PageContainer>
  )
}

function LogEntry({ log, focused, onRate }: { log: CareLogDetails; focused: boolean; onRate: () => void }) {
  const photos = usePhotoUrls(log.photos)
  const [open, setOpen] = useState<number | null>(null)
  const mood = MOOD_MAP[log.mood]
  return (
    <li id={`log-${log.id}`} className="relative">
      <span className="absolute top-6 -left-[33px] size-4 rounded-full border-4 border-bg md:-left-[41px]" style={{ background: mood.color }} aria-hidden />
      <article
        className={cn(
          'rounded-[28px] border bg-surface p-5 shadow-soft transition-shadow md:p-7',
          focused ? 'border-primary ring-4 ring-primary/15' : 'border-line',
        )}
      >
        <header className="flex flex-wrap items-start gap-4">
          <div className="flex w-14 shrink-0 flex-col items-center rounded-2xl bg-surface-2 py-2">
            <span className="font-num text-3xl leading-none font-bold">{Number(log.service_date.slice(8, 10))}</span>
            <span className="text-sm font-bold text-ink-3">{formatWeekday(log.service_date)}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <ServiceLabel type={log.service_type} />
              <span className="text-[15px] font-bold text-ink-2 tabular">{formatTimeRange(log.start_time, log.end_time)}</span>
            </div>
            <p className="mt-2 flex items-center gap-2 text-base text-ink-2">
              <UserAvatar name={log.provider_name} src={log.provider_avatar_url} size="xs" />
              <span>
                <b className="text-ink">{log.provider_name}</b> 陪伴 <b className="text-ink">{log.recipient_nickname ?? log.recipient_name}</b>
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl px-3 py-2" style={{ background: mood.soft }}>
            <MoodFace mood={log.mood} className="size-10" />
            <span className="text-lg font-black" style={{ color: mood.color }}>
              {mood.label}
            </span>
          </div>
        </header>
        <p className="mt-5 text-[17px] leading-[1.9] whitespace-pre-wrap text-ink">{log.message}</p>
        {log.photos.length > 0 && (
          <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {(photos.data ?? log.photos.map(() => '')).map((src, i) =>
              src ? (
                <button
                  key={i}
                  type="button"
                  onClick={() => setOpen(i)}
                  className="overflow-hidden rounded-2xl focus-visible:ring-4 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                >
                  <img
                    src={src}
                    alt={`服務照片 ${i + 1}`}
                    className="aspect-square w-full object-cover transition-transform duration-500 hover:scale-105"
                    loading="lazy"
                  />
                </button>
              ) : (
                <Skeleton key={i} className="aspect-square" />
              ),
            )}
          </div>
        )}
        <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          {log.seeker_rating != null ? (
            <p className="flex flex-wrap items-center gap-2 text-[15px] text-ink-2">
              您的評價 <StarRating value={log.seeker_rating} size="sm" />
              {log.seeker_comment && <span className="text-ink-3">「{log.seeker_comment}」</span>}
            </p>
          ) : (
            <>
              <p className="text-[15px] text-ink-3">還沒有評價這次服務</p>
              <Button size="sm" onClick={onRate}>
                <Star /> 去評價
              </Button>
            </>
          )}
        </footer>
      </article>
      {photos.data && (
        <PhotoLightbox photos={photos.data} index={open} onIndex={setOpen} onClose={() => setOpen(null)} caption={`${log.provider_name} 的服務照片`} />
      )}
    </li>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'min-h-11 rounded-full border px-5 text-base font-bold transition-colors',
        active ? 'border-primary bg-primary text-on-primary' : 'border-line-strong bg-surface text-ink-2 hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}
