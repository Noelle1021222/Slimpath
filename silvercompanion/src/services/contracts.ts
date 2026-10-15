/**
 * Service contracts. Each one has a Supabase implementation (production) and a
 * demo implementation (services/demo) with identical behaviour, so pages never
 * need to know which backend they are talking to.
 */
import type {
  AppNotification,
  BookedSlot,
  CareLog,
  CareLogDetails,
  CareLogInput,
  Conversation,
  HealthLog,
  HealthLogInput,
  KinshipInput,
  KinshipRecipient,
  LatLng,
  Message,
  NewOrderInput,
  Order,
  OrderContact,
  OrderDetails,
  Profile,
  ProfileInput,
  ProviderDetails,
  ProviderPublic,
  ProviderRequest,
  ProviderReview,
  ProviderSettingsInput,
  ProviderStats,
  RatingInput,
  SearchFilters,
  SessionUser,
  SosLocationSource,
  TrackingPoint,
  UserRole,
  Withdrawal,
} from '@/types'

export interface AuthService {
  getSessionUser(): Promise<SessionUser | null>
  onAuthChange(callback: (user: SessionUser | null) => void): () => void
  signInWithPassword(email: string, password: string): Promise<void>
  signUpWithPassword(email: string, password: string): Promise<{ needsConfirmation: boolean }>
  sendPhoneOtp(phone: string): Promise<void>
  verifyPhoneOtp(phone: string, token: string): Promise<void>
  signInWithGoogle(): Promise<void>
  /** Redirects the browser to LINE. */
  startLineLogin(): Promise<void>
  completeLineLogin(params: { code: string; state: string }): Promise<void>
  resetPassword(email: string): Promise<void>
  signOut(): Promise<void>
  /** 快速預覽身分 — demo / staging only. */
  previewAs(role: UserRole): Promise<void>
}

export interface ProfileService {
  getMine(): Promise<Profile | null>
  create(input: ProfileInput): Promise<Profile>
  update(patch: Partial<ProfileInput> & { avatar_url?: string | null }): Promise<Profile>
  switchRole(role: UserRole): Promise<Profile>
  uploadAvatar(file: File): Promise<string>
}

export interface ProviderDocument {
  name: string
  path: string
  kind: string
  uploadedAt: string
}

export interface ProviderService {
  search(filters: SearchFilters): Promise<ProviderPublic[]>
  getPublic(id: string): Promise<ProviderPublic | null>
  reviews(id: string): Promise<ProviderReview[]>
  bookedSlots(id: string, from: string, to: string): Promise<BookedSlot[]>
  getMine(): Promise<ProviderDetails | null>
  updateMine(patch: ProviderSettingsInput): Promise<ProviderDetails>
  stats(): Promise<ProviderStats>
  withdrawals(): Promise<Withdrawal[]>
  requestWithdrawal(): Promise<Withdrawal>
  documents(): Promise<ProviderDocument[]>
  uploadDocument(file: File, kind: string): Promise<void>
}

export interface KinshipService {
  list(): Promise<KinshipRecipient[]>
  create(input: KinshipInput): Promise<KinshipRecipient>
  update(id: number, input: KinshipInput): Promise<KinshipRecipient>
  remove(id: number): Promise<void>
}

export interface HealthService {
  list(recipientId: number | null, days?: number): Promise<HealthLog[]>
  add(input: HealthLogInput): Promise<HealthLog>
}

export interface OrderService {
  listMine(role: UserRole): Promise<OrderDetails[]>
  get(id: string): Promise<OrderDetails | null>
  create(input: NewOrderInput): Promise<Order>
  requests(): Promise<ProviderRequest[]>
  accept(id: string): Promise<Order>
  decline(id: string, reason?: string): Promise<void>
  /** Cancels; paid LINE Pay orders are refunded through the edge function. */
  cancel(order: Pick<Order, 'id' | 'payment_method' | 'payment_status'>, reason?: string): Promise<void>
  startNavigation(id: string): Promise<Order>
  markArrived(id: string): Promise<Order>
  contact(id: string): Promise<OrderContact | null>
  /** Fires whenever one of my orders changes (Realtime postgres_changes). */
  subscribe(userId: string, onChange: (order: Partial<Order>) => void): () => void
}

export interface PaymentService {
  /** Creates the LINE Pay transaction and returns the URL to redirect to. */
  requestLinePay(orderId: string): Promise<{ paymentUrl: string }>
  confirmLinePay(params: { transactionId: string; orderId: string }): Promise<Order>
}

export interface CareLogService {
  list(): Promise<CareLogDetails[]>
  forOrder(orderId: string): Promise<CareLogDetails | null>
  submit(input: CareLogInput): Promise<CareLog>
  rate(input: RatingInput): Promise<void>
  photoUrls(paths: string[]): Promise<string[]>
}

export interface ChatService {
  conversations(): Promise<Conversation[]>
  thread(partnerId: string): Promise<Message[]>
  send(partnerId: string, content: string): Promise<Message>
  markRead(partnerId: string): Promise<void>
  subscribe(userId: string, onMessage: (message: Message) => void): () => void
}

export interface NotificationService {
  list(): Promise<AppNotification[]>
  markRead(id: number): Promise<void>
  markAllRead(): Promise<void>
  subscribe(userId: string, onNotification: (notification: AppNotification) => void): () => void
}

export interface SosTriggerInput {
  lat: number
  lng: number
  accuracy: number | null
  source: SosLocationSource
}

export interface SosResult {
  alertId: string | null
  notified: boolean
  contactName: string | null
}

export interface SosService {
  trigger(input: SosTriggerInput): Promise<SosResult>
}

export interface TrackingPublisher {
  send(point: TrackingPoint): void
  close(): void
}

export interface TrackingService {
  publisher(orderId: string): TrackingPublisher
  subscribe(orderId: string, onPoint: (point: TrackingPoint) => void, origin?: LatLng | null): () => void
}
