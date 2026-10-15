import { Accessibility, Banknote, CalendarDays, Check, Clock, CreditCard, MapPin, Quote, Users, Wifi, X } from 'lucide-react'
import { ServiceIcon } from '@/components/common/ServiceIcon'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SERVICE_MAP } from '@/lib/constants'
import { formatDateLong, formatMoney, formatRelativeTime, formatTimeRange } from '@/lib/format'
import { formatDistance } from '@/lib/geo'
import { cn } from '@/lib/utils'
import type { ProviderRequest } from '@/types'

/** Spec 4.3.2 — income, distance, elder's age, service and special notes. */
export function RequestCard({
  request: r,
  distance,
  onAccept,
  onDecline,
  busy,
}: {
  request: ProviderRequest
  distance: number | null
  onAccept: () => void
  onDecline: () => void
  busy: 'accept' | 'decline' | null
}) {
  const wheelchair = r.recipient_mobility === '需輪椅' || r.recipient_mobility === '臥床' || /輪椅/.test(r.notes ?? '')
  return (
    <article
      className={cn(
        'flex h-full flex-col rounded-[28px] border bg-surface p-5 shadow-soft md:p-6',
        r.is_open ? 'border-line' : 'border-primary/35 ring-1 ring-primary/10',
      )}
    >
      <header className="flex items-start gap-3">
        <ServiceIcon type={r.service_type} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {r.is_open ? (
              <Badge tone="info">
                <Users /> 公開媒合
              </Badge>
            ) : (
              <Badge tone="primary">指定給您</Badge>
            )}
            {r.is_online && (
              <Badge tone="info">
                <Wifi /> 線上
              </Badge>
            )}
            <span className="text-sm text-ink-3">{formatRelativeTime(r.created_at)}</span>
          </div>
          <h3 className="mt-1.5 text-xl font-bold">{SERVICE_MAP[r.service_type].label}</h3>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-ink-3">預估收入</p>
          <p className="font-num text-[30px] leading-none font-extrabold text-primary-ink">{formatMoney(r.provider_earning)}</p>
          <p className="mt-1 text-xs font-bold text-ink-3">訂單 {formatMoney(r.total_amount)}</p>
        </div>
      </header>

      <dl className="mt-5 grid gap-2.5 text-[15px] sm:grid-cols-2">
        <Info icon={<CalendarDays />} label="日期" value={formatDateLong(r.service_date)} />
        <Info icon={<Clock />} label="時間" value={`${formatTimeRange(r.start_time, r.end_time)}（${r.hours} 小時）`} />
        <Info icon={<MapPin />} label="地點" value={`${r.area}${distance != null ? `・約 ${formatDistance(distance)}` : ''}`} />
        <Info
          icon={r.payment_method === 'cash' ? <Banknote /> : <CreditCard />}
          label="付款"
          value={r.payment_method === 'cash' ? '現金（服務後收取）' : 'LINE Pay 已付款'}
        />
      </dl>

      <div className="mt-4 rounded-3xl bg-surface-2 p-4">
        <p className="flex flex-wrap items-center gap-2 text-lg font-bold">
          {r.recipient_name}・{r.recipient_age} 歲
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm',
              wheelchair ? 'bg-warning-soft text-warning' : 'bg-surface text-ink-2',
            )}
          >
            {wheelchair && <Accessibility className="size-4" />}
            {r.recipient_mobility}
          </span>
        </p>
        {r.recipient_chronic_diseases.length > 0 && <p className="mt-1 text-[15px] text-ink-2">健康狀況：{r.recipient_chronic_diseases.join('、')}</p>}
        {r.notes && (
          <p className="relative mt-3 border-l-4 border-primary/40 pr-7 pl-3 text-base leading-relaxed text-ink">
            <Quote className="absolute -top-1 right-0 size-5 text-primary/20" aria-hidden />
            {r.notes}
          </p>
        )}
        <p className="mt-3 text-sm text-ink-3">家屬：{r.seeker_name}</p>
      </div>

      <footer className="mt-auto grid grid-cols-[1fr_2fr] gap-3 pt-5">
        <Button variant="secondary" size="lg" onClick={onDecline} loading={busy === 'decline'} disabled={!!busy}>
          <X /> {r.is_open ? '略過' : '婉拒'}
        </Button>
        <Button size="lg" onClick={onAccept} loading={busy === 'accept'} disabled={!!busy}>
          <Check /> 接單
        </Button>
      </footer>
    </article>
  )
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line px-3 py-2.5">
      <dt className="flex items-center gap-1.5 text-xs font-bold text-ink-3 [&_svg]:size-3.5">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 leading-snug font-bold text-ink">{value}</dd>
    </div>
  )
}
