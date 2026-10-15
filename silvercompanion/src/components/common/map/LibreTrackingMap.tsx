import maplibregl, { type GeoJSONSource, type Map as MLMap, type Marker, type StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef, useState } from 'react'
import { projectOntoRoute, sliceRoute } from '@/lib/geo'
import { cn } from '@/lib/utils'
import { env, geoService } from '@/services'
import type { LatLng, RouteResult } from '@/types'
import { companionMarkerElement, destinationMarkerElement, easeInOut, setMarkerHeading } from './markerElements'
import { REROUTE_METERS, REROUTE_MIN_INTERVAL_MS, type TrackingMapProps } from './types'

const PALETTE = {
  seeker: { bg: '#f6efe5', water: '#cfe2e8', green: '#e1e9d4', building: '#ece2d4', route: '#b5481b', casing: '#ffffff' },
  provider: { bg: '#eef3f4', water: '#c7e0e6', green: '#dfeadf', building: '#e1e8ea', route: '#0f6670', casing: '#ffffff' },
}

/** Background-only style used when the vector tiles cannot be reached. */
const offlineStyle = (): StyleSpecification => ({
  version: 8,
  sources: {},
  // transparent, so the CSS street-grid behind the canvas shows through
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': 'rgba(0,0,0,0)' } }],
})

/** Gently warm (or cool) the third-party basemap so it belongs to our UI. */
function tintBasemap(map: MLMap, tone: 'seeker' | 'provider') {
  const c = PALETTE[tone]
  for (const layer of map.getStyle().layers ?? []) {
    const id = layer.id.toLowerCase()
    try {
      if (layer.type === 'background') map.setPaintProperty(layer.id, 'background-color', c.bg)
      else if (layer.type === 'fill' && /water|ocean|river|lake/.test(id)) map.setPaintProperty(layer.id, 'fill-color', c.water)
      else if (layer.type === 'fill' && /park|wood|grass|green|landcover|forest|garden/.test(id)) map.setPaintProperty(layer.id, 'fill-color', c.green)
      else if (layer.type === 'fill' && /building/.test(id)) map.setPaintProperty(layer.id, 'fill-color', c.building)
      else if (layer.type === 'symbol' && /poi/.test(id)) map.setLayoutProperty(layer.id, 'visibility', 'none')
    } catch {
      /* layer without that property */
    }
  }
}

const toFeature = (coords: [number, number][]) => ({
  type: 'Feature' as const,
  properties: {},
  geometry: { type: 'LineString' as const, coordinates: coords },
})

