import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Crosshair, ExternalLink, House, LocateFixed, MapPinCheck, MessageCircle, Phone, Satellite, ShieldCheck, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Dialog } from 'radix-ui'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { UserAvatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useOrder, useOrderContact } from '@/hooks/queries'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { useOrderTracking } from '@/hooks/useOrderTracking'
import { SERVICE_MAP } from '@/lib/constants'
import { errorMessage } from '@/lib/errors'
import { shortTime } from '@/lib/format'
import { etaClock, formatDistance, formatEta, googleMapsDirectionsUrl, haversine, projectOntoRoute, URBAN_SPEED_MPS } from '@/lib/geo'
import { cn, haptic } from '@/lib/utils'
import { isDemo, orderService } from '@/services'
import { demoHomeBase } from '@/services/demo/backend'
import { useTrackingStore } from '@/store/useTrackingStore'
import { useUIStore } from '@/store/useUIStore'
import { useUserStore } from '@/store/useUserStore'
import type { RouteResult } from '@/types'
import { TrackingMap } from './map/TrackingMap'

const ARRIVAL_METERS = 60

/**
 * Spec 5.1 — live GPS tracking.
 *  · sender (companion): shows their own broadcast position, route and ETA,
 *    with call / message / 我已抵達.
 *  · receiver (family): subscribes to tracking:order_{id} and watches the
 *    companion's avatar glide towards home.
 */
