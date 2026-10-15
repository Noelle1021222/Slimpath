/**
 * Moves a virtual companion along a real route so the tracking view is alive
 * in demo mode (the person clicking around is rarely in Taipei).
 */
import type { LatLng, RouteResult, TrackingPoint } from '@/types'
import { pointAlong, routeLength } from '@/lib/geo'
import { geoService } from '../geoService'

export interface SimulationOptions {
  origin: LatLng
  destination: LatLng
  onPoint: (point: TrackingPoint) => void
  onRoute?: (route: RouteResult) => void
  /** metres per second; ~40 km/h keeps the demo lively */
  speed?: number
  intervalMs?: number
  /** where along the route to begin (0–1) */
  startAt?: number
}

export function startRouteSimulation({ origin, destination, onPoint, onRoute, speed = 11, intervalMs = 2500, startAt = 0.3 }: SimulationOptions) {
  let stopped = false
  let timer: ReturnType<typeof setTimeout> | null = null

  void geoService.route(origin, destination).then((route) => {
    if (stopped) return
    onRoute?.(route)
    const total = routeLength(route.coordinates)
    let travelled = total * startAt
    let pauseTicks = 0

    const tick = () => {
      if (stopped) return
      const { point, heading } = pointAlong(route.coordinates, travelled)
      // a few metres of GPS jitter so it does not look robotic
      const jitter = () => (Math.random() - 0.5) * 0.00004
      onPoint({
        lat: point.lat + jitter(),
        lng: point.lng + jitter(),
        accuracy: 6 + Math.random() * 8,
        heading,
        speed: travelled >= total ? 0 : speed,
        at: Date.now(),
      })
      if (travelled >= total) {
        // wait at the door for a while, then loop so the demo never "ends"
        pauseTicks += 1
        if (pauseTicks > 12) {
          travelled = total * startAt
          pauseTicks = 0
        }
      } else {
        travelled = Math.min(total, travelled + speed * (intervalMs / 1000) * (0.85 + Math.random() * 0.3))
      }
      timer = setTimeout(tick, intervalMs)
    }
    tick()
  })

  return () => {
    stopped = true
    if (timer) clearTimeout(timer)
  }
}
