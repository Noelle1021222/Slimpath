import { CalendarRange, NotebookPen, Star } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { MoodFace } from '@/components/common/MoodFace'
import { PageContainer, PageHeader } from '@/components/common/PageHeader'
import { ServiceIcon } from '@/components/common/ServiceIcon'
import { AvailabilityEditorModal } from '@/components/provider/AvailabilityEditorModal'
import { CareLogFormModal } from '@/components/provider/CareLogFormModal'
import { TripCard } from '@/components/provider/TripCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsBar, TabsContent } from '@/components/ui/tabs'
import { useMyOrders, useMyProvider } from '@/hooks/queries'
import { SERVICE_MAP } from '@/lib/constants'
import { formatDateLong, formatMoney, formatMonthDay, formatTimeRange, relativeDayLabel } from '@/lib/format'
import { nextDays, todayISO, WEEKDAY_LABELS, weekday } from '@/lib/time'
import { cn } from '@/lib/utils'
import type { OrderDetails } from '@/types'

type Tab = 'upcoming' | 'done' | 'cancelled'

const ACTIVE = ['accepted', 'navigating', 'in_progress']

const byTime = (a: OrderDetails, b: OrderDetails) => a.service_date.localeCompare(b.service_date) || a.start_time.localeCompare(b.start_time)