export default function NavigationOverlay({ orderId, mode, onClose }: { orderId: string; mode: 'sender' | 'receiver'; onClose: () => void }) {
  const sender = mode === 'sender'
  const tone = useUserStore((s) => s.profile?.role ?? 'seeker')
  const order = useOrder(orderId)
  const contact = useOrderContact(orderId)
  const openChat = useUIStore((s) => s.openChat)
  const tracking = useTrackingStore()
  const desktop = useIsDesktop()
  const client = useQueryClient()
  const o = order.data
  const live = useOrderTracking(sender ? null : orderId, isDemo ? demoHomeBase(o?.provider_id) : null)
  const point = sender ? tracking.lastPoint : live.point
  const [route, setRoute] = useState<RouteResult | null>(null)
  // overview keeps companion + home in frame; follow keeps the camera on the companion
  const [follow, setFollow] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [arriving, setArriving] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const sheet = useRef<HTMLElement>(null)
  const [sheetHeight, setSheetHeight] = useState(360)

  useEffect(() => {
    const el = sheet.current
    if (!el) return
    const ro = new ResizeObserver(() => setSheetHeight(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // Close automatically once the trip is over (e.g. arrival marked elsewhere).
  useEffect(() => {
    if (o && !['navigating', 'accepted'].includes(o.order_status) && !sender) {
      toast.success(o.order_status === 'in_progress' ? `${o.provider_name} 已抵達！` : '行程已結束')
      onClose()
    }
  }, [o, sender, onClose])

  const lat = o?.location_lat
  const lng = o?.location_lng
  const destination = useMemo(() => (lat != null && lng != null ? { lat, lng } : null), [lat, lng])
  const metrics = useMemo(() => {
    if (!destination) return null
    if (route && point) {
      const total = route.distanceMeters || 1
      const { along } = projectOntoRoute(route.coordinates, point)
      const remaining = Math.max(0, Math.min(total, total - along))
      const speed = route.durationSeconds > 0 ? route.distanceMeters / route.durationSeconds : URBAN_SPEED_MPS
      return { remaining, eta: remaining / speed, progress: Math.min(1, Math.max(0, along / total)), straight: haversine(point, destination) }
    }
    if (point) {
      const straight = haversine(point, destination)
      return { remaining: straight * 1.3, eta: (straight * 1.3) / URBAN_SPEED_MPS, progress: 0, straight }
    }
    if (route) return { remaining: route.distanceMeters, eta: route.durationSeconds, progress: 0, straight: Infinity }
    return null
  }, [route, point, destination])

  const nearby = metrics != null && metrics.straight < ARRIVAL_METERS
  const lastSeen = point ? Math.max(0, Math.round((now - point.at) / 1000)) : null
  const partnerName = sender ? (o?.recipient_nickname ?? o?.recipient_name ?? '長輩') : (o?.provider_name ?? '陪伴者')
  const counterpart = sender ? o?.seeker_name : o?.provider_name

  const arrive = async () => {
    if (!o) return
    setArriving(true)
    try {
      await orderService.markArrived(o.id)
      haptic([30, 50, 30])
      tracking.stop()
      await client.invalidateQueries({ queryKey: ['orders'] })
      toast.success('已通知家屬您已抵達', { description: '服務結束後，記得在「我的行程」填寫聯絡簿。' })
      onClose()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setArriving(false)
    }
  }

  const padding = useMemo(
    () => (desktop ? { top: 120, bottom: 70, left: 490, right: 80 } : { top: 130, bottom: sheetHeight + 36, left: 56, right: 56 }),
    [desktop, sheetHeight],
  )

  return (
    <Dialog.Root open onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Content aria-describedby="nav-desc" className="fixed inset-0 z-[65] bg-bg outline-none" onOpenAutoFocus={(e) => e.preventDefault()}>
          <Dialog.Title className="sr-only">{sender ? `前往${partnerName}家` : `${partnerName} 的即時位置`}</Dialog.Title>
          <p id="nav-desc" className="sr-only">
            {metrics ? `預計 ${formatEta(metrics.eta)} 後抵達，剩餘 ${formatDistance(metrics.remaining)}` : '正在取得位置'}
          </p>

          <div className="absolute inset-0">
            {destination ? (
              <TrackingMap
                destination={destination}
                companion={point}
                origin={isDemo ? demoHomeBase(o?.provider_id) : null}
                name={o?.provider_name ?? '陪伴者'}
                avatarUrl={o?.provider_avatar_url}
                follow={follow}
                onRoute={setRoute}
                onUserPan={() => setFollow(false)}
                padding={padding}
                tone={tone}
              />
            ) : (
              <div className="size-full skeleton" />
            )}
          </div>

          {/* top bar */}
          <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/25 to-transparent px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-10 md:px-6 md:pt-6">
            <div className="pointer-events-auto flex items-center gap-3">
              <Dialog.Close asChild>
                <Button variant="secondary" size="icon" pill className="shadow-lift" aria-label="關閉地圖">
                  <X />
                </Button>
              </Dialog.Close>
              <div className="flex min-w-0 items-center gap-2 rounded-full bg-surface/95 py-2 pr-4 pl-3 shadow-lift backdrop-blur">
                <span className={cn('size-2.5 shrink-0 rounded-full', point ? 'animate-pulse-dot bg-[#2fae66]' : 'bg-warning')} />
                <span className="truncate text-[15px] font-bold">
                  {point
                    ? lastSeen != null && lastSeen > 30
                      ? `訊號較弱・${lastSeen} 秒前更新`
                      : `即時定位中・${lastSeen ?? 0} 秒前更新`
                    : sender
                      ? '正在取得您的定位…'
                      : '等待陪伴者的定位訊號…'}
                </span>
              </div>
              <div className="ml-auto flex gap-2">
                {point && (
                  <Button variant="secondary" pill className="shadow-lift" onClick={() => setFollow((f) => !f)} aria-pressed={follow}>
                    {follow ? <Crosshair /> : <LocateFixed />}
                    <span className="hidden sm:inline">{follow ? '看全貌' : '跟隨陪伴者'}</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* info sheet */}
          <motion.section
            ref={sheet}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className={cn(
              'absolute z-10 flex flex-col overflow-hidden bg-surface shadow-lift',
              'inset-x-0 bottom-0 rounded-t-[32px] pb-[calc(1rem+env(safe-area-inset-bottom))]',
              'md:inset-x-auto md:bottom-6 md:left-6 md:w-[420px] md:rounded-[32px] md:pb-0',
            )}
            aria-label="行程資訊"
          >
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className="flex justify-center pt-3 pb-1 md:hidden"
              aria-label={collapsed ? '展開行程資訊' : '收合行程資訊'}
              aria-expanded={!collapsed}
            >
              <span className="h-1.5 w-12 rounded-full bg-line-strong" />
            </button>

            <div className="px-6 pt-3 md:px-7 md:pt-7">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[15px] font-bold text-ink-3">{sender ? `前往 ${partnerName} 家` : `${partnerName} 正在前往`}</p>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={nearby ? 'near' : 'eta'}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="mt-1 font-num text-[44px] leading-none font-semibold tracking-tight text-ink md:text-[52px]"
                    >
                      {nearby ? '已到附近' : metrics ? formatEta(metrics.eta) : '—'}
                    </motion.p>
                  </AnimatePresence>
                  <p className="mt-2 text-base text-ink-2">
                    {metrics && !nearby ? (
                      <>
                        預計 <b className="text-ink tabular">{etaClock(metrics.eta, now)}</b> 抵達・剩 {formatDistance(metrics.remaining)}
                      </>
                    ) : nearby ? (
                      sender ? (
                        '到了嗎？按下「我已抵達」通知家屬。'
                      ) : (
                        '陪伴者就在附近，準備開門囉！'
                      )
                    ) : (
                      '路線規劃中…'
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCollapsed((c) => !c)}
                  className="hidden size-10 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-surface-2 md:grid"
                  aria-label={collapsed ? '展開' : '收合'}
                >
                  <ChevronDown className={cn('size-5 transition-transform', collapsed && 'rotate-180')} />
                </button>
              </div>

              <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-surface-3" aria-hidden>
                <motion.div
                  className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--primary))]"
                  animate={{ width: `${Math.round((nearby ? 1 : (metrics?.progress ?? 0)) * 100)}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                />
              </div>
            </div>

            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-4 px-6 pt-5 pb-6 md:px-7 md:pb-7">
                    <div className="flex items-center gap-3 rounded-3xl bg-surface-2 p-3">
                      <UserAvatar name={counterpart ?? partnerName} src={sender ? o?.seeker_avatar_url : o?.provider_avatar_url} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-lg font-bold">{counterpart ?? partnerName}</p>
                        <p className="truncate text-sm text-ink-2">{o ? `${SERVICE_MAP[o.service_type].label}・${shortTime(o.start_time)} 開始` : ''}</p>
                      </div>
                      {contact.data && (
                        <Button asChild variant="secondary" size="icon" pill aria-label={`打電話給 ${contact.data.display_name}`}>
                          <a href={`tel:${contact.data.phone}`}>
                            <Phone />
                          </a>
                        </Button>
                      )}
                      {o && (
                        <Button
                          variant="secondary"
                          size="icon"
                          pill
                          aria-label="傳送訊息"
                          onClick={() =>
                            openChat({
                              partnerId: sender ? o.seeker_id : o.provider_id!,
                              name: (sender ? o.seeker_name : o.provider_name) ?? '',
                              avatar: sender ? o.seeker_avatar_url : o.provider_avatar_url,
                            })
                          }
                        >
                          <MessageCircle />
                        </Button>
                      )}
                    </div>

                    <p className="flex items-start gap-2 text-[15px] leading-snug text-ink-2">
                      <House className="mt-0.5 size-4 shrink-0" /> {o?.location_address}
                    </p>

                    {sender ? (
                      <>
                        <Button size="xl" block onClick={arrive} loading={arriving} className={cn(nearby && 'animate-[pulse-dot_1.6s_ease-in-out_infinite]')}>
                          <MapPinCheck /> 我已抵達
                        </Button>
                        <div className="grid grid-cols-2 gap-3">
                          <Button asChild variant="secondary" size="lg">
                            <a href={destination ? googleMapsDirectionsUrl(destination, point) : '#'} target="_blank" rel="noreferrer">
                              <ExternalLink /> Google 導航
                            </a>
                          </Button>
                          <Button variant="secondary" size="lg" onClick={() => setFollow((f) => !f)} aria-pressed={follow}>
                            <Crosshair /> {follow ? '看全貌' : '跟著我'}
                          </Button>
                        </div>
                        <GpsStatus />
                      </>
                    ) : (
                      <p className="flex items-start gap-2 rounded-2xl bg-success-soft px-4 py-3 text-[15px] leading-relaxed text-success">
                        <ShieldCheck className="mt-0.5 size-5 shrink-0" />
                        位置每 5–10 秒更新一次，只在前往途中分享；抵達後就會停止。
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/** Companion-side GPS health + the demo-only simulation switch. */
function GpsStatus() {
  const { status, lastPoint, simulate, setSimulate, error } = useTrackingStore()
  const text =
    status === 'denied'
      ? '定位權限被拒絕：請到瀏覽器設定允許「位置」，家屬才能看到您。'
      : status === 'error'
        ? error === 'unsupported'
          ? '這個裝置不支援定位。'
          : '暫時抓不到 GPS 訊號，移動到空曠處試試。'
        : status === 'live'
          ? `正在分享位置給家屬・精度 ±${Math.round(lastPoint?.accuracy ?? 10)} 公尺`
          : '正在取得定位…'
  return (
    <div
      className={cn(
        'rounded-2xl px-4 py-3 text-[15px] leading-snug',
        status === 'denied' || status === 'error' ? 'bg-danger-soft text-danger-strong' : 'bg-surface-2 text-ink-2',
      )}
    >
      <p className="flex items-start gap-2">
        <Satellite className="mt-0.5 size-4 shrink-0" />
        {text}
      </p>
      {isDemo && (
        <label className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
          <span>
            <span className="block font-bold text-ink">模擬移動（示範）</span>
            <span className="block text-sm text-ink-3">關閉後改用這台裝置的真實 GPS</span>
          </span>
          <Switch checked={simulate} onCheckedChange={setSimulate} aria-label="模擬移動" />
        </label>
      )}
    </div>
  )
}
