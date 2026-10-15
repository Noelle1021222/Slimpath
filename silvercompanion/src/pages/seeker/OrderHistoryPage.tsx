import { CalendarX2, CreditCard, MapPin, MessageCircle, Navigation, NotebookPen, Phone, RotateCcw, Star, Wifi } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { PageContainer, PageHeader } from '@/components/common/PageHeader'
import { ServiceIcon } from '@/components/common/ServiceIcon'
import { RatingModal, type RatingTarget } from '@/components/seeker/RatingModal'
import { UserAvatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useConfirmWithReason } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCard } from '@/components/ui/skeleton'
import { StarRating } from '@/components/ui/star-rating'
import { Tabs, TabsBar, TabsContent } from '@/components/ui/tabs'
import { useInvalidate, useMyOrders, useOrderContact } from '@/hooks/queries'
import { ORDER_STATUS_META, PAYMENT_METHOD_META, SERVICE_MAP } from '@/lib/constants'
import { errorMessage } from '@/lib/errors'
import { formatDateLong, formatMoney, formatTimeRange, orderCode } from '@/lib/format'
import { cn } from '@/lib/utils'
import { orderService, startLinePayCheckout } from '@/services'
import { useUIStore } from '@/store/useUIStore'
import type { OrderDetails } from '@/types'

type Tab = 'active' | 'done' | 'cancelled'