/** Spec 4.3.3 — every accepted trip on a day-by-day timeline, plus history. */
export default function ProviderSchedulePage() {
  const orders = useMyOrders('provider')
  const details = useMyProvider()
  const [tab, setTab] = useState<Tab>('upcoming')
  const [careLogFor, setCareLogFor] = useState<OrderDetails | null>(null)
  const [editingSlots, setEditingSlots] = useState(false)
  const today = todayISO()

  const groups = useMemo(() => {
    const all = orders.data ?? []
    const upcoming = all.filter((o) => ACTIVE.includes(o.order_status)).sort(byTime)
    const days = new Map<string, OrderDetails[]>()
    for (const o of upcoming) days.set(o.service_date, [...(days.get(o.service_date) ?? []), o])
    return {
      upcoming,
      days: [...days.entries()],
      done: all.filter((o) => o.order_status === 'completed').sort((a, b) => byTime(b, a)),
      cancelled: all.filter((o) => o.order_status === 'cancelled').sort((a, b) => byTime(b, a)),
    }
  }, [orders.data])

  const strip = nextDays(14, today)
  const perDay = new Map(groups.days.map(([date, list]) => [date, list.length]))
  const slots = details.data?.availability_slots ?? {}
  const jump = (date: string) => document.getElementById(`day-${date}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Schedule"
        title="我的行程"
        description="接下的預約依日期排列。出發時按下「開始導航」，家屬就能即時看到您的位置。"
        actions={
          <Button variant="secondary" size="lg" onClick={() => setEditingSlots(true)} disabled={!details.data}>
            <CalendarRange /> 設定空檔
          </Button>
        }
      />

      <section aria-label="未來兩週" className="-mx-4 scrollbar-none overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
        <ol className="flex min-w-max gap-2 md:grid md:min-w-0 md:grid-cols-14">
          {strip.map((date) => {
            const count = perDay.get(date) ?? 0
            const open = (slots[date]?.length ?? 0) > 0
            const isToday = date === today
            return (
              <li key={date}>
                <button
                  type="button"
                  onClick={() => {
                    if (!count) return
                    setTab('upcoming')
                    requestAnimationFrame(() => jump(date))
                  }}
                  aria-disabled={!count}
                  className={cn(
                    'flex h-[84px] w-[60px] flex-col items-center justify-center gap-1 rounded-2xl border transition-colors md:w-full',
                    isToday ? 'border-primary bg-primary text-on-primary' : 'border-line bg-surface',
                    count ? 'cursor-pointer hover:border-primary' : 'cursor-default',
                  )}
                >
                  <span className="sr-only">{formatMonthDay(date)}・</span>
                  <span className={cn('text-xs font-bold', isToday ? 'text-on-primary' : 'text-ink-3')}>
                    {isToday ? '今天' : `週${WEEKDAY_LABELS[weekday(date)]}`}
                  </span>
                  <span className="font-num text-xl leading-none font-extrabold">{Number(date.slice(8))}</span>
                  <span className="sr-only">，{count ? `${count} 個行程` : open ? '有開放空檔' : '沒有安排'}</span>
                  <span className="flex h-2 items-center gap-0.5" aria-hidden>
                    {count > 0 ? (
                      Array.from({ length: Math.min(count, 3) }, (_, i) => (
                        <span key={i} className={cn('size-1.5 rounded-full', isToday ? 'bg-on-primary' : 'bg-primary')} />
                      ))
                    ) : open ? (
                      <span className={cn('h-0.5 w-3 rounded-full', isToday ? 'bg-on-primary/60' : 'bg-success')} />
                    ) : null}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-primary" /> 有行程
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-3 rounded-full bg-success" /> 開放預約的空檔
          </span>
        </p>
      </section>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="mt-6">
        <TabsBar
          value={tab}
          className="max-w-xl"
          items={[
            { value: 'upcoming', label: '即將到來', count: groups.upcoming.length },
            { value: 'done', label: '已完成' },
            { value: 'cancelled', label: '已取消' },
          ]}
        />

        <TabsContent value="upcoming" className="mt-6 focus-visible:outline-none">
          {orders.isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-64 rounded-[28px]" />
            </div>
          ) : groups.days.length ? (
            <div className="space-y-10">
              {groups.days.map(([date, list]) => (
                <section key={date} id={`day-${date}`} aria-labelledby={`day-title-${date}`} className="scroll-mt-28">
                  <header className="mb-4 flex items-baseline justify-between gap-3 border-b border-line pb-3">
                    <h2 id={`day-title-${date}`} className="text-2xl">
                      {relativeDayLabel(date, today) ? (
                        <>
                          <span className="text-primary-ink">{relativeDayLabel(date, today)}</span>
                          <span className="ml-2 font-sans text-lg font-bold text-ink-2">
                            {formatMonthDay(date)}（{WEEKDAY_LABELS[weekday(date)]}）
                          </span>
                        </>
                      ) : (
                        formatDateLong(date, today)
                      )}
                    </h2>
                    <p className="shrink-0 text-[15px] font-bold text-ink-3">
                      {list.length} 個行程・<span className="font-num text-ink">{formatMoney(list.reduce((n, o) => n + o.provider_earning, 0))}</span>
                    </p>
                  </header>
                  <ol className="relative space-y-4 md:pl-10">
                    <span className="absolute top-3 bottom-3 left-[15px] hidden w-0.5 rounded-full bg-line md:block" aria-hidden />
                    {list.map((o, i) => (
                      <motion.li
                        key={o.id}
                        className="relative"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i, 6) * 0.05 }}
                      >
                        <span
                          className={cn(
                            'absolute top-8 -left-[34px] hidden size-3.5 rounded-full ring-4 ring-bg md:block',
                            o.order_status === 'navigating' ? 'bg-info' : o.order_status === 'in_progress' ? 'bg-success' : 'bg-primary',
                          )}
                          aria-hidden
                        />
                        <TripCard order={o} onCareLog={() => setCareLogFor(o)} />
                      </motion.li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          ) : (
            <EmptyState
              illustration="calendar"
              title="目前沒有排定的行程"
              description="打開上線接案、設定好空檔時段，家屬就能直接預約您。"
              action={
                <div className="flex flex-wrap justify-center gap-3">
                  <Button size="lg" onClick={() => setEditingSlots(true)} disabled={!details.data}>
                    <CalendarRange /> 設定空檔
                  </Button>
                  <Button asChild size="lg" variant="secondary">
                    <Link to="/provider/requests">看看接案大廳</Link>
                  </Button>
                </div>
              }
            />
          )}
        </TabsContent>

        <TabsContent value="done" className="mt-6 focus-visible:outline-none">
          <HistoryList orders={groups.done} loading={orders.isLoading} kind="done" />
        </TabsContent>
        <TabsContent value="cancelled" className="mt-6 focus-visible:outline-none">
          <HistoryList orders={groups.cancelled} loading={orders.isLoading} kind="cancelled" />
        </TabsContent>
      </Tabs>

      <CareLogFormModal order={careLogFor} onOpenChange={(v) => !v && setCareLogFor(null)} />
      {details.data && <AvailabilityEditorModal open={editingSlots} onOpenChange={setEditingSlots} details={details.data} />}
    </PageContainer>
  )
}

function HistoryList({ orders, loading, kind }: { orders: OrderDetails[]; loading: boolean; kind: 'done' | 'cancelled' }) {
  if (loading) return <Skeleton className="h-40 rounded-[28px]" />
  if (!orders.length)
    return (
      <EmptyState
        illustration={kind === 'done' ? 'book' : 'leaf'}
        title={kind === 'done' ? '還沒有完成的服務' : '沒有取消的行程'}
        description={kind === 'done' ? '完成服務並填寫聯絡簿後，紀錄與家屬的評價會出現在這裡。' : undefined}
      />
    )

  const total = orders.reduce((n, o) => n + o.provider_earning, 0)
  return (
    <>
      {kind === 'done' && (
        <p className="mb-4 text-[15px] text-ink-2">
          共 {orders.length} 次服務・累積收入 <span className="font-num font-extrabold text-ink">{formatMoney(total)}</span>
        </p>
      )}
      <ul className="divide-y divide-line overflow-hidden rounded-[28px] border border-line bg-surface shadow-soft">
        {orders.map((o) => (
          <li key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4 md:flex-nowrap md:p-5">
            <ServiceIcon type={o.service_type} />
            <div className="min-w-0 flex-1 basis-48">
              <p className="text-lg font-bold">
                {SERVICE_MAP[o.service_type].label}・{o.recipient_nickname ?? o.recipient_name}
              </p>
              <p className="text-[15px] text-ink-3">
                {formatDateLong(o.service_date)} {formatTimeRange(o.start_time, o.end_time)}・家屬 {o.seeker_name}
              </p>
              {kind === 'cancelled' && o.cancel_reason && <p className="mt-1 text-sm text-ink-2">原因：{o.cancel_reason}</p>}
            </div>
            <div className="ml-auto flex items-center gap-3">
              {kind === 'done' && o.care_log_mood && (
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-2" title="聯絡簿已送出">
                  <MoodFace mood={o.care_log_mood} className="size-7" />
                  <NotebookPen className="size-4 text-ink-3" aria-label="聯絡簿已送出" />
                </span>
              )}
              {kind === 'done' &&
                (o.seeker_rating ? (
                  <Badge tone="warning">
                    <Star className="fill-current" /> {o.seeker_rating}.0
                  </Badge>
                ) : (
                  <Badge tone="outline">待家屬評價</Badge>
                ))}
              {kind === 'cancelled' && o.payment_status === 'refunded' && <Badge tone="neutral">已退款</Badge>}
              <span className={cn('min-w-20 text-right font-num text-xl font-extrabold', kind === 'cancelled' && 'text-ink-3 line-through')}>
                {formatMoney(o.provider_earning)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
