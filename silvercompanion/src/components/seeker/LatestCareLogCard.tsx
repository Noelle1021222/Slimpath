import { ArrowRight, NotebookPen } from 'lucide-react'
import { Link } from 'react-router'
import { MoodFace } from '@/components/common/MoodFace'
import { ServiceLabel } from '@/components/common/ServiceIcon'
import { UserAvatar } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useCareLogs, usePhotoUrls } from '@/hooks/queries'
import { MOOD_MAP } from '@/lib/constants'
import { formatDateLong } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Spec 4.2.1 — summary of the most recent finished visit. */
export function LatestCareLogCard({ className }: { className?: string }) {
  const { data, isLoading } = useCareLogs()
  const log = data?.[0]
  const photos = usePhotoUrls(log?.photos.slice(0, 3) ?? [])

  if (isLoading) return <Skeleton className={cn('h-80 rounded-[28px]', className)} />
  if (!log)
    return <EmptyState className={className} illustration="book" title="還沒有聯絡簿" description="每次服務結束，陪伴者會寫下長輩的心情、照片與叮嚀。" />
  const mood = MOOD_MAP[log.mood]
  return (
    <section className={cn('flex flex-col rounded-[28px] border border-line bg-surface p-5 shadow-soft md:p-7', className)} aria-labelledby="latest-log">
      <div className="flex items-center justify-between gap-3">
        <h2 id="latest-log" className="flex items-center gap-2 text-2xl">
          <NotebookPen className="size-6 text-primary" /> 最新聯絡簿
        </h2>
        <span className="text-[15px] text-ink-3">{formatDateLong(log.service_date)}</span>
      </div>
      <div className="mt-5 flex items-center gap-4 rounded-3xl p-4" style={{ background: mood.soft }}>
        <MoodFace mood={log.mood} className="size-16" />
        <div>
          <p className="text-sm font-bold" style={{ color: mood.color }}>
            {log.recipient_nickname ?? log.recipient_name} 今天的心情
          </p>
          <p className="text-2xl font-black" style={{ color: mood.color }}>
            {mood.label}
          </p>
          <p className="text-[15px]" style={{ color: mood.color }}>
            {mood.caption}
          </p>
        </div>
      </div>
      <p className="mt-5 line-clamp-4 flex-1 text-[17px] leading-relaxed text-ink-2">{log.message}</p>
      {log.photos.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {(photos.data ?? log.photos.slice(0, 3).map(() => '')).map((src, i) =>
            src ? (
              <img key={i} src={src} alt="服務照片" className="aspect-square w-full rounded-2xl object-cover" loading="lazy" />
            ) : (
              <Skeleton key={i} className="aspect-square" />
            ),
          )}
        </div>
      )}
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
        <span className="flex min-w-0 items-center gap-2.5">
          <UserAvatar name={log.provider_name} src={log.provider_avatar_url} size="sm" />
          <span className="min-w-0">
            <span className="block truncate text-base font-bold">{log.provider_name}</span>
            <ServiceLabel type={log.service_type} className="mt-0.5 px-2 py-0 text-xs" />
          </span>
        </span>
        <Link
          to="/seeker/care-logs"
          className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full px-3 text-base font-bold text-primary-ink hover:bg-primary-soft"
        >
          全部 <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  )
}