export default function LibreTrackingMap({
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
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MLMap | null>(null)
  const companionMarker = useRef<Marker | null>(null)
  const route = useRef<RouteResult | null>(null)
  const lastReroute = useRef(0)
  const anim = useRef<{ raf: number; from: LatLng; to: LatLng; start: number; duration: number } | null>(null)
  const lastFixAt = useRef(0)
  const shown = useRef<LatLng | null>(null)
  const [ready, setReady] = useState(false)
  const [offline, setOffline] = useState(false)
  const onRouteRef = useRef(onRoute)
  const onPanRef = useRef(onUserPan)
  useEffect(() => {
    onRouteRef.current = onRoute
    onPanRef.current = onUserPan
  })

  // --- create the map once ------------------------------------------------
  useEffect(() => {
    if (!container.current) return
    const c = PALETTE[tone]
    let fellBack = false
    const map = new maplibregl.Map({
      container: container.current,
      style: env.mapStyleUrl,
      center: [destination.lng, destination.lat],
      zoom: 14,
      attributionControl: { compact: true },
      cooperativeGestures: false,
      pitchWithRotate: false,
      dragRotate: false,
    })
    mapRef.current = map
    if (import.meta.env.DEV) (window as unknown as { __scMap?: MLMap }).__scMap = map
    map.touchZoomRotate.disableRotation()

    const fallback = () => {
      if (fellBack) return
      fellBack = true
      setOffline(true)
      map.setStyle(offlineStyle())
    }
    const timer = setTimeout(() => {
      if (!map.isStyleLoaded()) fallback()
    }, 6000)
    map.on('error', (e) => {
      const msg = String((e as { error?: Error }).error?.message ?? '')
      if (!map.isStyleLoaded() || /style|Failed to fetch|NetworkError/i.test(msg)) fallback()
    })

    map.on('style.load', () => {
      if (!fellBack) tintBasemap(map, tone)
      if (!map.getSource('route')) {
        map.addSource('route', { type: 'geojson', data: toFeature([]) })
        map.addSource('travelled', { type: 'geojson', data: toFeature([]) })
        map.addLayer({
          id: 'route-casing',
          type: 'line',
          source: 'route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': c.casing, 'line-width': 11, 'line-opacity': 0.95 },
        })
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': c.route, 'line-width': 6 },
        })
        map.addLayer({
          id: 'route-travelled',
          type: 'line',
          source: 'travelled',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#9aa5ab', 'line-width': 6, 'line-dasharray': [0.6, 1.6] },
        })
      }
      if (route.current) (map.getSource('route') as GeoJSONSource).setData(toFeature(route.current.coordinates))
      setReady(true)
    })

    new maplibregl.Marker({ element: destinationMarkerElement('目的地'), anchor: 'center' }).setLngLat([destination.lng, destination.lat]).addTo(map)
    map.on('dragstart', () => onPanRef.current?.())

    return () => {
      clearTimeout(timer)
      if (anim.current) cancelAnimationFrame(anim.current.raf)
      map.remove()
      mapRef.current = null
      companionMarker.current = null
    }
    // the map is created once per destination
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination.lat, destination.lng])

  // --- routing --------------------------------------------------------------
  const requestRoute = async (from: LatLng) => {
    lastReroute.current = Date.now()
    const next = await geoService.route(from, destination)
    route.current = next
    onRouteRef.current?.(next)
    const map = mapRef.current
    const src = map?.getSource('route') as GeoJSONSource | undefined
    src?.setData(toFeature(next.coordinates))
    if (map && !companion) {
      const bounds = new maplibregl.LngLatBounds()
      next.coordinates.forEach((p) => bounds.extend(p))
      map.fitBounds(bounds, { padding, duration: 900, maxZoom: 16 })
    }
  }

  useEffect(() => {
    if (!ready || route.current) return
    const from = companion ?? origin
    if (from) void requestRoute(from)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, origin, companion == null])

  // --- live position: glide the marker between fixes ------------------------
  useEffect(() => {
    const map = mapRef.current
    if (!map || !companion || !ready) return
    const target = { lat: companion.lat, lng: companion.lng }
    if (!companionMarker.current) {
      companionMarker.current = new maplibregl.Marker({ element: companionMarkerElement(name, avatarUrl), anchor: 'center' })
        .setLngLat([target.lng, target.lat])
        .addTo(map)
      shown.current = target
      const bounds = new maplibregl.LngLatBounds([target.lng, target.lat], [target.lng, target.lat]).extend([destination.lng, destination.lat])
      map.fitBounds(bounds, { padding, duration: 1000, maxZoom: 16 })
    }
    setMarkerHeading(companionMarker.current.getElement(), companion.heading)

    // Glide across (most of) the gap until the next fix is due — 5–10 s apart.
    const now = performance.now()
    const gap = lastFixAt.current ? now - lastFixAt.current : 1200
    lastFixAt.current = now
    const from = shown.current ?? target
    if (anim.current) cancelAnimationFrame(anim.current.raf)
    const duration = Math.min(Math.max(gap * 0.95, 700), 9000)
    const step = (t: number) => {
      const a = anim.current
      if (!a || !companionMarker.current) return
      const k = Math.min(1, (t - a.start) / a.duration)
      const e = a.duration > 3000 ? k : easeInOut(k)
      const p = { lat: a.from.lat + (a.to.lat - a.from.lat) * e, lng: a.from.lng + (a.to.lng - a.from.lng) * e }
      shown.current = p
      companionMarker.current.setLngLat([p.lng, p.lat])
      if (k < 1) a.raf = requestAnimationFrame(step)
    }
    anim.current = { raf: requestAnimationFrame(step), from, to: target, start: now, duration }

    // Grey out the part of the route already travelled; reroute when far off.
    if (route.current) {
      const { along, offRoute } = projectOntoRoute(route.current.coordinates, target)
      const travelled = sliceRoute(route.current.coordinates, along)
      ;(map.getSource('travelled') as GeoJSONSource | undefined)?.setData(toFeature(travelled.length > 1 ? travelled : []))
      if (offRoute > REROUTE_METERS && Date.now() - lastReroute.current > REROUTE_MIN_INTERVAL_MS) void requestRoute(target)
    } else if (Date.now() - lastReroute.current > 5000) {
      void requestRoute(target)
    }

    if (follow) map.easeTo({ center: [target.lng, target.lat], duration: Math.min(duration, 2500), padding })
    else keepBothInView(map, target)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companion, ready])

  /** Overview mode: reframe only when the companion or home drifts out of view. */
  const keepBothInView = (map: MLMap, p: LatLng) => {
    const { clientWidth: w, clientHeight: h } = map.getContainer()
    const inside = (q: LatLng) => {
      const pt = map.project([q.lng, q.lat])
      return pt.x > padding.left && pt.x < w - padding.right && pt.y > padding.top && pt.y < h - padding.bottom
    }
    if (inside(p) && inside(destination)) return
    const bounds = new maplibregl.LngLatBounds([p.lng, p.lat], [p.lng, p.lat]).extend([destination.lng, destination.lat])
    map.fitBounds(bounds, { padding, duration: 1200, maxZoom: 16 })
  }

  useEffect(() => {
    const map = mapRef.current
    if (!map || !shown.current) return
    if (follow) map.easeTo({ center: [shown.current.lng, shown.current.lat], zoom: Math.max(map.getZoom(), 15), duration: 800, padding })
    else keepBothInView(map, shown.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [follow, padding])

  return (
    <div className={cn('relative size-full', className)}>
      {offline && (
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundColor: PALETTE[tone].bg,
            backgroundImage:
              'linear-gradient(rgb(0 0 0 / 0.045) 2px, transparent 2px), linear-gradient(90deg, rgb(0 0 0 / 0.045) 2px, transparent 2px), linear-gradient(rgb(0 0 0 / 0.025) 1px, transparent 1px), linear-gradient(90deg, rgb(0 0 0 / 0.025) 1px, transparent 1px)',
            backgroundSize: '160px 160px, 160px 160px, 40px 40px, 40px 40px',
          }}
        />
      )}
      {/* maplibre-gl.css forces position:relative on the container, so size it by percentage */}
      <div ref={container} className="size-full" aria-label="即時位置地圖" role="region" />
      {offline && (
        <p className="absolute right-4 rounded-full bg-surface/95 px-4 py-2 text-sm font-bold text-ink-3 shadow-soft" style={{ top: padding.top - 30 }}>
          地圖圖資暫時無法載入，仍顯示路線與即時位置
        </p>
      )}
    </div>
  )
}
