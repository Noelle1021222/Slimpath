import type { FunctionReturns, Tables, Views } from './database.types'

export type {
  AvailabilitySlots,
  Database,
  HealthSource,
  Json,
  Mobility,
  Mood,
  NotificationType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ServiceType,
  SosLocationSource,
  SosStatus,
  UserRole,
  WithdrawalStatus,
} from './database.types'

import type { Mobility, Mood, PaymentMethod, ServiceType, UserRole } from './database.types'

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------
export type Profile = Tables<'profiles'>
export type ProviderDetails = Tables<'provider_details'>
export type KinshipRecipient = Tables<'kinship_recipients'>
export type HealthLog = Tables<'health_logs'>
export type Order = Tables<'orders'>
export type CareLog = Tables<'care_logs'>
export type Message = Tables<'messages'>
export type SosAlert = Tables<'sos_alerts'>
export type Withdrawal = Tables<'withdrawals'>
export type AppNotification = Tables<'notifications'>

export type ProviderPublic = Views<'provider_public'>
export type ProviderReview = Views<'provider_reviews'>
export type OrderDetails = Views<'order_details'>
export type CareLogDetails = Views<'care_log_details'>

export type ProviderRequest = FunctionReturns<'get_provider_requests'>[number]
export type Conversation = FunctionReturns<'get_conversations'>[number]
export type ProviderStats = FunctionReturns<'get_provider_stats'>[number]
export type BookedSlot = FunctionReturns<'get_booked_slots'>[number]
export type OrderContact = FunctionReturns<'get_order_contact'>[number]

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------
export interface SessionUser {
  id: string
  email: string | null
  phone: string | null
  /** Name/avatar offered by Google / LINE, used to prefill onboarding. */
  suggestedName: string | null
  suggestedAvatar: string | null
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------
export interface ProfileInput {
  role: UserRole
  full_name: string
  nickname?: string | null
  phone: string
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
}

export interface ProviderSettingsInput {
  bio?: string | null
  hourly_rate?: number
  service_types?: ServiceType[]
  tags?: string[]
  service_switch_is_online?: boolean
  youtube_video_id?: string | null
  bank_code?: string | null
  bank_account?: string | null
  availability_slots?: Record<string, string[]>
  city?: string | null
  districts?: string[]
  offers_online?: boolean
}

export interface KinshipInput {
  name: string
  nickname?: string | null
  age: number
  mobility: Mobility
  chronic_diseases: string[]
  notes?: string | null
  address: string
  lat?: number | null
  lng?: number | null
}

export interface HealthLogInput {
  recipient_id?: number | null
  bp_high?: number | null
  bp_low?: number | null
  heart_rate?: number | null
  temperature?: number | null
  steps?: number | null
  weight?: number | null
  source: 'manual' | 'device'
  recorded_at?: string
}

export interface NewOrderInput {
  provider_id: string | null
  recipient_id: number
  service_type: ServiceType
  service_date: string
  /** "HH:00" */
  start_time: string
  /** "HH:00" (may be "24:00") */
  end_time: string
  location_address: string
  location_lat?: number | null
  location_lng?: number | null
  is_online?: boolean
  notes?: string | null
  payment_method: PaymentMethod
  /** Budget for open requests only; assigned orders use the companion's rate. */
  hourly_rate?: number
}

export interface CareLogInput {
  order_id: string
  mood: Mood
  message: string
  photos: File[]
}

export interface RatingInput {
  order_id: string
  rating: number
  tags: string[]
  comment?: string | null
}

export interface SearchFilters {
  service: ServiceType | null
  city: string | null
  district: string | null
  online: boolean
  date: string | null
  hour: number | null
  maxRate: number
}

// ---------------------------------------------------------------------------
// Realtime
// ---------------------------------------------------------------------------
export interface TrackingPoint {
  lat: number
  lng: number
  accuracy: number | null
  heading: number | null
  speed: number | null
  /** epoch ms */
  at: number
}

export interface LatLng {
  lat: number
  lng: number
}

export interface RouteResult {
  /** [lng, lat] pairs, GeoJSON order */
  coordinates: [number, number][]
  distanceMeters: number
  durationSeconds: number
  source: 'google' | 'osrm' | 'estimate'
}
