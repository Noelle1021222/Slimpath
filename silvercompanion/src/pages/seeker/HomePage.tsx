import { ArrowRight, CalendarClock, MessageCircle, Plus, Search, UserRoundPlus } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useMemo } from 'react'
import { Link } from 'react-router'
import { PageContainer, SectionTitle } from '@/components/common/PageHeader'
import { ServiceIcon } from '@/components/common/ServiceIcon'
import { HealthTodayCard } from '@/components/seeker/HealthTodayCard'
import { LatestCareLogCard } from '@/components/seeker/LatestCareLogCard'
import { LiveTripBanner } from '@/components/seeker/LiveTripBanner'
import { ServiceShortcuts } from '@/components/seeker/ServiceShortcuts'
import { UserAvatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useKinship, useMyOrders } from '@/hooks/queries'
import { useAuth } from '@/hooks/useAuth'
import { ORDER_STATUS_META, SERVICE_MAP } from '@/lib/constants'
import { formatMonthDay, formatTimeRange, formatWeekday, greeting, shortName } from '@/lib/format'
import { todayISO } from '@/lib/time'
import { cn } from '@/lib/utils'
import { usePrefsStore } from '@/store/usePrefsStore'
import { useUIStore } from '@/store/useUIStore'
import type { OrderDetails } from '@/types'

