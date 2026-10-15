/**
 * In-browser database for demo mode.
 *
 * · Tables live in localStorage, so every open tab shares one world.
 * · Writes are announced on a BroadcastChannel; other tabs reload and fire
 *   the same callbacks Supabase Realtime would (orders, messages, …).
 * · The session is per tab (sessionStorage): open one tab as the family and
 *   another as the companion to watch bookings, chat and GPS sync live.
 */
import type {
  AppNotification,
  CareLog,
  HealthLog,
  KinshipRecipient,
  LatLng,
  Message,
  Order,
  Profile,
  ProviderDetails,
  SosAlert,
  TrackingPoint,
  Withdrawal,
} from '@/types'
import { diffDays, todayISO } from '@/lib/time'
import { createDemoState, rebaseDemoState } from './seed'

export interface DemoUser {
  id: string
  email: string | null
  phone: string | null
  password: string
  createdAt: string
}

export interface DemoDocument {
  provider_id: string
  name: string
  kind: string
  path: string
  uploaded_at: string
}

export interface DemoState {
  version: number
  anchorDate: string
  users: DemoUser[]
  profiles: Profile[]
  providers: ProviderDetails[]
  kinship: KinshipRecipient[]
  health: HealthLog[]
  orders: Order[]
  careLogs: CareLog[]
  messages: Message[]
  notifications: AppNotification[]
  sos: SosAlert[]
  withdrawals: Withdrawal[]
  dismissals: { order_id: string; provider_id: string; created_at: string }[]
  documents: DemoDocument[]
  /** storage path → data URL for photos uploaded during the demo */
  photos: Record<string, string>
  /** where each companion sets off from (GPS simulation) */
  homeBase: Record<string, LatLng>
  /** weekday → opening hours, used to keep availability rolling forward */
  templates: Record<string, Record<number, number[]>>
  seq: { kinship: number; messages: number; notifications: number }
}

export type DemoTable =
  'profiles' | 'providers' | 'kinship' | 'health' | 'orders' | 'careLogs' | 'messages' | 'notifications' | 'sos' | 'withdrawals' | 'dismissals' | 'documents'

export const DEMO_VERSION = 3
const STORAGE_KEY = 'silvercompanion:demo-db'
const SESSION_KEY = 'silvercompanion:demo-session'
const CHANNEL_NAME = 'silvercompanion:demo'

type ChannelMessage =
  | { type: 'db'; tables: DemoTable[] }
  | { type: 'tracking'; orderId: string; point: TrackingPoint }
  | { type: 'presence'; userId: string; at: number }
  | { type: 'reset' }

let state: DemoState | null = null
let channel: BroadcastChannel | null = null
const dbListeners = new Set<(tables: DemoTable[]) => void>()
const trackingListeners = new Map<string, Set<(point: TrackingPoint) => void>>()
const presence = new Map<string, number>()

function safeStorage(kind: 'local' | 'session'): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

function load(): DemoState | null {
  const raw = safeStorage('local')?.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as DemoState
    return parsed.version === DEMO_VERSION ? parsed : null
  } catch {
    return null
  }
}

function persist() {
  if (!state) return
  const storage = safeStorage('local')
  if (!storage) return
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Quota exceeded — photos are the only large thing; keep the newest few.
    const entries = Object.entries(state.photos)
    state.photos = Object.fromEntries(entries.slice(-4))
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* give up silently; the in-memory copy still works for this tab */
    }
  }
}

function ensureChannel() {
  if (channel || typeof BroadcastChannel === 'undefined') return
  channel = new BroadcastChannel(CHANNEL_NAME)
  channel.onmessage = (event: MessageEvent<ChannelMessage>) => {
    const msg = event.data
    if (msg.type === 'db') {
      state = load() ?? state
      dbListeners.forEach((l) => l(msg.tables))
    } else if (msg.type === 'tracking') {
      trackingListeners.get(msg.orderId)?.forEach((l) => l(msg.point))
    } else if (msg.type === 'presence') {
      presence.set(msg.userId, msg.at)
    } else if (msg.type === 'reset') {
      state = load()
      dbListeners.forEach((l) => l(['profiles', 'orders', 'messages', 'notifications']))
    }
  }
}

export function getState(): DemoState {
  ensureChannel()
  if (!state) {
    state = load()
    if (!state) {
      state = createDemoState(new Date())
      persist()
    }
  }
  const today = todayISO()
  if (state.anchorDate !== today && diffDays(today, state.anchorDate) > 0) {
    state = rebaseDemoState(state, today)
    persist()
  }
  return state
}

/** Save and tell every tab (including this one) which tables changed. */
export function commit(...tables: DemoTable[]) {
  persist()
  dbListeners.forEach((l) => l(tables))
  channel?.postMessage({ type: 'db', tables } satisfies ChannelMessage)
}

export function onDbChange(listener: (tables: DemoTable[]) => void) {
  ensureChannel()
  dbListeners.add(listener)
  return () => {
    dbListeners.delete(listener)
  }
}

export function publishTracking(orderId: string, point: TrackingPoint) {
  ensureChannel()
  trackingListeners.get(orderId)?.forEach((l) => l(point))
  channel?.postMessage({ type: 'tracking', orderId, point } satisfies ChannelMessage)
}

export function onTracking(orderId: string, listener: (point: TrackingPoint) => void) {
  ensureChannel()
  const set = trackingListeners.get(orderId) ?? new Set()
  set.add(listener)
  trackingListeners.set(orderId, set)
  return () => {
    set.delete(listener)
  }
}

/** Lets other tabs know a real person is driving this account. */
export function announcePresence(userId: string) {
  ensureChannel()
  presence.set(userId, Date.now())
  channel?.postMessage({ type: 'presence', userId, at: Date.now() } satisfies ChannelMessage)
}

export function isPresentElsewhere(userId: string, withinMs = 25_000) {
  const at = presence.get(userId)
  return at != null && Date.now() - at < withinMs
}

export function resetDemo() {
  state = createDemoState(new Date())
  persist()
  channel?.postMessage({ type: 'reset' } satisfies ChannelMessage)
}

export function getSessionUserId(): string | null {
  return safeStorage('session')?.getItem(SESSION_KEY) ?? null
}

export function setSessionUserId(id: string | null) {
  const storage = safeStorage('session')
  if (!storage) return
  if (id) storage.setItem(SESSION_KEY, id)
  else storage.removeItem(SESSION_KEY)
}

/** Small, believable network delay so loading states are visible. */
export function latency(min = 120, max = 320) {
  return new Promise<void>((resolve) => setTimeout(resolve, min + Math.random() * (max - min)))
}
