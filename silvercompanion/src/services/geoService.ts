/**
 * Geocoding and routing with graceful degradation:
 *   geocode: Google Geocoder → OpenStreetMap Nominatim → city centre
 *   route:   OSRM → street-grid estimate
 * (With a Google key, the tracking map asks Google Directions itself.)
 */
import type { LatLng, RouteResult } from '@/types'
import { estimateRoute } from '@/lib/geo'
import { loadGoogleMaps } from '@/lib/googleMaps'
import { cityCenter, parseAddressArea } from '@/lib/taiwan'
import { env } from './env'

function addressCandidates(address: string) {
  const clean = address.replace(/\s+/g, '').replace(/^\d{3,6}/, '')
  const noFloor = clean.replace(/\d+樓(之\d+)?$/u, '').replace(/[\d-]+(F|f)$/u, '')
  const toNumber = /^(.*?號)/u.exec(noFloor)?.[1]
  const toRoad = /^(.*?(路|街|大道)(.{1,2}段)?)/u.exec(noFloor)?.[1]
  return [...new Set([clean, noFloor, toNumber, toRoad].filter((v): v is string => Boolean(v)))]
}

async function nominatim(query: string, signal: AbortSignal): Promise<LatLng | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.search = new URLSearchParams({ format: 'jsonv2', limit: '1', countrycodes: 'tw', 'accept-language': 'zh-TW', q: query }).toString()
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) return null
  const rows = (await res.json()) as { lat: string; lon: string }[]
  return rows[0] ? { lat: Number(rows[0].lat), lng: Number(rows[0].lon) } : null
}

export const geoService = {
  async geocode(address: string): Promise<{ point: LatLng; precise: boolean } | null> {
    if (!address.trim()) return null
    if (env.googleMapsKey) {
      try {
        const maps = await loadGoogleMaps(env.googleMapsKey)
        const { results } = await new maps.Geocoder().geocode({ address, region: 'TW' })
        const loc = results[0]?.geometry.location
        if (loc) return { point: { lat: loc.lat(), lng: loc.lng() }, precise: true }
      } catch {
        /* fall through */
      }
    }
    const signal = AbortSignal.timeout(7000)
    for (const candidate of addressCandidates(address)) {
      try {
        const hit = await nominatim(candidate, signal)
        if (hit) return { point: hit, precise: candidate === addressCandidates(address)[0] }
      } catch {
        break
      }
    }
    const center = cityCenter(parseAddressArea(address).city)
    return center ? { point: center, precise: false } : null
  },

  async route(origin: LatLng, destination: LatLng): Promise<RouteResult> {
    try {
      const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`
      const res = await fetch(`${env.osrmUrl}/route/v1/driving/${coords}?overview=full&geometries=geojson&alternatives=false`, {
        signal: AbortSignal.timeout(6000),
      })
      if (res.ok) {
        const data = (await res.json()) as {
          code: string
          routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[]
        }
        const best = data.code === 'Ok' ? data.routes?.[0] : undefined
        if (best && best.geometry.coordinates.length > 1) {
          return {
            coordinates: best.geometry.coordinates,
            distanceMeters: best.distance,
            // OSRM's public profile is optimistic for Taipei traffic.
            durationSeconds: best.duration * 1.35,
            source: 'osrm',
          }
        }
      }
    } catch {
      /* offline or blocked — estimate instead */
    }
    return estimateRoute(origin, destination)
  },
}
