import { useEffect, useRef, useState } from 'react'
import { projectOntoRoute, sliceRoute } from '@/lib/geo'
import { loadGoogleMaps } from '@/lib/googleMaps'
import { cn } from '@/lib/utils'
import { env, geoService } from '@/services'
import type { LatLng, RouteResult } from '@/types'
import { companionMarkerElement, destinationMarkerElement, easeInOut, setMarkerHeading } from './markerElements'
import { REROUTE_METERS, REROUTE_MIN_INTERVAL_MS, type TrackingMapProps } from './types'

type Maps = typeof google.maps

const STYLES: Record<'seeker' | 'provider', google.maps.MapTypeStyle[]> = {
  seeker: [
    { elementType: 'geometry', stylers: [{ color: '#f6efe5' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#5c4a3e' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#fbf6ef' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ visibility: 'on' }, { color: '#e1e9d4' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#f7dcc3' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#cfe2e8' }] },
    { featureType: 'transit', stylers: [{ visibility: 'simplified' }] },
  ],
  provider: [
    { elementType: 'geometry', stylers: [{ color: '#eef3f4' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#3a5260' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ visibility: 'on' }, { color: '#dfeadf' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#d6ecec' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c7e0e6' }] },
  ],
}

function htmlMarkerClass(maps: Maps) {
  return class HtmlMarker extends maps.OverlayView {
    el: HTMLElement
    position: google.maps.LatLngLiteral
    constructor(el: HTMLElement, position: google.maps.LatLngLiteral) {
      super()
      this.el = el
      this.position = position
    }
    onAdd() {
      this.el.style.position = 'absolute'
      this.getPanes()?.overlayMouseTarget.appendChild(this.el)
    }
    draw() {
      const p = this.getProjection()?.fromLatLngToDivPixel(new maps.LatLng(this.position))
      if (p) this.el.style.transform = `translate(${p.x - this.el.offsetWidth / 2}px, ${p.y - this.el.offsetHeight / 2}px)`
    }
    onRemove() {
      this.el.remove()
    }
    setPosition(p: google.maps.LatLngLiteral) {
      this.position = p
      this.draw()
    }
  }
}

/**
 * Spec 5.1 — Google Maps + Directions Service: real route, live ETA and the
 * companion's avatar gliding along it.
 */
export default function GoogleTrackingMap({
  destination,
  companion,
  origin,
  name,
  avatarUrl,
  follow,
  onRoute,
  onUserPan,
  padding,
  tone,
  className,
}: TrackingMapProps) {
  const el = useRef<HTMLDivElement>(null)
  const ctx = useRef<{
    maps: Maps
    map: google.maps.Map
    line: google.maps.Polyline
    casing: google.maps.Polyline
    travelled: google.maps.Polyline
    directions: google.maps.DirectionsService
    Marker: ReturnType<typeof htmlMarkerClass>
    companion: InstanceType<ReturnType<typeof htmlMarkerClass>> | null
  } | null>(null)
  const route = useRef<RouteResult | null>(null)
  const lastReroute = useRef(0)
  const shown = useRef<LatLng | null>(null)
  const lastFixAt = useRef(0)
  const raf = useRef(0)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const onRouteRef = useRef(onRoute)
  const onPanRef = useRef(onUserPan)
  useEffect(() => {
    onRouteRef.current = onRoute
    onPanRef.current = onUserPan
  })

  useEffect(() => {
    let cancelled = false
    loadGoogleMaps(env.googleMapsKey)
      .then((maps) => {
        if (cancelled || !el.current) return
        const useMapId = env.googleMapId && env.googleMapId !== 'DEMO_MAP_ID'
        const map = new maps.Map(el.current, {
          center: destination,
          zoom: 14,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
          gestureHandling: 'greedy',
          ...(useMapId ? { mapId: env.googleMapId } : { styles: STYLES[tone] }),
        })
        const color = tone === 'provider' ? '#0f6670' : '#b5481b'
        const casing = new maps.Polyline({ map, strokeColor: '#ffffff', strokeWeight: 11, strokeOpacity: 0.95, zIndex: 1 })
        const line = new maps.Polyline({ map, strokeColor: color, strokeWeight: 6, zIndex: 2 })
        const travelled = new maps.Polyline({ map, strokeColor: '#9aa5ab', strokeWeight: 6, zIndex: 3 })
        const Marker = htmlMarkerClass(maps)
        new Marker(destinationMarkerElement('目的地'), destination).setMap(map)
        map.addListener('dragstart', () => onPanRef.current?.())
        ctx.current = { maps, map, line, casing, travelled, directions: new maps.DirectionsService(), Marker, companion: null }
        setReady(true)
      })
      .catch(() => setFailed(true))
    return () => {
      cancelled = true
      cancelAnimationFrame(raf.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination.lat, destination.lng])

  const requestRoute = async (from: LatLng) => {
    const c = ctx.current
    if (!c) return
    lastReroute.current = Date.now()
    let next: RouteResult
    try {
      const res = await c.directions.route({ origin: from, destination, travelMode: c.maps.TravelMode.DRIVING, region: 'tw' })
      const r = res.routes[0]
      const leg = r.legs[0]
      next = {
        coordinates: r.overview_path.map((p) => [p.lng(), p.lat()] as [number, number]),
        distanceMeters: leg.distance?.value ?? 0,
        durationSeconds: leg.duration?.value ?? 0,
        source: 'google',
      }
    } catch {
      next = await geoService.route(from, destination)
    }
    route.current = next
    onRouteRef.current?.(next)
    const path = next.coordinates.map(([lng, lat]) => ({ lat, lng }))
    c.line.setPath(path)
    c.casing.setPath(path)
    if (!c.companion) {
      const bounds = new c.maps.LatLngBounds()
      path.forEach((p) => bounds.extend(p))
      c.map.fitBounds(bounds, padding)
    }
  }

  useEffect(() => {
    if (!ready || route.current) return
    const from = companion ?? origin
    if (from) void requestRoute(from)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, origin, companion == null])

  useEffect(() => {
    const c = ctx.current
    if (!c || !companion || !ready) return
    const target = { lat: companion.lat, lng: companion.lng }
    if (!c.companion) {
      c.companion = new c.Marker(companionMarkerElement(name, avatarUrl), target)
      c.companion.setMap(c.map)
      shown.current = target
      const bounds = new c.maps.LatLngBounds()
      bounds.extend(target)
      bounds.extend(destination)
      c.map.fitBounds(bounds, padding)
    }
    setMarkerHeading(c.companion.el, companion.heading)
    const now = performance.now()
    const gap = lastFixAt.current ? now - lastFixAt.current : 1200
    lastFixAt.current = now
    const from = shown.current ?? target
    const duration = Math.min(Math.max(gap * 0.95, 700), 9000)
    cancelAnimationFrame(raf.current)
    const start = now
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / duration)
      const e = duration > 3000 ? k : easeInOut(k)
      const p = { lat: from.lat + (target.lat - from.lat) * e, lng: from.lng + (target.lng - from.lng) * e }
      shown.current = p
      c.companion?.setPosition(p)
      if (k < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)

    if (route.current) {
      const { along, offRoute } = projectOntoRoute(route.current.coordinates, target)
      const done = sliceRoute(route.current.coordinates, along).map(([lng, lat]) => ({ lat, lng }))
      c.travelled.setPath(done.length > 1 ? done : [])
      if (offRoute > REROUTE_METERS && Date.now() - lastReroute.current > REROUTE_MIN_INTERVAL_MS) void requestRoute(target)
    } else if (Date.now() - lastReroute.current > 5000) {
      void requestRoute(target)
    }
    if (follow) c.map.panTo(target)
    else {
      const view = c.map.getBounds()
      if (view && !(view.contains(target) && view.contains(destination))) {
        const bounds = new c.maps.LatLngBounds()
        bounds.extend(target)
        bounds.extend(destination)
        c.map.fitBounds(bounds, padding)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companion, ready])

  useEffect(() => {
    const c = ctx.current
    if (c && follow && shown.current) c.map.panTo(shown.current)
  }, [follow])

  return (
    <div className={cn('relative size-full', className)}>
      <div ref={el} className="size-full" role="region" aria-label="即時位置地圖" />
      {failed && (
        <p className="absolute inset-x-6 top-1/2 rounded-2xl bg-surface p-4 text-center text-base text-ink-2 shadow-soft">
          Google 地圖載入失敗，請檢查網路或 API 金鑰設定。
        </p>
      )}
    </div>
  )
}
