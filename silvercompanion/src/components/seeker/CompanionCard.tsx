import { CalendarCheck, MapPin, PlayCircle, Star, Wifi } from 'lucide-react'
import { Link } from 'react-router'
import { ServiceIcon } from '@/components/common/ServiceIcon'
import { UserAvatar } from '@/components/ui/avatar'
import { nextOpening } from '@/lib/availability'
import { SERVICE_MAP } from '@/lib/constants'
import { formatMonthDay, formatWeekday, relativeDayLabel } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ProviderPublic } from '@/types'

export function CompanionCard({
  provider,
  className,
  highlight,
  preview,
}: {
  provider: ProviderPublic
  className?: string
  highlight?: string | null
  /** Static rendering for "how families see me" (no link, no hover lift). */
  preview?: boolean
}) {
  const next = nextOpening(provider)
  const area = provider.districts.length ? `${provider.city ?? ''}${provider.districts.slice(0, 2).join('・')}` : (provider.city ?? '全台')
  const classes = cn(
    'group relative flex flex-col rounded-[28px] border border-line bg-surface p-5 shadow-soft transition-all duration-300 ease-out md:p-6',
    !preview &&
      'hover:-translate-y-1 hover:border-line-strong hover:shadow-lift focus-visible:ring-4 focus-visible:ring-[var(--ring)] focus-visible:outline-none',
    className,
  )
  const body = (
    <>
      <div className="flex items-start gap-4">
        <UserAvatar name={provider.nickname} src={provider.avatar_url} size="lg" online={provider.service_switch_is_online} verified={provider.is_verified} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate font-serif text-2xl font-black text-ink">{provider.nickname}</h3>
            {provider.offers_online && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-info-soft px-2.5 py-0.5 text-sm font-bold text-info">
                <Wifi className="size-3.5" /> 可線上
              </span>
            )}
          </div>
          <p
            className="mt-1 flex items-center gap-1.5 text-[15px]"
            aria-label={`評分 ${Number(provider.rating_avg).toFixed(2)}，${provider.review_count} 則評價`}
          >
            <Star className="size-[18px] fill-star text-star" aria-hidden />
            <span className="font-bold text-ink tabular">{Number(provider.rating_avg).toFixed(2)}</span>
            <span className="text-ink-3">・{provider.review_count} 則評價</span>
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[15px] text-ink-2">
            <MapPin className="size-4 shrink-0" />
            <span className="truncate">{area}</span>
          </p>
        </div>
      </div>

      {provider.bio && <p className="mt-4 line-clamp-2 text-base leading-relaxed text-ink-2">{provider.bio}</p>}

      <div className="mt-4 flex flex-wrap gap-1.5">
        {provider.tags.slice(0, 3).map((t) => (
          <span key={t} className="rounded-full bg-surface-2 px-3 py-1 text-sm font-bold text-ink-2">
            {t}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-1.5" role="img" aria-label={`提供服務：${provider.service_types.map((s) => SERVICE_MAP[s].label).join('、')}`}>
        {provider.service_types.map((s) => (
          <ServiceIcon
            key={s}
            type={s}
            size="sm"
            className={cn(
              'transition-transform duration-300 group-hover:-translate-y-0.5',
              highlight === s && 'ring-2 ring-primary ring-offset-2 ring-offset-surface',
            )}
          />
        ))}
      </div>

      <div className="mt-5 flex items-end justify-between gap-3 border-t border-line pt-4">
        <div>
          <p className="font-num text-[32px] leading-none font-semibold tracking-tight text-ink">
            ${provider.hourly_rate}
            <span className="ml-1 font-sans text-base font-bold text-ink-3">/ 小時</span>
          </p>
          <p className="mt-1.5 text-sm text-ink-3">已服務 {provider.completed_orders} 次</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 text-right">
          {provider.youtube_video_id && (
            <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2.5 py-0.5 text-sm font-bold text-danger-strong">
              <PlayCircle className="size-4" /> 影片介紹
            </span>
          )}
          {next && (
            <span className="inline-flex items-center gap-1 text-sm font-bold text-success">
              <CalendarCheck className="size-4" />
              {relativeDayLabel(next.date) ?? `${formatMonthDay(next.date)}${formatWeekday(next.date)}`} {String(next.hour).padStart(2, '0')}:00 起可約
            </span>
          )}
        </div>
      </div>
    </>
  )
  if (preview) return <div className={classes}>{body}</div>
  return (
    <Link to={`/seeker/companions/${provider.provider_id}${highlight ? `?service=${highlight}` : ''}`} className={classes}>
      {body}
    </Link>
  )
}