export default function HomePage() {
  const { profile } = useAuth()
  const kinship = useKinship()
  const orders = useMyOrders('seeker')
  const recipientId = usePrefsStore((s) => s.recipientId)
  const setRecipientId = usePrefsStore((s) => s.setRecipientId)
  const recipients = useMemo(() => kinship.data ?? [], [kinship.data])
  const recipient = recipients.find((r) => r.id === recipientId) ?? recipients[0] ?? null

  useEffect(() => {
    if (recipients.length && !recipients.some((r) => r.id === recipientId)) setRecipientId(recipients[0].id)
  }, [recipients, recipientId, setRecipientId])

  const today = todayISO()
  const all = orders.data ?? []
  const live = all.filter((o) => o.order_status === 'navigating' || o.order_status === 'in_progress')
  const upcoming = all
    .filter((o) => ['pending', 'accepted'].includes(o.order_status) && o.service_date >= today)
    .sort((a, b) => a.service_date.localeCompare(b.service_date) || a.start_time.localeCompare(b.start_time))

  return (
    <PageContainer>
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8 md:mb-10">
        <p className="text-base font-bold text-ink-3">
          {formatMonthDay(today)} {formatWeekday(today)}
        </p>
        <h1 className="mt-1 text-[36px] leading-tight md:text-[52px]">
          {greeting()}，{profile ? shortName(profile.full_name, profile.nickname) : ''}
        </h1>
        {recipients.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-lg text-ink-2">今天一起照顧</span>
            {recipients.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={recipient?.id === r.id}
                onClick={() => setRecipientId(r.id)}
                className={cn(
                  'inline-flex min-h-11 items-center gap-2 rounded-full border py-1 pr-4 pl-1 text-base font-bold transition-all',
                  recipient?.id === r.id ? 'border-primary bg-primary-soft text-primary-ink' : 'border-line-strong bg-surface text-ink-2 hover:text-ink',
                )}
              >
                <UserAvatar name={r.nickname ?? r.name} size="xs" />
                {r.nickname ?? r.name}
              </button>
            ))}
          </div>
        ) : (
          !kinship.isLoading && <p className="mt-3 text-lg text-ink-2">先建立長輩的照顧檔案，就能開始預約陪伴。</p>
        )}
      </motion.section>

      <div className="space-y-4">
        {live.map((o) => (o.order_status === 'navigating' ? <LiveTripBanner key={o.id} order={o} /> : <InProgressCard key={o.id} order={o} />))}
      </div>

      {recipients.length === 0 && !kinship.isLoading && (
        <Link
          to="/seeker/profile/family"
          className="group mt-2 flex items-center gap-5 rounded-[28px] border-2 border-dashed border-primary/40 bg-primary-soft/50 p-6 transition-colors hover:border-primary"
        >
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-primary text-on-primary">
            <UserRoundPlus className="size-8" />
          </span>
          <span className="flex-1">
            <span className="block text-xl font-black text-ink">建立第一位長輩的檔案</span>
            <span className="mt-1 block text-base text-ink-2">行動能力、慢性病與照顧叮嚀，預約時會自動帶給陪伴者。</span>
          </span>
          <ArrowRight className="size-6 text-primary transition-transform group-hover:translate-x-1" />
        </Link>
      )}

      <section className="mt-8" aria-labelledby="upcoming-title">
        <SectionTitle
          id="upcoming-title"
          action={
            <Link
              to="/seeker/orders"
              className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-base font-bold text-primary-ink hover:bg-primary-soft"
            >
              全部訂單 <ArrowRight className="size-4" />
            </Link>
          }
        >
          接下來的行程
        </SectionTitle>
        {orders.isLoading ? (
          <Skeleton className="h-32 rounded-[28px]" />
        ) : upcoming.length ? (
          <div className={cn('grid gap-4', upcoming.length > 1 && 'md:grid-cols-2')}>
            {upcoming.slice(0, 2).map((o) => (
              <UpcomingCard key={o.id} order={o} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-start gap-4 rounded-[28px] border border-line bg-surface p-6 shadow-soft sm:flex-row sm:items-center">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-ink">
              <CalendarClock className="size-7" />
            </span>
            <p className="flex-1 text-lg text-ink-2">目前沒有預約。想找人陪{recipient ? (recipient.nickname ?? recipient.name) : '長輩'}聊聊天、出門走走嗎？</p>
            <Button asChild size="lg">
              <Link to="/seeker/search">
                <Search /> 找陪伴
              </Link>
            </Button>
          </div>
        )}
      </section>

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        <HealthTodayCard recipient={recipient} className="lg:col-span-2" />
        <LatestCareLogCard />
      </div>

      <section className="mt-12" aria-labelledby="services-title">
        <SectionTitle
          id="services-title"
          action={
            <Link
              to="/seeker/search"
              className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-base font-bold text-primary-ink hover:bg-primary-soft"
            >
              全部陪伴者 <ArrowRight className="size-4" />
            </Link>
          }
        >
          需要什麼樣的陪伴？
        </SectionTitle>
        <ServiceShortcuts />
      </section>

      <Link
        to="/seeker/profile/family"
        className="mt-12 flex items-center justify-between gap-4 rounded-[28px] bg-hero p-6 text-hero-ink transition-transform hover:-translate-y-0.5 md:p-8"
      >
        <span>
          <span className="block font-serif text-2xl font-black md:text-3xl">家庭照顧中心</span>
          <span className="mt-1 block text-base text-hero-ink/75">管理長輩的行動能力、慢性病與預設地址，預約時自動帶入。</span>
        </span>
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white/15">
          <Plus className="size-6" />
        </span>
      </Link>
    </PageContainer>
  )
}

function UpcomingCard({ order }: { order: OrderDetails }) {
  const openChat = useUIStore((s) => s.openChat)
  const status = ORDER_STATUS_META[order.order_status]
  const s = SERVICE_MAP[order.service_type]
  return (
    <article className="relative flex gap-4 rounded-[28px] border border-line bg-surface p-5 shadow-soft">
      <div className="flex w-14 shrink-0 flex-col items-center justify-center self-start rounded-2xl bg-surface-2 py-2 text-center sm:w-16">
        <span className="text-sm font-bold text-ink-3">{formatWeekday(order.service_date)}</span>
        <span className="font-num text-3xl leading-none font-bold text-ink">{Number(order.service_date.slice(8, 10))}</span>
        <span className="text-sm font-bold text-ink-3">{Number(order.service_date.slice(5, 7))}月</span>
      </div>
      <div className="min-w-0 flex-1 pr-12">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={status.tone}>{status.label}</Badge>
          <span className="text-[15px] font-bold text-ink-2 tabular">{formatTimeRange(order.start_time, order.end_time)}</span>
        </div>
        <p className="mt-2 text-lg leading-snug font-bold">
          {s.label}
          <span className="text-ink-3">・</span>
          {order.recipient_nickname ?? order.recipient_name}
        </p>
        <p className="mt-1 text-[15px] leading-snug text-ink-2">{order.provider_name ? `陪伴者 ${order.provider_name}` : '公開媒合中，等待陪伴者接單'}</p>
      </div>
      <ServiceIcon type={order.service_type} size="sm" className="absolute top-5 right-5 hidden sm:grid" />
      {order.provider_id && order.provider_name && (
        <Button
          variant="secondary"
          size="iconSm"
          className="absolute right-4 bottom-4"
          aria-label={`傳訊息給 ${order.provider_name}`}
          onClick={() => openChat({ partnerId: order.provider_id!, name: order.provider_name!, avatar: order.provider_avatar_url })}
        >
          <MessageCircle />
        </Button>
      )}
    </article>
  )
}

function InProgressCard({ order }: { order: OrderDetails }) {
  return (
    <div className="flex items-center gap-4 rounded-[28px] border border-success/25 bg-success-soft p-5">
      <span className="relative grid size-14 shrink-0 place-items-center rounded-full bg-success text-white">
        <span className="absolute inset-0 animate-sos-ring rounded-full bg-success" aria-hidden />
        <ServiceIcon type={order.service_type} size="sm" className="relative bg-transparent text-white" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xl font-black text-success">服務進行中</p>
        <p className="text-base text-ink-2">
          {order.provider_name} 正在陪伴 {order.recipient_nickname ?? order.recipient_name}・{formatTimeRange(order.start_time, order.end_time)}
        </p>
      </div>
    </div>
  )
}
