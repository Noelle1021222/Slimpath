import type { LatLng, RouteResult } from '@/types'

const EARTH_RADIUS = 6_371_008.8
const toRad = (deg: number) => (deg * Math.PI) / 180
const toDeg = (rad: number) => (rad * 180) / Math.PI

/** Great-circle distance in metres. */
export function haversine(a: LatLng, b: LatLng) {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS * Math.asin(Math.min(1, Math.sqrt(s)))
}

/** Initial bearing from a to b, degrees clockwise from north. */
export function bearing(a: LatLng, b: LatLng) {
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat))
  const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) - Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng))
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

export function lerp(a: LatLng, b: LatLng, t: number): LatLng {
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t }
}

const toLatLng = ([lng, lat]: [number, number]): LatLng => ({ lat, lng })

export function routeLength(coords: [number, number][]) {
  let total = 0
  for (let i = 1; i < coords.length; i++) total += haversine(toLatLng(coords[i - 1]), toLatLng(coords[i]))
  return total
}

/** Point `distance` metres along the polyline (clamped to its ends). */
export function pointAlong(coords: [number, number][], distance: number): { point: LatLng; heading: number } {
  if (coords.length === 0) throw new Error('empty route')
  if (coords.length === 1 || distance <= 0) {
    const heading = coords.length > 1 ? bearing(toLatLng(coords[0]), toLatLng(coords[1])) : 0
    return { point: toLatLng(coords[0]), heading }
  }
  let walked = 0
  for (let i = 1; i < coords.length; i++) {
    const a = toLatLng(coords[i - 1])
    const b = toLatLng(coords[i])
    const seg = haversine(a, b)
    if (walked + seg >= distance) {
      const t = seg === 0 ? 0 : (distance - walked) / seg
      return { point: lerp(a, b, t), heading: bearing(a, b) }
    }
    walked += seg
  }
  const n = coords.length
  return { point: toLatLng(coords[n - 1]), heading: bearing(toLatLng(coords[n - 2]), toLatLng(coords[n - 1])) }
}

/**
 * Projects a position onto the route. Returns how far along the route the
 * closest point is and how far off-route the position is (metres).
 */
export function projectOntoRoute(coords: [number, number][], p: LatLng) {
  if (coords.length < 2) return { along: 0, offRoute: coords.length ? haversine(p, toLatLng(coords[0])) : 0 }
  const lat0 = toRad(p.lat)
  const project = (q: LatLng) => ({ x: toRad(q.lng) * Math.cos(lat0) * EARTH_RADIUS, y: toRad(q.lat) * EARTH_RADIUS })
  const P = project(p)
  let best = { along: 0, offRoute: Number.POSITIVE_INFINITY }
  let walked = 0
  for (let i = 1; i < coords.length; i++) {
    const A = project(toLatLng(coords[i - 1]))
    const B = project(toLatLng(coords[i]))
    const dx = B.x - A.x
    const dy = B.y - A.y
    const len2 = dx * dx + dy * dy
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((P.x - A.x) * dx + (P.y - A.y) * dy) / len2))
    const cx = A.x + t * dx
    const cy = A.y + t * dy
    const off = Math.hypot(P.x - cx, P.y - cy)
    const segLen = Math.sqrt(len2)
    if (off < best.offRoute) best = { along: walked + t * segLen, offRoute: off }
    walked += segLen
  }
  return best
}

/** Coordinates from the start of the route up to `distance` metres along it. */
export function sliceRoute(coords: [number, number][], distance: number): [number, number][] {
  if (coords.length < 2 || distance <= 0) return []
  const out: [number, number][] = [coords[0]]
  let walked = 0
  for (let i = 1; i < coords.length; i++) {
    const a = toLatLng(coords[i - 1])
    const b = toLatLng(coords[i])
    const seg = haversine(a, b)
    if (walked + seg >= distance) {
      const t = seg === 0 ? 0 : (distance - walked) / seg
      const p = lerp(a, b, t)
      out.push([p.lng, p.lat])
      return out
    }
    out.push(coords[i])
    walked += seg
  }
  return out
}

/** Average urban door-to-door speed used when no routing service answers. */
export const URBAN_SPEED_MPS = 22 / 3.6

/**
 * Street-like fallback route (axis-aligned legs, as most Taiwanese city grids
 * are) used when Google Directions / OSRM are unreachable.
 */
export function estimateRoute(origin: LatLng, destination: LatLng): RouteResult {
  const dLat = destination.lat - origin.lat
  const dLng = destination.lng - origin.lng
  const coordinates: [number, number][] = [
    [origin.lng, origin.lat],
    [origin.lng + dLng * 0.42, origin.lat],
    [origin.lng + dLng * 0.42, origin.lat + dLat * 0.58],
    [destination.lng, origin.lat + dLat * 0.58],
    [destination.lng, destination.lat],
  ]
  const distanceMeters = routeLength(coordinates)
  return { coordinates, distanceMeters, durationSeconds: distanceMeters / URBAN_SPEED_MPS, source: 'estimate' }
}

export function formatDistance(meters: number) {
  if (!Number.isFinite(meters)) return '—'
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} 公尺`
  return `${(meters / 1000).toFixed(meters < 10_000 ? 1 : 0)} 公里`
}

export function formatEta(seconds: number) {
  if (!Number.isFinite(seconds)) return '計算中'
  if (seconds < 60) return '即將抵達'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} 分鐘`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} 小時 ${m} 分` : `${h} 小時`
}

/** Epoch ms + seconds → "14:32" (Taipei). */
export function etaClock(seconds: number, now: number = Date.now()) {
  const d = new Date(now + seconds * 1000)
  return new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d)
}

export function googleMapsDirectionsUrl(destination: LatLng, origin?: LatLng | null) {
  const params = new URLSearchParams({ api: '1', destination: `${destination.lat},${destination.lng}`, travelmode: 'driving' })
  if (origin) params.set('origin', `${origin.lat},${origin.lng}`)
  return `https://www.google.com/maps/dir/?${params}`
}

export function googleMapsPinUrl(p: LatLng) {
  return `https://maps.google.com/?q=${p.lat.toFixed(6)},${p.lng.toFixed(6)}`
}
