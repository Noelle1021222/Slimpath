import { MapPin, Square } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef } from 'react'
import { useWatchPosition } from '@/hooks/useGeolocation'
import { useWakeLock } from '@/hooks/useWakeLock'
import { TRACKING_INTERVAL_MS } from '@/lib/constants'
import { trackingService } from '@/services'
import type { TrackingPublisher as Publisher } from '@/services/contracts'
import { simulateCompanionGps } from '@/services/demo/backend'
import { useTrackingStore } from '@/store/useTrackingStore'
import { useUIStore } from '@/store/useUIStore'
import type { TrackingPoint } from '@/types'

/**
 * Spec 5.1 (sender) — while an order is `navigating`, read the device GPS with
 * watchPosition and broadcast at most one fix every few seconds on
 * `tracking:order_{id}`. Nothing is written to the database. Mounted once in
 * the companion layout so sharing continues across screens.
 */
export function TrackingPublisher() {
  const orderId = useTrackingStore((s) => s.orderId)
  const simulate = useTrackingStore((s) => s.simulate)
  const report = useTrackingStore((s) => s.report)
  const publisher = useRef<Publisher | null>(null)
  const lastSent = useRef(0)

  useEffect(() => {
    if (!orderId) return
    publisher.current = trackingService.publisher(orderId)
    lastSent.current = 0
    return () => {
      publisher.current?.close()
      publisher.current = null
    }
  }, [orderId])

  const onPoint = useCallback(
    (point: TrackingPoint) => {
      const now = Date.now()
      // The local map updates on every fix; the broadcast is throttled (spec: 5–10 s).
      report({ lastPoint: point, status: 'live', error: null })
      if (now - lastSent.current >= TRACKING_INTERVAL_MS - 250) {
        lastSent.current = now
        publisher.current?.send(point)
        report({ lastSentAt: now })
      }
    },
    [report],
  )

  useWatchPosition(!!orderId && !simulate, onPoint, (kind) => report({ status: kind === 'denied' ? 'denied' : 'error', error: kind }), 1000)

  useEffect(() => {
    if (!orderId || !simulate) return
    return simulateCompanionGps(orderId, onPoint)
  }, [orderId, simulate, onPoint])

  useWakeLock(!!orderId)
  return <TrackingPill />
}

/** "You're sharing your location" pill — reopens the map or stops sharing. */
function TrackingPill() {
  const orderId = useTrackingStore((s) => s.orderId)
  const status = useTrackingStore((s) => s.status)
  const stop = useTrackingStore((s) => s.stop)
  const tracking = useUIStore((s) => s.tracking)
  const openTracking = useUIStore((s) => s.openTracking)
  const visible = !!orderId && !tracking
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
          className="fixed inset-x-4 bottom-[calc(84px+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md items-center gap-2 rounded-full bg-hero p-1.5 pl-4 text-hero-ink shadow-lift md:right-6 md:bottom-6 md:left-auto md:mx-0"
          role="status"
        >
          <span className="relative grid size-8 place-items-center">
            <span className="absolute inset-0 animate-sos-ring rounded-full bg-accent" />
            <MapPin className="relative size-5 text-accent-2" />
          </span>
          <button type="button" onClick={() => openTracking({ orderId: orderId!, mode: 'sender' })} className="min-h-11 flex-1 text-left text-[15px] font-bold">
            {status === 'live' ? '正在分享位置給家屬' : status === 'denied' ? '定位權限被拒絕' : '取得定位中…'}
            <span className="block text-sm font-medium opacity-70">點一下開啟導航地圖</span>
          </button>
          <button type="button" onClick={stop} className="grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="停止分享位置">
            <Square className="size-4 fill-current" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
