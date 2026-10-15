import { ArrowRight, Navigation } from 'lucide-react'
import { motion } from 'motion/react'
import { UserAvatar } from '@/components/ui/avatar'
import { useOrderTracking } from '@/hooks/useOrderTracking'
import { SERVICE_MAP } from '@/lib/constants'
import { shortTime } from '@/lib/format'
import { formatDistance, haversine, URBAN_SPEED_MPS } from '@/lib/geo'
import { useUIStore } from '@/store/useUIStore'
import type { OrderDetails } from '@/types'

/**
 * Spec 4.2.1 — pinned banner while a companion is on the way. It listens to
 * the same Realtime channel as the map, so the ETA here is live too.
 */
export function LiveTripBanner({ order }: { order: OrderDetails }) {
  const openTracking = useUIStore((s) => s.openTracking)
  const { point } = useOrderTracking(order.id)
  const destination = order.location_lat != null && order.location_lng != null ? { lat: order.location_lat, lng: order.location_lng } : null
  const meters = point && destination ? haversine(point, destination) * 1.25 : null
  const minutes = meters != null ? Math.max(1, Math.round(meters / URBAN_SPEED_MPS / 60)) : null
  const who = order.provider_name ?? '陪伴者'
  const elder = order.recipient_nickname ?? order.recipient_name

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => openTracking({ orderId: order.id, mode: 'receiver' })}
      className="group relative w-full overflow-hidden rounded-[28px] p-5 text-left text-white shadow-lift focus-visible:ring-4 focus-visible:ring-[var(--ring)] focus-visible:outline-none md:p-7"
      style={{ background: 'linear-gradient(120deg, #123a4a 0%, #18566a 48%, #1f6f7d 100%)' }}
    >
      {/* moving route dashes */}
      <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full opacity-35" viewBox="0 0 600 60" preserveAspectRatio="none" aria-hidden>
        <path d="M-10 48 C 120 10, 220 58, 330 30 S 520 8, 610 34" fill="none" stroke="#8fe3d6" strokeWidth="3" strokeDasharray="2 12" strokeLinecap="round">
          <animate attributeName="stroke-dashoffset" from="0" to="-56" dur="1.6s" repeatCount="indefinite" />
        </path>
      </svg>
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]" aria-hidden>
        <div className="absolute -top-16 -right-16 size-56 rounded-full bg-[#2fb5a5]/25 blur-2xl" />
      </div>

      <div className="relative flex items-center gap-4 md:gap-6">
        <span className="relative shrink-0">
          <span className="absolute inset-0 animate-sos-ring rounded-full bg-[#8fe3d6]" aria-hidden />
          <UserAvatar name={who} src={order.provider_avatar_url} size="lg" ring />
        </span>
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-bold">
            <span className="size-2 animate-pulse-dot rounded-full bg-[#8fe3d6]" /> 前往中・即時定位
          </p>
          <p className="mt-2 text-xl leading-tight font-black sm:text-2xl md:text-3xl">
            {who} 正在前往{elder}家<span className="sr-only">（開啟即時位置地圖）</span>
          </p>
          <p className="mt-1 text-base text-white/80">
            {SERVICE_MAP[order.service_type].label}・{shortTime(order.start_time)} 開始
            {meters != null && <span className="hidden sm:inline">・距離 {formatDistance(meters)}</span>}
          </p>
        </div>
        <div className="hidden shrink-0 text-right sm:block">
          <p className="text-sm font-bold text-white/70">預計抵達</p>
          <p className="font-num text-5xl leading-none font-bold tracking-tight">
            {minutes ?? '—'}
            <span className="ml-1 text-lg font-bold text-white/80">分</span>
          </p>
        </div>
      </div>
      <div className="relative mt-5 flex items-center justify-between gap-3 border-t border-white/15 pt-4">
        <span className="text-base font-bold sm:hidden">{minutes != null ? `約 ${minutes} 分鐘後抵達` : '取得位置中…'}</span>
        <span className="ml-auto inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-base font-black text-[#123a4a] transition-transform group-hover:translate-x-1">
          <Navigation className="size-5" /> 查看即時位置 <ArrowRight className="size-5" />
        </span>
      </div>
    </motion.button>
  )
}
