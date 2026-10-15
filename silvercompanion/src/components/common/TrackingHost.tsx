import { lazy, Suspense } from 'react'
import { useUIStore } from '@/store/useUIStore'

// MapLibre / Google Maps are only downloaded when someone opens the map.
const NavigationOverlay = lazy(() => import('./NavigationOverlay'))

export function TrackingHost() {
  const tracking = useUIStore((s) => s.tracking)
  const close = useUIStore((s) => s.closeTracking)
  if (!tracking) return null
  return (
    <Suspense fallback={<div className="fixed inset-0 z-[65] bg-bg/80 backdrop-blur" aria-hidden />}>
      <NavigationOverlay orderId={tracking.orderId} mode={tracking.mode} onClose={close} />
    </Suspense>
  )
}
