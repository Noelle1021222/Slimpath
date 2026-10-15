import type { LatLng, RouteResult, TrackingPoint } from '@/types'

export interface TrackingMapProps {
  destination: LatLng
  /** live position of the companion (smoothly animated between fixes) */
  companion: TrackingPoint | null
  /** where to draw the route from before the first fix arrives */
  origin?: LatLng | null
  name: string
  avatarUrl?: string | null
  /** keep the camera on the companion */
  follow: boolean
  onRoute?: (route: RouteResult) => void
  onUserPan?: () => void
  /** extra space reserved by floating UI (px) */
  padding: { top: number; bottom: number; left: number; right: number }
  tone: 'seeker' | 'provider'
  className?: string
}

/** Off-route distance after which we ask for a fresh route. */
export const REROUTE_METERS = 150
export const REROUTE_MIN_INTERVAL_MS = 45_000
