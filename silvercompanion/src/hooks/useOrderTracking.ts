import { useEffect, useState } from 'react'
import type { LatLng, TrackingPoint } from '@/types'
import { trackingService } from '@/services'

/**
 * Family side of spec 5.1: listen on `tracking:order_{id}` and expose the
 * latest position. The map interpolates between fixes for smooth movement.
 */
export function useOrderTracking(orderId: string | null, origin?: LatLng | null) {
  const [point, setPoint] = useState<TrackingPoint | null>(null)
  const [trail, setTrail] = useState<TrackingPoint[]>([])

  useEffect(() => {
    if (!orderId) return
    setPoint(null)
    setTrail([])
    const off = trackingService.subscribe(
      orderId,
      (p) => {
        setPoint(p)
        setTrail((t) => [...t.slice(-60), p])
      },
      origin,
    )
    return off
    // origin only seeds the demo simulator; do not resubscribe when it changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  return { point, trail }
}
