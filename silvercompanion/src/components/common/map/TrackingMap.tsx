import { lazy, Suspense } from 'react'
import { env } from '@/services'
import type { TrackingMapProps } from './types'

const Libre = lazy(() => import('./LibreTrackingMap'))
const GoogleMap = lazy(() => import('./GoogleTrackingMap'))

/** Google Maps when a key is configured, otherwise MapLibre + OpenStreetMap. */
export function TrackingMap(props: TrackingMapProps) {
  return <Suspense fallback={<div className="size-full skeleton" />}>{env.googleMapsKey ? <GoogleMap {...props} /> : <Libre {...props} />}</Suspense>
}
