import { useQueryClient } from '@tanstack/react-query'
import { Accessibility, CalendarX2, MapPin, MapPinCheck, MessageCircle, Navigation, NotebookPen, Phone, PlayCircle, Quote, Wifi } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ServiceIcon } from '@/components/common/ServiceIcon'
import { UserAvatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useConfirmWithReason } from '@/components/ui/confirm-dialog'
import { useOrderContact } from '@/hooks/queries'
import { ORDER_STATUS_META, SERVICE_MAP } from '@/lib/constants'
import { errorMessage } from '@/lib/errors'
import { formatMoney, shortTime } from '@/lib/format'
import { googleMapsPinUrl } from '@/lib/geo'
import { taipeiTimestamp } from '@/lib/time'
import { cn, haptic } from '@/lib/utils'
import { isDemo, orderService } from '@/services'
import { useTrackingStore } from '@/store/useTrackingStore'
import { useUIStore } from '@/store/useUIStore'
import type { OrderDetails } from '@/types'

const NAV_WINDOW_MS = 6 * 3600_000

/** Spec 4.3.3 — one trip on the timeline with every action it needs. */
export function TripCard({ order, onCareLog }: { order: OrderDetails; onCareLog: () => void }) {
  const client = useQueryClient()
  const openChat = useUIStore((s) => s.openChat)
  const openTracking = useUIStore((s) => s.openTracking)
  const startTracking = useTrackingStore((s) => s.start)
  const trackingOrder = useTrackingStore((s) => s.orderId)
  const confirm = useConfirmWithReason()
  const contact = useOrderContact(order.id)
  const [busy, setBusy] = useState<string | null>(null)
  const status = ORDER_STATUS_META[order.order_status]
  const startsAt = taipeiTimestamp(order.service_date, order.start_time)
  const canNavigate = Date.now() >= startsAt - NAV_WINDOW_MS
  const wheelchair = order.recipient_mobility === '需輪椅' || order.recipient_mobility === '臥床'
  const refresh = () => client.invalidateQueries({ queryKey: ['orders'] })

  const run = async (key: string, fn: () => Promise<unknown>, success?: string) => {
    setBusy(key)
    try {
      await fn()
      await refresh()
      if (success) toast.success(success)
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  const startNavigation = () =>
    run(
      'nav',
      async () => {
        await orderService.startNavigation(order.id)
        haptic([15, 30, 15])
        // Demo: follow a simulated route; production: this device's GPS.
        startTracking(order.id, isDemo)
        openTracking({ orderId: order.id, mode: 'sender' })
      },
      '已通知家屬您出發了，正在分享即時位置',
    )

  const resumeNavigation = () => {
    if (trackingOrder !== order.id) startTracking(order.id, isDemo)
    openTracking({ orderId: order.id, mode: 'sender' })
  }

  const cancel = async () => {
    const { confirmed, reason } = await confirm({
      title: '確定要取消這個行程？',
      description:
        order.payment_method === 'linepay' && order.payment_status === 'paid'
          ? '家屬的款項會原路退回 LINE Pay。臨時取消會影響您的評價，請先和家屬聯絡。'
          : '臨時取消會影響您的評價，請先和家屬聯絡。',
      confirmText: '取消行程',
      cancelText: '保留',
      tone: 'danger',
      reasonOptions: ['身體不適', '交通延誤', '時間衝突', '家屬要求改期'],
    })
    if (confirmed) void run('cancel', () => orderService.cancel(order, reason || '陪伴者取消'), '已取消行程並通知家屬')
  }

  return (
    <article
      className={cn(
        'rounded-[28px] border bg-surface p-5 shadow-soft md:p-6',
        order.order_status === 'navigating' && 'border-info/40 ring-4 ring-info/10',
        order.order_status === 'in_progress' && 'border-success/40 ring-4 ring-success/10',
        order.order_status !== 'navigating' && order.order_status !== 'in_progress' && 'border-line',
      )}
    >
      <div className="flex flex-wrap items-start gap-4">
        <div className="w-20 shrink-0">
          <p className="font-num text-[28px] leading-none font-extrabold tabular">{shortTime(order.start_time)}</p>
          <p className="mt-1 text-sm font-bold text-ink-3">至 {shortTime(order.end_time)}</p>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={status.tone}>{status.label}</Badge>
            {order.is_online && (
              <Badge tone="info">
                <Wifi /> 線上
              </Badge>
            )}
            <span className="text-sm font-bold text-ink-3">
              {order.payment_method === 'cash' ? `現場收現 ${formatMoney(order.total_amount)}` : `已付款・收入 ${formatMoney(order.provider_earning)}`}
            </span>
          </div>
          <h3 className="mt-2 flex items-center gap-2 text-xl font-bold">
            <ServiceIcon type={order.service_type} size="sm" />
            {SERVICE_MAP[order.service_type].label}
          </h3>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <div className="rounded-3xl bg-surface-2 p-4">
          <p className="flex flex-wrap items-center gap-2 text-lg font-bold">
            {order.recipient_nickname ?? order.recipient_name}・{order.recipient_age} 歲
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm',
                wheelchair ? 'bg-warning-soft text-warning' : 'bg-surface text-ink-2',
              )}
            >
              {wheelchair && <Accessibility className="size-4" />}
              {order.recipient_mobility}
            </span>
          </p>
          {order.recipient_chronic_diseases.length > 0 && (
            <p className="mt-1 text-[15px] text-ink-2">健康狀況：{order.recipient_chronic_diseases.join('、')}</p>
          )}
          {(order.notes || order.recipient_notes) && (
            <p className="mt-3 flex gap-2 text-base leading-relaxed">
              <Quote className="mt-1 size-4 shrink-0 text-primary/50" />
              {order.notes ?? order.recipient_notes}
            </p>
          )}
          {!order.is_online && (
            <a
              href={
                order.location_lat != null
                  ? googleMapsPinUrl({ lat: order.location_lat, lng: order.location_lng! })
                  : `https://maps.google.com/?q=${encodeURIComponent(order.location_address)}`
              }
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex items-start gap-1.5 text-[15px] font-bold text-primary-ink underline-offset-4 hover:underline"
            >
              <MapPin className="mt-0.5 size-4 shrink-0" /> {order.location_address}
            </a>
          )}
        </div>
        <div className="flex items-center gap-3 rounded-3xl border border-line p-3 md:w-56 md:flex-col md:items-start">
          <UserAvatar name={order.seeker_name} src={order.seeker_avatar_url} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-ink-3">案主（家屬）</p>
            <p className="truncate text-base font-bold">{order.seeker_name}</p>
          </div>
          <div className="flex gap-2">
            {contact.data && (
              <Button asChild variant="secondary" size="iconSm" aria-label={`撥打電話給 ${order.seeker_name}`}>
                <a href={`tel:${contact.data.phone}`}>
                  <Phone />
                </a>
              </Button>
            )}
            <Button
              variant="secondary"
              size="iconSm"
              aria-label={`聯絡案主 ${order.seeker_name}`}
              onClick={() => openChat({ partnerId: order.seeker_id, name: order.seeker_name, avatar: order.seeker_avatar_url })}
            >
              <MessageCircle />
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap sm:items-center">
        {order.order_status === 'accepted' &&
          (order.is_online ? (
            <Button
              size="lg"
              onClick={() => run('arrive', () => orderService.markArrived(order.id), '服務開始，結束後記得填寫聯絡簿')}
              loading={busy === 'arrive'}
            >
              <PlayCircle /> 開始線上服務
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={startNavigation}
              loading={busy === 'nav'}
              disabled={!canNavigate}
              title={canNavigate ? undefined : '服務開始前 6 小時內才能開始導航'}
            >
              <Navigation /> 開始導航
            </Button>
          ))}
        {order.order_status === 'navigating' && (
          <>
            <Button size="lg" onClick={resumeNavigation}>
              <Navigation /> 開啟導航地圖
            </Button>
            <Button
              size="lg"
              variant="secondary"
              loading={busy === 'arrive'}
              onClick={() =>
                run(
                  'arrive',
                  async () => {
                    await orderService.markArrived(order.id)
                    if (trackingOrder === order.id) useTrackingStore.getState().stop()
                  },
                  '已通知家屬您已抵達',
                )
              }
            >
              <MapPinCheck /> 我已抵達
            </Button>
          </>
        )}
        {order.order_status === 'in_progress' && (
          <Button size="lg" onClick={onCareLog}>
            <NotebookPen /> 填寫聯絡簿・完成服務
          </Button>
        )}
        {order.order_status === 'accepted' && (
          <Button variant="ghost" size="lg" onClick={cancel} loading={busy === 'cancel'}>
            <CalendarX2 /> 取消行程
          </Button>
        )}
        {order.order_status === 'accepted' && !order.is_online && !canNavigate && <p className="text-sm text-ink-3">服務開始前 6 小時內可以開始導航</p>}
      </div>
    </article>
  )
}
