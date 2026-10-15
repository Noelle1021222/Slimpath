import { create } from 'zustand'
import type { TrackingPoint } from '@/types'

export type TrackingStatus = 'idle' | 'locating' | 'live' | 'denied' | 'error'

/**
 * The companion's outgoing GPS session. It lives outside any screen so the
 * broadcast keeps running while they glance at chat or their schedule.
 */
interface TrackingState {
  orderId: string | null
  status: TrackingStatus
  lastPoint: TrackingPoint | null
  lastSentAt: number | null
  error: string | null
  /** demo mode: follow a simulated route instead of this device's GPS */
  simulate: boolean
  start: (orderId: string, simulate: boolean) => void
  stop: () => void
  report: (patch: Partial<Pick<TrackingState, 'status' | 'lastPoint' | 'lastSentAt' | 'error'>>) => void
  setSimulate: (simulate: boolean) => void
}

export const useTrackingStore = create<TrackingState>((set) => ({
  orderId: null,
  status: 'idle',
  lastPoint: null,
  lastSentAt: null,
  error: null,
  simulate: false,
  start: (orderId, simulate) => set({ orderId, simulate, status: 'locating', error: null, lastPoint: null, lastSentAt: null }),
  stop: () => set({ orderId: null, status: 'idle', lastPoint: null, lastSentAt: null, error: null }),
  report: (patch) => set(patch),
  setSimulate: (simulate) => set({ simulate }),
}))
