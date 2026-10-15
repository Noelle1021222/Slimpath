import { useEffect, useRef } from 'react'
import type { TrackingPoint } from '@/types'

let lastKnown: TrackingPoint | null = null

export function getLastKnownPosition() {
  return lastKnown
}

function toPoint(pos: GeolocationPosition): TrackingPoint {
  const point = {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: pos.coords.accuracy ?? null,
    heading: Number.isFinite(pos.coords.heading) ? pos.coords.heading : null,
    speed: Number.isFinite(pos.coords.speed) ? pos.coords.speed : null,
    at: pos.timestamp || Date.now(),
  }
  lastKnown = point
  return point
}

/** One-shot fix with a hard timeout (used by SOS, which must never hang). */
export function getCurrentPosition(timeoutMs = 6000): Promise<TrackingPoint> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('unsupported'))
      return
    }
    const timer = setTimeout(() => reject(new Error('timeout')), timeoutMs + 500)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer)
        resolve(toPoint(pos))
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 15_000 },
    )
  })
}

export type GeoErrorKind = 'denied' | 'unavailable' | 'timeout' | 'unsupported'

export function geoErrorKind(error: unknown): GeoErrorKind {
  if (error instanceof GeolocationPositionError || (typeof error === 'object' && error && 'code' in error)) {
    const code = (error as GeolocationPositionError).code
    if (code === 1) return 'denied'
    if (code === 3) return 'timeout'
    return 'unavailable'
  }
  return (error as Error)?.message === 'unsupported' ? 'unsupported' : 'unavailable'
}

/**
 * navigator.geolocation.watchPosition, throttled so we emit at most one fix
 * per `minIntervalMs` (spec 5.1: every 5–10 s) unless the companion moved a lot.
 */
export function useWatchPosition(enabled: boolean, onPoint: (point: TrackingPoint) => void, onError: (kind: GeoErrorKind) => void, minIntervalMs = 6000) {
  const pointRef = useRef(onPoint)
  const errorRef = useRef(onError)
  useEffect(() => {
    pointRef.current = onPoint
    errorRef.current = onError
  })

  useEffect(() => {
    if (!enabled) return
    if (!('geolocation' in navigator)) {
      errorRef.current('unsupported')
      return
    }
    let lastEmit = 0
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const point = toPoint(pos)
        const now = Date.now()
        if (now - lastEmit >= minIntervalMs || lastEmit === 0) {
          lastEmit = now
          pointRef.current(point)
        }
      },
      (err) => errorRef.current(geoErrorKind(err)),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20_000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [enabled, minIntervalMs])
}