export default function OrderHistoryPage() {
  const { data = [], isLoading } = useMyOrders('seeker')
  const [tab, setTab] = useState<Tab>('active')
  const [rating, setRating] = useState<RatingTarget | null>(null)
  const groups: Record<Tab, OrderDetails[]> = {
    active: data
      .filter((o) => ['pending', 'accepted', 'navigating', 'in_progress'].includes(o.order_status))
      .sort((a, b) => a.service_date.localeCompare(b.service_date) || a.start_time.localeCompare(b.start_time)),
    done: data.filter((o) => o.order_status === 'completed'),
    cancelled: data.filter((o) => o.order_status === 'cancelled'),
  }
  const toRate = groups.done.filter((o) => o.care_log_id && o.seeker_rating == null).length

  return (
    <PageContainer>
      <PageHeader eyebrow="My bookings" title="我的訂單" description="預約狀態、付款與評價都在這裡。陪伴者接單、出發與抵達時，您都會收到通知。" />
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsBar
          value={tab}
          className="max-w-xl"
          items={[
            { value: 'active', label: '進行中', count: groups.active.length },
            { value: 'done', label: '已完成', count: toRate },
            { value: 'cancelled', label: '已取消' },
          ]}
        />
        {(Object.keys(groups) as Tab[]).map((key) => (
          <TabsContent key={key} value={key} className="mt-6 focus-visible:outline-none">
            {isLoading ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : groups[key].length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {groups[key].map((o, i) => (
                  <motion.div key={o.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 6) * 0.04 }}>
                    <OrderCard order={o} onRate={() => setRating({ orderId: o.id, providerName: o.provider_name ?? '陪伴者' })} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <EmptyState
                illustration="calendar"
                title={key === 'active' ? '目前沒有進行中的預約' : key === 'done' ? '還沒有完成的服務' : '沒有取消的訂單'}
                description={key === 'active' ? '找一位陪伴者，陪長輩聊聊天、出門走走吧。' : undefined}
                action={
                  key === 'active' ? (
                    <Button asChild size="lg">
                      <Link to="/seeker/search">找陪伴</Link>
                    </Button>
                  ) : undefined
                }
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
      <RatingModal target={rating} onOpenChange={(v) => !v && setRating(null)} />
    </PageContainer>
  )
}

function OrderCard({ order, onRate }: { order: OrderDetails; onRate: () => void }) {
  const navigate = useNavigate()
  const openChat = useUIStore((s) => s.openChat)
  const openTracking = useUIStore((s) => s.openTracking)
  const invalidate = useInvalidate()
  const confirm = useConfirmWithReason()
  const [busy, setBusy] = useState<string | null>(null)
  const live = ['accepted', 'navigating', 'in_progress'].includes(order.order_status)
  const contact = useOrderContact(live ? order.id : null)
  const status = ORDER_STATUS_META[order.order_status]
  const awaitingPayment = order.payment_method === 'linepay' && order.payment_status === 'unpaid' && order.order_status === 'pending'
  const cancellable = ['pending', 'accepted'].includes(order.order_status)

  const cancel = async () => {
    const refund = order.payment_method === 'linepay' && order.payment_status === 'paid'
    const { confirmed, reason } = await confirm({
      title: '確定取消這次預約？',
      description: refund ? `款項 ${formatMoney(order.total_amount)} 會原路退回您的 LINE Pay。` : '取消後時段會釋出給其他家庭。',
      confirmText: '取消預約',
      cancelText: '保留預約',
      tone: 'danger',
      reasonOptions: ['行程有變', '長輩身體不適', '找到其他人陪伴', '預約錯時間'],
    })
    if (!confirmed) return
    setBusy('cancel')
    try {
      await orderService.cancel(order, reason)
      await invalidate(['orders'], ['booked'])
      toast.success(refund ? '已取消，款項將退回 LINE Pay' : '已取消預約')
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <article
      className={cn(
        'flex h-full flex-col rounded-[28px] border bg-surface p-5 shadow-soft md:p-6',
        order.order_status === 'navigating' ? 'border-info/40' : 'border-line',
      )}
    >
      <header className="flex items-start gap-3">
        <ServiceIcon type={order.service_type} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={status.tone}>{status.label}</Badge>
            {awaitingPayment && <Badge tone="danger">待付款</Badge>}
            {order.payment_status === 'refunded' && <Badge tone="info">已退款</Badge>}
            {order.is_online && (
              <Badge tone="info">
                <Wifi /> 線上
              </Badge>
            )}
          </div>
          <h3 className="mt-1.5 text-xl font-bold">
            {SERVICE_MAP[order.service_type].label}・{order.recipient_nickname ?? order.recipient_name}
          </h3>
          <p className="text-[15px] text-ink-2">
            {formatDateLong(order.service_date)}・{formatTimeRange(order.start_time, order.end_time)}
          </p>
        </div>
        <span className="shrink-0 text-sm font-bold text-ink-3 tabular">{orderCode(order.id)}</span>
      </header>

      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
        {order.provider_name ? (
          <>
            <UserAvatar name={order.provider_name} src={order.provider_avatar_url} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold">{order.provider_name}</span>
              <span className="flex items-center gap-1 truncate text-sm text-ink-3">
                <MapPin className="size-3.5 shrink-0" /> {order.location_address}
              </span>
            </span>
            <Link
              to={`/seeker/companions/${order.provider_id}`}
              className="shrink-0 rounded-full px-3 py-2 text-sm font-bold text-primary-ink hover:bg-primary-soft"
            >
              介紹
            </Link>
          </>
        ) : (
          <p className="px-1 text-base text-ink-2">公開媒合中，附近的陪伴者接單後會通知您。</p>
        )}
      </div>

      {order.order_status === 'cancelled' && order.cancel_reason && <p className="mt-3 text-[15px] text-ink-2">取消原因：{order.cancel_reason}</p>}
      {order.order_status === 'completed' && order.seeker_rating != null && (
        <p className="mt-3 flex items-center gap-2 text-[15px] text-ink-2">
          您的評價 <StarRating value={order.seeker_rating} size="sm" />
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
        <p>
          <span className="font-num text-2xl font-semibold">{formatMoney(order.total_amount)}</span>
          <span className="ml-2 text-sm text-ink-3">
            {PAYMENT_METHOD_META[order.payment_method].label}
            {order.payment_status === 'paid' ? '・已付款' : ''}
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          {awaitingPayment && (
            <Button
              variant="line"
              loading={busy === 'pay'}
              onClick={async () => {
                setBusy('pay')
                try {
                  await startLinePayCheckout(order.id)
                } catch (e) {
                  toast.error(errorMessage(e))
                  setBusy(null)
                }
              }}
            >
              <CreditCard /> 完成付款
            </Button>
          )}
          {order.order_status === 'navigating' && (
            <Button onClick={() => openTracking({ orderId: order.id, mode: 'receiver' })}>
              <Navigation /> 即時位置
            </Button>
          )}
          {live && contact.data && (
            <Button asChild variant="secondary" size="icon" aria-label={`打電話給 ${order.provider_name}`}>
              <a href={`tel:${contact.data.phone}`}>
                <Phone />
              </a>
            </Button>
          )}
          {order.provider_id && order.order_status !== 'cancelled' && (
            <Button
              variant="secondary"
              size="icon"
              aria-label={`傳訊息給 ${order.provider_name}`}
              onClick={() => openChat({ partnerId: order.provider_id!, name: order.provider_name ?? '', avatar: order.provider_avatar_url })}
            >
              <MessageCircle />
            </Button>
          )}
          {cancellable && (
            <Button variant="ghost" loading={busy === 'cancel'} onClick={cancel}>
              <CalendarX2 /> 取消
            </Button>
          )}
          {order.order_status === 'completed' && order.care_log_id && (
            <Button variant="secondary" onClick={() => navigate('/seeker/care-logs', { state: { focus: order.care_log_id } })}>
              <NotebookPen /> 聯絡簿
            </Button>
          )}
          {order.order_status === 'completed' && order.care_log_id && order.seeker_rating == null && (
            <Button onClick={onRate}>
              <Star /> 去評價
            </Button>
          )}
          {order.order_status === 'cancelled' && order.provider_id && (
            <Button asChild variant="secondary">
              <Link to={`/seeker/companions/${order.provider_id}`}>
                <RotateCcw /> 再次預約
              </Link>
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}
