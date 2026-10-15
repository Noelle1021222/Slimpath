/**
 * Demo implementation of every service contract. Business rules mirror the
 * SQL in supabase/migrations (prepare_order, accept_order, submit_care_log,
 * request_withdrawal, notification triggers…) so the demo behaves exactly like
 * production, including its error messages.
 */
import type {
  AppNotification,
  CareLog,
  LatLng,
  CareLogDetails,
  Conversation,
  HealthLog,
  KinshipRecipient,
  Message,
  NotificationType,
  Order,
  OrderDetails,
  Profile,
  ProviderDetails,
  ProviderPublic,
  ProviderRequest,
  SessionUser,
  TrackingPoint,
} from '@/types'
import { SERVICE_MAP } from '@/lib/constants'
import { AppError } from '@/lib/errors'
import { estimateRoute } from '@/lib/geo'
import { compressImage, readAsDataUrl } from '@/lib/image'
import { computePrice, isValidRate } from '@/lib/pricing'
import { cityCenter, parseAddressArea } from '@/lib/taiwan'
import { currentMonth, hourLabel, hourOf, taipeiTimestamp } from '@/lib/time'
import type {
  AuthService,
  CareLogService,
  ChatService,
  HealthService,
  KinshipService,
  NotificationService,
  OrderService,
  PaymentService,
  ProfileService,
  ProviderService,
  SosService,
  TrackingService,
} from '../contracts'
import { appUrl } from '../env'
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from './seed'
import { startRouteSimulation } from './simulator'
import {
  announcePresence,
  commit,
  getSessionUserId,
  getState,
  isPresentElsewhere,
  latency,
  onDbChange,
  onTracking,
  publishTracking,
  setSessionUserId,
} from './store'

const now = () => new Date().toISOString()

function fail(message: string, code: string | null = null): never {
  throw new AppError(message, code)
}

function me(): string {
  const id = getSessionUserId()
  if (!id) fail('請先登入。', 'unauthorized')
  return id
}

function profileOf(id: string | null | undefined) {
  return id ? (getState().profiles.find((p) => p.id === id) ?? null) : null
}

function displayName(p: Pick<Profile, 'nickname' | 'full_name'> | null) {
  if (!p) return ''
  if (p.nickname?.trim()) return p.nickname
  return p.full_name.slice(0, 1) + '○'.repeat(Math.max(p.full_name.length - 1, 1))
}

function providerOf(id: string | null | undefined) {
  return id ? (getState().providers.find((p) => p.provider_id === id) ?? null) : null
}

function notify(userId: string | null, type: NotificationType, title: string, body: string | null, orderId: string | null = null) {
  if (!userId) return
  const s = getState()
  s.seq.notifications += 1
  const n: AppNotification = { id: s.seq.notifications, user_id: userId, type, title, body, order_id: orderId, is_read: false, created_at: now() }
  s.notifications.push(n)
}

const whenLabel = (o: Order) => `${Number(o.service_date.slice(5, 7))}/${Number(o.service_date.slice(8, 10))} ${o.start_time.slice(0, 5)}`

/** Mirrors private.notify_order_change(). */
function notifyOrderChange(before: Order | null, after: Order) {
  const seeker = displayName(profileOf(after.seeker_id))
  const provider = displayName(profileOf(after.provider_id))
  const service = SERVICE_MAP[after.service_type].label
  const when = whenLabel(after)
  if (!before) {
    if (after.provider_id && after.payment_method === 'cash')
      notify(after.provider_id, 'order_new', '新的預約請求', `${seeker} 預約了 ${when} 的${service}（現金付款）`, after.id)
    return
  }
  if (before.payment_status !== after.payment_status) {
    if (after.payment_status === 'paid' && after.payment_method !== 'cash' && after.provider_id && after.order_status === 'pending')
      notify(after.provider_id, 'order_paid', '新的預約請求（已付款）', `${seeker} 預約了 ${when} 的${service}，已完成 LINE Pay 付款。`, after.id)
    else if (after.payment_status === 'refunded')
      notify(after.seeker_id, 'order_refunded', '退款完成', `${when} 的${service}款項 $${after.total_amount} 已退回原付款方式。`, after.id)
  }
  if (before.order_status !== after.order_status) {
    switch (after.order_status) {
      case 'accepted':
        notify(after.seeker_id, 'order_accepted', `${provider} 已接受預約`, `${when} 的${service}已確認，可以在「我的訂單」查看細節。`, after.id)
        break
      case 'navigating':
        notify(after.seeker_id, 'order_navigating', `${provider} 正在前往`, '點擊首頁的即時位置，就能看到陪伴者離家還有多遠。', after.id)
        break
      case 'in_progress':
        notify(after.seeker_id, 'order_arrived', `${provider} 已抵達`, `${service}開始囉，服務結束後會收到數位聯絡簿。`, after.id)
        break
      case 'completed':
        notify(after.seeker_id, 'order_completed', '服務完成，聯絡簿已更新', `${provider} 寫下了今天的陪伴紀錄，也歡迎給予評價。`, after.id)
        break
      case 'cancelled':
        if (after.cancelled_by && after.cancelled_by === after.provider_id) {
          const declined = before.order_status === 'pending'
          notify(
            after.seeker_id,
            declined ? 'order_declined' : 'order_cancelled',
            declined ? `${provider} 無法接受這次預約` : `${provider} 取消了行程`,
            after.cancel_reason ?? `${when} 的${service}已取消。`,
            after.id,
          )
        } else if (
          after.provider_id &&
          (!after.cancelled_by || after.cancelled_by === after.seeker_id) &&
          (after.payment_method === 'cash' || before.payment_status === 'paid')
        ) {
          notify(after.provider_id, 'order_cancelled', '行程已取消', `${seeker} 取消了 ${when} 的${service}。`, after.id)
        }
        break
    }
  }
}

function updateOrder(order: Order, patch: Partial<Order>) {
  const before = { ...order }
  Object.assign(order, patch, { updated_at: now() })
  notifyOrderChange(before, order)
}

function findOrder(id: string) {
  const o = getState().orders.find((x) => x.id === id)
  if (!o) fail('找不到這筆訂單。', 'order_not_found')
  return o
}

function toDetails(o: Order): OrderDetails {
  const s = getState()
  const seeker = profileOf(o.seeker_id)
  const provider = profileOf(o.provider_id)
  const kin = s.kinship.find((k) => k.id === o.recipient_id)!
  const log = s.careLogs.find((c) => c.order_id === o.id) ?? null
  return {
    ...o,
    seeker_name: displayName(seeker),
    seeker_avatar_url: seeker?.avatar_url ?? null,
    provider_name: provider ? displayName(provider) : null,
    provider_avatar_url: provider?.avatar_url ?? null,
    recipient_name: kin.name,
    recipient_nickname: kin.nickname,
    recipient_age: kin.age,
    recipient_mobility: kin.mobility,
    recipient_chronic_diseases: kin.chronic_diseases,
    recipient_notes: kin.notes,
    care_log_id: log?.id ?? null,
    care_log_mood: log?.mood ?? null,
    seeker_rating: log?.seeker_rating ?? null,
  }
}

function toPublic(d: ProviderDetails): ProviderPublic {
  const p = profileOf(d.provider_id)!
  return {
    provider_id: d.provider_id,
    nickname: displayName(p),
    avatar_url: p.avatar_url,
    bio: d.bio,
    hourly_rate: d.hourly_rate,
    service_types: d.service_types,
    tags: d.tags,
    service_switch_is_online: d.service_switch_is_online,
    youtube_video_id: d.youtube_video_id,
    is_verified: d.is_verified,
    rating_avg: d.rating_avg,
    review_count: d.review_count,
    completed_orders: d.completed_orders,
    city: d.city,
    districts: d.districts,
    offers_online: d.offers_online,
    availability_slots: d.availability_slots,
    member_since: p.created_at,
  }
}

const overlaps = (a: Order, date: string, start: number, end: number) => a.service_date === date && hourOf(a.start_time) < end && hourOf(a.end_time) > start

function ensureProviderRow(id: string) {
  const s = getState()
  if (!s.providers.some((p) => p.provider_id === id)) {
    s.providers.push({
      provider_id: id,
      bio: null,
      hourly_rate: 350,
      service_types: ['chat'],
      tags: [],
      service_switch_is_online: false,
      youtube_video_id: null,
      is_verified: false,
      rating_avg: 5,
      review_count: 0,
      bank_code: null,
      bank_account: null,
      available_balance: 0,
      last_withdraw_month: null,
      availability_slots: {},
      city: null,
      districts: [],
      offers_online: false,
      completed_orders: 0,
      updated_at: now(),
    })
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
const authListeners = new Set<(user: SessionUser | null) => void>()

function sessionUser(): SessionUser | null {
  const id = getSessionUserId()
  if (!id) return null
  const u = getState().users.find((x) => x.id === id)
  if (!u) return null
  return { id: u.id, email: u.email, phone: u.phone, suggestedName: null, suggestedAvatar: null }
}

function signIn(id: string) {
  setSessionUserId(id)
  announcePresence(id)
  const user = sessionUser()
  authListeners.forEach((l) => l(user))
}

const auth: AuthService = {
  async getSessionUser() {
    return sessionUser()
  },
  onAuthChange(callback) {
    authListeners.add(callback)
    return () => {
      authListeners.delete(callback)
    }
  },
  async signInWithPassword(email, password) {
    await latency(300, 600)
    const u = getState().users.find((x) => x.email?.toLowerCase() === email.trim().toLowerCase())
    if (!u || u.password !== password) fail('Email 或密碼不正確。', 'invalid_credentials')
    signIn(u.id)
  },
  async signUpWithPassword(email, password) {
    await latency(300, 600)
    const s = getState()
    const normalized = email.trim().toLowerCase()
    if (s.users.some((x) => x.email === normalized)) fail('這個 Email 已經註冊過了，請直接登入。', 'user_exists')
    if (password.length < 8) fail('密碼至少需要 8 個字元。', 'weak_password')
    const id = crypto.randomUUID()
    s.users.push({ id, email: normalized, phone: null, password, createdAt: now() })
    commit('profiles')
    signIn(id)
    return { needsConfirmation: false }
  },
  async sendPhoneOtp() {
    await latency(400, 700)
  },
  async verifyPhoneOtp(phone, token) {
    await latency(300, 500)
    if (token !== '123456') fail('驗證碼不正確（Demo 模式請輸入 123456）。', 'invalid_otp')
    const s = getState()
    const digits = phone.replace(/\D/g, '')
    let u = s.users.find((x) => x.phone === digits)
    if (!u) {
      u = { id: crypto.randomUUID(), email: null, phone: digits, password: '', createdAt: now() }
      s.users.push(u)
      commit('profiles')
    }
    signIn(u.id)
  },
  async signInWithGoogle() {
    fail('Demo 模式未連接 Google。連上 Supabase 並啟用 Google Provider 後即可使用，現在可先用「快速體驗」。', 'oauth_unavailable')
  },
  async startLineLogin() {
    fail('Demo 模式未連接 LINE Login。設定 LINE Channel 後即可使用，現在可先用「快速體驗」。', 'oauth_unavailable')
  },
  async completeLineLogin() {
    fail('Demo 模式未連接 LINE Login。', 'oauth_unavailable')
  },
  async resetPassword() {
    await latency()
  },
  async signOut() {
    setSessionUserId(null)
    authListeners.forEach((l) => l(null))
  },
  async previewAs(role) {
    await latency(250, 450)
    signIn(role === 'seeker' ? DEMO_ACCOUNTS.seeker : DEMO_ACCOUNTS.provider)
  },
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------
const profiles: ProfileService = {
  async getMine() {
    const id = getSessionUserId()
    if (!id) return null
    return profileOf(id)
  },
  async create(input) {
    await latency()
    const id = me()
    const s = getState()
    if (s.profiles.some((p) => p.id === id)) fail('基本資料已經建立過了。', 'duplicate')
    const profile: Profile = {
      id,
      role: input.role,
      full_name: input.full_name.trim(),
      nickname: input.nickname?.trim() || null,
      phone: input.phone,
      avatar_url: null,
      emergency_contact_name: input.emergency_contact_name ?? null,
      emergency_contact_phone: input.emergency_contact_phone ?? null,
      created_at: now(),
      updated_at: now(),
    }
    s.profiles.push(profile)
    if (input.role === 'provider') ensureProviderRow(id)
    commit('profiles', 'providers')
    return profile
  },
  async update(patch) {
    await latency()
    const p = profileOf(me())
    if (!p) fail('找不到基本資料。')
    if (patch.full_name && patch.full_name !== p.full_name && providerOf(p.id)?.is_verified)
      fail('已完成實名認證，真實姓名無法自行修改，請聯絡客服。', 'full_name_locked')
    Object.assign(p, patch, { updated_at: now() })
    if (p.role === 'provider') ensureProviderRow(p.id)
    commit('profiles', 'providers')
    return p
  },
  async switchRole(role) {
    return profiles.update({ role })
  },
  async uploadAvatar(file) {
    const blob = await compressImage(file, 320, 0.85)
    const url = await readAsDataUrl(blob)
    await profiles.update({ avatar_url: url })
    return url
  },
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------
const providers: ProviderService = {
  async search(f) {
    await latency(150, 380)
    const s = getState()
    return s.providers
      .filter((d) => d.is_verified && d.service_switch_is_online)
      .filter((d) => !f.service || d.service_types.includes(f.service))
      .filter((d) => d.hourly_rate <= f.maxRate)
      .filter((d) => (f.online ? d.offers_online : (!f.city || d.city === f.city) && (!f.district || d.districts.includes(f.district))))
      .filter((d) => {
        if (!f.date) return true
        const open = d.availability_slots[f.date] ?? []
        if (!open.length) return false
        if (f.hour == null) return true
        if (!open.includes(hourLabel(f.hour))) return false
        return !s.orders.some((o) => o.provider_id === d.provider_id && o.order_status !== 'cancelled' && overlaps(o, f.date!, f.hour!, f.hour! + 1))
      })
      .map(toPublic)
      .sort((a, b) => b.rating_avg - a.rating_avg || b.review_count - a.review_count || a.hourly_rate - b.hourly_rate)
  },
  async getPublic(id) {
    await latency()
    const d = providerOf(id)
    if (!d || (!d.is_verified && d.provider_id !== getSessionUserId())) return null
    return toPublic(d)
  },
  async reviews(id) {
    await latency()
    const s = getState()
    return s.careLogs
      .filter((c) => c.seeker_rating != null)
      .map((c) => ({ c, o: s.orders.find((o) => o.id === c.order_id)! }))
      .filter(({ o }) => o.provider_id === id)
      .sort((a, b) => (b.c.rated_at ?? '').localeCompare(a.c.rated_at ?? ''))
      .map(({ c, o }) => ({
        id: c.id,
        provider_id: id,
        service_type: o.service_type,
        rating: c.seeker_rating!,
        tags: c.seeker_tags,
        comment: c.seeker_comment,
        rated_at: c.rated_at!,
        reviewer: `${profileOf(o.seeker_id)?.full_name.slice(0, 1) ?? ''}家屬`,
      }))
  },
  async bookedSlots(id, from, to) {
    await latency(80, 200)
    return getState()
      .orders.filter((o) => o.provider_id === id && o.order_status !== 'cancelled' && o.service_date >= from && o.service_date <= to)
      .map((o) => ({ service_date: o.service_date, start_time: o.start_time, end_time: o.end_time }))
  },
  async getMine() {
    const id = getSessionUserId()
    return id ? providerOf(id) : null
  },
  async updateMine(patch) {
    await latency()
    const d = providerOf(me())
    if (!d) fail('只有陪伴者可以設定。')
    if (patch.hourly_rate != null && !isValidRate(patch.hourly_rate)) fail('時薪需介於 $200 到 $1000，且以 $50 為單位。', 'invalid_rate')
    if (patch.service_types && patch.service_types.length === 0) fail('請至少選擇一項服務。', 'invalid_services')
    if (patch.service_switch_is_online && !d.is_verified) fail('完成實名與背景審核後才能上線接案。', 'provider_not_verified')
    if (patch.bank_code && !/^\d{3}$/.test(patch.bank_code)) fail('銀行代碼為 3 碼數字。', 'invalid_bank')
    if (patch.bank_account && !/^\d{6,16}$/.test(patch.bank_account)) fail('帳號需為 6–16 碼數字。', 'invalid_bank')
    Object.assign(d, patch, { updated_at: now() })
    commit('providers')
    return d
  },
  async stats() {
    await latency()
    const id = me()
    const s = getState()
    const d = providerOf(id)!
    const month = currentMonth()
    const mine = s.orders.filter((o) => o.provider_id === id)
    const doneThisMonth = mine.filter((o) => o.order_status === 'completed' && o.service_date.slice(0, 7) === month)
    return {
      month_hours: doneThisMonth.reduce((n, o) => n + o.hours, 0),
      month_orders: doneThisMonth.length,
      month_earning: doneThisMonth.reduce((n, o) => n + o.provider_earning, 0),
      total_orders: mine.filter((o) => ['accepted', 'navigating', 'in_progress', 'completed'].includes(o.order_status)).length + d.completed_orders,
      available_balance: d.available_balance,
      last_withdraw_month: d.last_withdraw_month,
      rating_avg: d.rating_avg,
      review_count: d.review_count,
    }
  },
  async withdrawals() {
    await latency()
    const id = me()
    return getState()
      .withdrawals.filter((w) => w.provider_id === id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  },
  async requestWithdrawal() {
    await latency(500, 900)
    const id = me()
    const s = getState()
    const d = providerOf(id)
    if (!d) fail('只有陪伴者可以申請提領。', 'forbidden')
    const month = currentMonth()
    if (!d.bank_code || !d.bank_account) fail('請先設定收款銀行帳戶。', 'bank_not_set')
    if (d.last_withdraw_month === month) fail('本月已經提領過了，下個月 1 日起可再次申請。', 'already_withdrawn')
    if (d.available_balance <= 0) fail('目前沒有可提領的餘額。', 'no_balance')
    const w = {
      id: crypto.randomUUID(),
      provider_id: id,
      amount: d.available_balance,
      month,
      bank_code: d.bank_code,
      bank_account: d.bank_account,
      account_name: profileOf(id)!.full_name,
      status: 'requested' as const,
      created_at: now(),
      processed_at: null,
    }
    s.withdrawals.push(w)
    d.available_balance = 0
    d.last_withdraw_month = month
    notify(id, 'withdrawal', '提領申請已送出', `$${w.amount} 將於 3–5 個工作天內匯入 ${w.bank_code} 帳戶末四碼 ${w.bank_account.slice(-4)}。`)
    commit('withdrawals', 'providers', 'notifications')
    return w
  },
  async documents() {
    await latency()
    const id = me()
    return getState()
      .documents.filter((d) => d.provider_id === id)
      .map((d) => ({ name: d.name, path: d.path, kind: d.kind, uploadedAt: d.uploaded_at }))
  },
  async uploadDocument(file, kind) {
    await latency(600, 1000)
    const id = me()
    getState().documents.push({ provider_id: id, name: file.name, kind, path: `${id}/${crypto.randomUUID()}-${file.name}`, uploaded_at: now() })
    commit('documents')
  },
}

/** Demo-only: fast-forward the platform's background check. */
export async function demoApproveVerification() {
  await latency(500, 800)
  const d = providerOf(me())
  if (!d) return
  d.is_verified = true
  notify(d.provider_id, 'system', '實名與背景審核通過', '恭喜！現在可以開啟「上線接案」，讓家屬找到您。')
  commit('providers', 'notifications')
}

// ---------------------------------------------------------------------------
// Family & health
// ---------------------------------------------------------------------------
const kinship: KinshipService = {
  async list() {
    await latency()
    const id = me()
    return getState()
      .kinship.filter((k) => k.seeker_id === id)
      .sort((a, b) => a.id - b.id)
  },
  async create(input) {
    await latency()
    const s = getState()
    s.seq.kinship += 1
    const fallback = cityCenter(parseAddressArea(input.address).city)
    const row: KinshipRecipient = {
      id: s.seq.kinship,
      seeker_id: me(),
      name: input.name.trim(),
      nickname: input.nickname?.trim() || null,
      age: input.age,
      mobility: input.mobility,
      chronic_diseases: input.chronic_diseases,
      notes: input.notes?.trim() || null,
      address: input.address.trim(),
      lat: input.lat ?? fallback?.lat ?? null,
      lng: input.lng ?? fallback?.lng ?? null,
      created_at: now(),
      updated_at: now(),
    }
    s.kinship.push(row)
    commit('kinship')
    return row
  },
  async update(id, input) {
    await latency()
    const row = getState().kinship.find((k) => k.id === id && k.seeker_id === me())
    if (!row) fail('找不到這位長輩。')
    Object.assign(row, { ...input, nickname: input.nickname?.trim() || null, notes: input.notes?.trim() || null, updated_at: now() })
    commit('kinship')
    return row
  },
  async remove(id) {
    await latency()
    const s = getState()
    if (s.orders.some((o) => o.recipient_id === id)) fail('這位長輩有服務紀錄，為保留聯絡簿與帳務資料無法刪除。', 'in_use')
    s.kinship = s.kinship.filter((k) => !(k.id === id && k.seeker_id === me()))
    s.health = s.health.filter((h) => h.recipient_id !== id)
    commit('kinship', 'health')
  },
}

const health: HealthService = {
  async list(recipientId, days = 14) {
    await latency(100, 250)
    const id = me()
    const since = Date.now() - days * 86_400_000
    return getState()
      .health.filter((h) => h.seeker_id === id && (recipientId == null || h.recipient_id === recipientId) && new Date(h.recorded_at).getTime() >= since)
      .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))
  },
  async add(input) {
    await latency(250, 500)
    const values = [input.bp_high, input.bp_low, input.heart_rate, input.temperature, input.steps, input.weight]
    if (values.every((v) => v == null)) fail('請至少填寫一項數據。', 'empty')
    if ((input.bp_high == null) !== (input.bp_low == null)) fail('血壓需要同時填寫收縮壓與舒張壓。', 'bp_pair')
    if (input.bp_high != null && input.bp_low != null && input.bp_high <= input.bp_low) fail('收縮壓應大於舒張壓。', 'bp_pair')
    const row: HealthLog = {
      id: crypto.randomUUID(),
      seeker_id: me(),
      recipient_id: input.recipient_id ?? null,
      bp_high: input.bp_high ?? null,
      bp_low: input.bp_low ?? null,
      heart_rate: input.heart_rate ?? null,
      temperature: input.temperature ?? null,
      steps: input.steps ?? null,
      weight: input.weight ?? null,
      source: input.source,
      recorded_at: input.recorded_at ?? now(),
      created_at: now(),
    }
    getState().health.push(row)
    commit('health')
    return row
  },
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
const orders: OrderService = {
  async listMine(role) {
    await latency()
    const id = me()
    return getState()
      .orders.filter((o) => (role === 'seeker' ? o.seeker_id === id : o.provider_id === id))
      .map(toDetails)
      .sort((a, b) => b.service_date.localeCompare(a.service_date) || b.start_time.localeCompare(a.start_time))
  },
  async get(id) {
    await latency(80, 200)
    const uid = me()
    const o = getState().orders.find((x) => x.id === id)
    return o && (o.seeker_id === uid || o.provider_id === uid) ? toDetails(o) : null
  },
  async create(input) {
    await latency(350, 650)
    const uid = me()
    const s = getState()
    const kin = s.kinship.find((k) => k.id === input.recipient_id && k.seeker_id === uid)
    if (!kin) fail('請先選擇要照顧的長輩。', 'recipient_required')
    const start = hourOf(input.start_time)
    const end = hourOf(input.end_time)
    const hours = end - start
    if (hours < 1 || hours > 12) fail('單次服務時數需介於 1 到 12 小時。', 'invalid_hours')
    if (input.payment_method === 'credit_card') fail('信用卡付款即將開放，請先選擇 LINE Pay 或現金。', 'payment_method_unavailable')
    if (taipeiTimestamp(input.service_date, input.start_time) <= Date.now()) fail('服務開始時間必須晚於現在。', 'start_in_past')

    let rate = input.hourly_rate ?? 350
    if (input.provider_id) {
      const d = providerOf(input.provider_id)
      if (!d) fail('找不到這位陪伴者。', 'provider_not_found')
      if (!d.is_verified || !d.service_switch_is_online) fail('這位陪伴者目前休息中，暫時無法預約。', 'provider_offline')
      if (!d.service_types.includes(input.service_type)) fail('這位陪伴者沒有提供此項服務。', 'service_not_offered')
      const open = new Set(d.availability_slots[input.service_date] ?? [])
      for (let h = start; h < end; h++) if (!open.has(hourLabel(h))) fail('所選時段不在陪伴者的可預約時間內。', 'slot_unavailable')
      if (s.orders.some((o) => o.provider_id === d.provider_id && o.order_status !== 'cancelled' && overlaps(o, input.service_date, start, end)))
        fail('這個時段剛剛被預約走了，請選擇其他時段。', 'schedule_conflict')
      rate = d.hourly_rate
    } else if (!isValidRate(rate)) {
      fail('公開需求的時薪預算需介於 $200 到 $1000，且以 $50 為單位。', 'invalid_budget')
    }

    const price = computePrice(rate, hours)
    const order: Order = {
      id: crypto.randomUUID(),
      seeker_id: uid,
      provider_id: input.provider_id,
      recipient_id: input.recipient_id,
      service_type: input.service_type,
      service_date: input.service_date,
      start_time: `${input.start_time.slice(0, 5)}:00`,
      end_time: `${input.end_time.slice(0, 5)}:00`,
      hours,
      location_address: input.location_address,
      location_lat: input.location_lat ?? kin.lat,
      location_lng: input.location_lng ?? kin.lng,
      is_online: input.is_online ?? false,
      notes: input.notes?.trim() || null,
      hourly_rate: rate,
      total_amount: price.total,
      platform_fee: price.platformFee,
      provider_earning: price.providerEarning,
      payment_method: input.payment_method,
      payment_status: 'unpaid',
      linepay_transaction_id: null,
      order_status: 'pending',
      cancel_reason: null,
      cancelled_by: null,
      paid_at: null,
      accepted_at: null,
      navigation_started_at: null,
      arrived_at: null,
      completed_at: null,
      cancelled_at: null,
      created_at: now(),
      updated_at: now(),
    }
    s.orders.push(order)
    notifyOrderChange(null, order)
    commit('orders', 'notifications')
    return order
  },
  async requests() {
    await latency()
    const uid = me()
    const s = getState()
    const mine = providerOf(uid)
    if (!mine) return []
    const nowMs = Date.now()
    return s.orders
      .filter((o) => o.order_status === 'pending' && (o.payment_method === 'cash' || o.payment_status === 'paid'))
      .filter((o) => taipeiTimestamp(o.service_date, o.end_time) > nowMs)
      .filter(
        (o) =>
          o.provider_id === uid ||
          (o.provider_id === null &&
            mine.is_verified &&
            mine.service_switch_is_online &&
            mine.service_types.includes(o.service_type) &&
            o.seeker_id !== uid &&
            !s.dismissals.some((x) => x.order_id === o.id && x.provider_id === uid)),
      )
      .sort(
        (a, b) =>
          Number(a.provider_id === null) - Number(b.provider_id === null) ||
          a.service_date.localeCompare(b.service_date) ||
          a.start_time.localeCompare(b.start_time),
      )
      .map((o): ProviderRequest => {
        const kin = s.kinship.find((k) => k.id === o.recipient_id)!
        const open = o.provider_id === null
        const area = parseAddressArea(o.location_address)
        return {
          order_id: o.id,
          is_open: open,
          seeker_name: displayName(profileOf(o.seeker_id)),
          service_type: o.service_type,
          service_date: o.service_date,
          start_time: o.start_time,
          end_time: o.end_time,
          hours: o.hours,
          hourly_rate: o.hourly_rate,
          total_amount: o.total_amount,
          provider_earning: o.provider_earning,
          payment_method: o.payment_method,
          payment_status: o.payment_status,
          is_online: o.is_online,
          notes: o.notes,
          area: area.city && area.district ? `${area.city}${area.district}` : o.location_address.slice(0, 6),
          location_address: open ? null : o.location_address,
          approx_lat: o.location_lat == null ? null : open ? Math.round(o.location_lat * 100) / 100 : o.location_lat,
          approx_lng: o.location_lng == null ? null : open ? Math.round(o.location_lng * 100) / 100 : o.location_lng,
          recipient_name: kin.nickname ?? `${kin.name.slice(0, 1)}長輩`,
          recipient_age: kin.age,
          recipient_mobility: kin.mobility,
          recipient_chronic_diseases: kin.chronic_diseases,
          created_at: o.created_at,
        }
      })
  },
  async accept(id) {
    await latency(400, 700)
    const uid = me()
    const s = getState()
    const o = findOrder(id)
    if (o.order_status !== 'pending') fail('這筆訂單已經無法接單了。', 'invalid_status')
    if (o.payment_method === 'linepay' && o.payment_status !== 'paid') fail('案主尚未完成付款。', 'unpaid')
    const mine = providerOf(uid)
    if (!mine?.is_verified) fail('完成實名與背景審核後才能接單。', 'provider_not_verified')
    if (o.provider_id === null) {
      if (!mine.service_switch_is_online) fail('請先開啟「上線接案」。', 'provider_offline')
      if (!mine.service_types.includes(o.service_type)) fail('您沒有提供這項服務。', 'service_not_offered')
      if (o.seeker_id === uid) fail('不能接自己發布的需求。')
    } else if (o.provider_id !== uid) fail('這筆訂單不是指派給您的。', 'forbidden')
    if (
      s.orders.some(
        (x) =>
          x.id !== o.id && x.provider_id === uid && x.order_status !== 'cancelled' && overlaps(x, o.service_date, hourOf(o.start_time), hourOf(o.end_time)),
      )
    )
      fail('您在這個時段已經有其他行程了。', 'schedule_conflict')
    updateOrder(o, { provider_id: uid, order_status: 'accepted', accepted_at: now() })
    commit('orders', 'notifications')
    return o
  },
  async decline(id, reason) {
    await latency(300, 600)
    const uid = me()
    const s = getState()
    const o = findOrder(id)
    if (o.order_status !== 'pending') fail('這筆訂單已經無法婉拒了。', 'invalid_status')
    if (o.provider_id === null) {
      s.dismissals.push({ order_id: id, provider_id: uid, created_at: now() })
      commit('dismissals')
      return
    }
    if (o.provider_id !== uid) fail('這筆訂單不是指派給您的。', 'forbidden')
    if (o.payment_status === 'paid' && o.payment_method !== 'cash') {
      // linepay-refund edge function
      updateOrder(o, {
        payment_status: 'refunded',
        order_status: 'cancelled',
        cancelled_at: now(),
        cancelled_by: uid,
        cancel_reason: reason?.trim() || '陪伴者該時段無法服務',
      })
    } else {
      updateOrder(o, { order_status: 'cancelled', cancelled_at: now(), cancelled_by: uid, cancel_reason: reason?.trim() || '陪伴者該時段無法服務' })
    }
    commit('orders', 'notifications')
  },
  async cancel(ref, reason) {
    await latency(400, 700)
    const uid = me()
    const o = findOrder(ref.id)
    if (o.seeker_id !== uid && o.provider_id !== uid) fail('找不到這筆訂單。', 'order_not_found')
    if (!['pending', 'accepted'].includes(o.order_status)) fail('陪伴者已出發或服務已開始，無法線上取消，請直接聯絡對方。', 'invalid_status')
    const refund = o.payment_method === 'linepay' && o.payment_status === 'paid'
    updateOrder(o, {
      order_status: 'cancelled',
      cancelled_at: now(),
      cancelled_by: uid,
      cancel_reason: reason?.trim() || null,
      ...(refund ? { payment_status: 'refunded' as const } : {}),
    })
    commit('orders', 'notifications')
  },
  async startNavigation(id) {
    await latency(300, 500)
    const o = findOrder(id)
    if (o.provider_id !== me()) fail('找不到這筆訂單。', 'order_not_found')
    if (o.order_status === 'navigating') return o
    if (o.order_status !== 'accepted') fail('只有已接單的行程可以開始導航。', 'invalid_status')
    if (Date.now() < taipeiTimestamp(o.service_date, o.start_time) - 6 * 3600_000) fail('服務開始前 6 小時內才能開始導航。', 'too_early')
    updateOrder(o, { order_status: 'navigating', navigation_started_at: now() })
    commit('orders', 'notifications')
    return o
  },
  async markArrived(id) {
    await latency(300, 500)
    const o = findOrder(id)
    if (o.provider_id !== me()) fail('找不到這筆訂單。', 'order_not_found')
    if (o.order_status === 'in_progress') return o
    if (!['accepted', 'navigating'].includes(o.order_status)) fail('目前的行程狀態無法開始服務。', 'invalid_status')
    updateOrder(o, { order_status: 'in_progress', arrived_at: now() })
    commit('orders', 'notifications')
    return o
  },
  async contact(id) {
    await latency(80, 160)
    const uid = me()
    const o = getState().orders.find((x) => x.id === id)
    if (!o || (o.seeker_id !== uid && o.provider_id !== uid) || !['accepted', 'navigating', 'in_progress'].includes(o.order_status)) return null
    const other = profileOf(o.seeker_id === uid ? o.provider_id : o.seeker_id)
    return other ? { user_id: other.id, display_name: displayName(other), phone: other.phone, avatar_url: other.avatar_url } : null
  },
  subscribe(_userId, onChange) {
    return onDbChange((tables) => {
      if (tables.includes('orders') || tables.includes('careLogs')) onChange({})
    })
  },
}

// ---------------------------------------------------------------------------
// Payments (LINE Pay simulation)
// ---------------------------------------------------------------------------
const payments: PaymentService = {
  async requestLinePay(orderId) {
    await latency(500, 900)
    const o = findOrder(orderId)
    if (o.seeker_id !== me()) fail('找不到這筆訂單。', 'order_not_found')
    if (o.payment_status === 'paid') fail('這筆訂單已經付款完成。', 'already_paid')
    if (o.order_status !== 'pending') fail('訂單狀態已變更，無法付款。', 'invalid_status')
    const tx = `${Date.now()}${Math.floor(Math.random() * 1e6)
      .toString()
      .padStart(6, '0')}`.slice(0, 19)
    o.linepay_transaction_id = tx
    commit('orders')
    const params = new URLSearchParams({ transactionId: tx, orderId: `${o.id}-${Date.now().toString(36)}` })
    return { paymentUrl: appUrl(`/payment/linepay-demo?${params}`) }
  },
  async confirmLinePay({ transactionId, orderId }) {
    await latency(900, 1400)
    const o = getState().orders.find((x) => x.linepay_transaction_id === transactionId)
    if (!o || o.seeker_id !== me() || (orderId && orderId.slice(0, 36) !== o.id)) fail('找不到這筆付款對應的訂單。', 'order_not_found')
    if (o.payment_status === 'paid') return o
    if (o.order_status === 'cancelled') fail('訂單已取消，款項不會被扣除。', 'order_cancelled')
    updateOrder(o, { payment_status: 'paid', paid_at: now() })
    commit('orders', 'notifications')
    return o
  },
}

// ---------------------------------------------------------------------------
// Care logs
// ---------------------------------------------------------------------------
function toCareLogDetails(c: CareLog): CareLogDetails | null {
  const s = getState()
  const o = s.orders.find((x) => x.id === c.order_id)
  if (!o || !o.provider_id) return null
  const p = profileOf(o.provider_id)
  const kin = s.kinship.find((k) => k.id === o.recipient_id)!
  return {
    ...c,
    seeker_id: o.seeker_id,
    provider_id: o.provider_id,
    service_type: o.service_type,
    service_date: o.service_date,
    start_time: o.start_time,
    end_time: o.end_time,
    recipient_id: o.recipient_id,
    provider_name: displayName(p),
    provider_avatar_url: p?.avatar_url ?? null,
    recipient_name: kin.name,
    recipient_nickname: kin.nickname,
  }
}

const careLogs: CareLogService = {
  async list() {
    await latency()
    const uid = me()
    return getState()
      .careLogs.map(toCareLogDetails)
      .filter((c): c is CareLogDetails => !!c && (c.seeker_id === uid || c.provider_id === uid))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  },
  async forOrder(orderId) {
    const all = await careLogs.list()
    return all.find((c) => c.order_id === orderId) ?? null
  },
  async submit(input) {
    const uid = me()
    const s = getState()
    const o = findOrder(input.order_id)
    if (o.provider_id !== uid) fail('找不到這筆訂單。', 'order_not_found')
    if (o.order_status !== 'in_progress') fail('服務開始後才能填寫聯絡簿。', 'invalid_status')
    if (!input.message.trim()) fail('請寫下今天的陪伴紀錄。', 'empty')
    const paths: string[] = []
    for (const file of input.photos.slice(0, 9)) {
      const blob = await compressImage(file, 1024, 0.72)
      const path = `${o.id}/${crypto.randomUUID()}.jpg`
      s.photos[path] = await readAsDataUrl(blob)
      paths.push(path)
    }
    await latency(500, 900)
    const log = {
      id: crypto.randomUUID(),
      order_id: o.id,
      mood: input.mood,
      message: input.message.trim(),
      photos: paths,
      seeker_rating: null,
      seeker_tags: [],
      seeker_comment: null,
      rated_at: null,
      created_at: now(),
    }
    s.careLogs.push(log)
    const cash = o.payment_method === 'cash'
    updateOrder(o, { order_status: 'completed', completed_at: now(), ...(cash ? { payment_status: 'paid' as const, paid_at: now() } : {}) })
    const d = providerOf(uid)!
    d.available_balance += cash ? -o.platform_fee : o.provider_earning
    d.completed_orders += 1
    commit('careLogs', 'orders', 'providers', 'notifications')
    return log
  },
  async rate({ order_id, rating, tags, comment }) {
    await latency(400, 700)
    const s = getState()
    const o = findOrder(order_id)
    if (o.seeker_id !== me() || o.order_status !== 'completed') fail('只有完成的服務可以評價。', 'forbidden')
    const log = s.careLogs.find((c) => c.order_id === order_id)
    if (!log) fail('這筆服務還沒有聯絡簿。')
    if (log.seeker_rating != null) fail('這筆服務已經評價過了。', 'already_rated')
    if (rating < 1 || rating > 5) fail('請先選擇星等。', 'rating_required')
    Object.assign(log, { seeker_rating: rating, seeker_tags: tags, seeker_comment: comment?.trim() || null, rated_at: now() })
    const d = providerOf(o.provider_id)
    if (d) {
      d.rating_avg = Math.round(((d.rating_avg * d.review_count + rating) / (d.review_count + 1)) * 100) / 100
      d.review_count += 1
      notify(d.provider_id, 'rating', `收到 ${rating} 顆星的評價`, comment?.trim() || '家屬留下了評價，謝謝您用心的陪伴。', order_id)
    }
    commit('careLogs', 'providers', 'notifications')
  },
  async photoUrls(paths) {
    const s = getState()
    const base = import.meta.env.BASE_URL
    return paths.map((p) => s.photos[p] ?? (p.endsWith('.svg') ? `${base}demo/${p.split('/').pop()}` : `${base}demo/placeholder.svg`))
  },
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------
function hasRelationship(a: string, b: string) {
  return getState().orders.some((o) => (o.seeker_id === a && o.provider_id === b) || (o.provider_id === a && o.seeker_id === b))
}

const AUTO_REPLIES: [RegExp, string][] = [
  [/謝/, '不客氣！能陪伴長輩是我的榮幸 😊'],
  [/幾點|多久|到了|到哪/, '我大概再 10 分鐘就到了，會先在樓下打電話給您。'],
  [/鑰匙|門/, '好的，我到了會依您說的方式進門，進門後傳訊息報平安。'],
  [/藥|醫/, '收到，我會特別注意用藥時間，看完診也會整理醫囑給您。'],
]

function scheduleAutoReply(from: string, to: string, content: string) {
  if (isPresentElsewhere(to)) return // a real person is playing that account in another tab
  const reply = AUTO_REPLIES.find(([re]) => re.test(content))?.[1] ?? '收到！有任何需要都可以隨時告訴我。'
  setTimeout(
    () => {
      const s = getState()
      s.seq.messages += 1
      s.messages.push({ id: s.seq.messages, sender_id: to, receiver_id: from, content: reply, is_read: false, created_at: now() })
      commit('messages')
    },
    2200 + Math.random() * 1800,
  )
}

const chat: ChatService = {
  async conversations() {
    await latency(100, 250)
    const uid = me()
    const s = getState()
    const partnerIds = new Set<string>()
    for (const o of s.orders) {
      if (o.provider_id === null) continue
      if (o.seeker_id === uid) partnerIds.add(o.provider_id)
      else if (o.provider_id === uid) partnerIds.add(o.seeker_id)
    }
    const rows: Conversation[] = [...partnerIds].map((pid) => {
      const p = profileOf(pid)!
      const thread = s.messages.filter((m) => (m.sender_id === uid && m.receiver_id === pid) || (m.sender_id === pid && m.receiver_id === uid))
      const last = thread.sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
      const active = s.orders
        .filter(
          (o) =>
            ((o.seeker_id === uid && o.provider_id === pid) || (o.provider_id === uid && o.seeker_id === pid)) &&
            ['pending', 'accepted', 'navigating', 'in_progress'].includes(o.order_status),
        )
        .sort((a, b) => a.service_date.localeCompare(b.service_date) || a.start_time.localeCompare(b.start_time))[0]
      return {
        partner_id: pid,
        partner_name: displayName(p),
        partner_avatar: p.avatar_url,
        partner_role: s.orders.some((o) => o.provider_id === pid && o.seeker_id === uid) ? 'provider' : 'seeker',
        last_message: last?.content ?? null,
        last_message_at: last?.created_at ?? null,
        last_sender_id: last?.sender_id ?? null,
        unread_count: thread.filter((m) => m.receiver_id === uid && !m.is_read).length,
        active_order_id: active?.id ?? null,
      }
    })
    return rows.sort((a, b) => (b.last_message_at ?? '').localeCompare(a.last_message_at ?? ''))
  },
  async thread(partnerId) {
    await latency(80, 180)
    const uid = me()
    return getState()
      .messages.filter((m) => (m.sender_id === uid && m.receiver_id === partnerId) || (m.sender_id === partnerId && m.receiver_id === uid))
      .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id)
  },
  async send(partnerId, content) {
    await latency(80, 160)
    const uid = me()
    const text = content.trim()
    if (!text) fail('請輸入訊息內容。')
    if (!hasRelationship(uid, partnerId)) fail('只能傳訊息給有預約關係的對象。', 'forbidden')
    const s = getState()
    s.seq.messages += 1
    const m: Message = { id: s.seq.messages, sender_id: uid, receiver_id: partnerId, content: text.slice(0, 2000), is_read: false, created_at: now() }
    s.messages.push(m)
    commit('messages')
    scheduleAutoReply(uid, partnerId, text)
    return m
  },
  async markRead(partnerId) {
    const uid = me()
    let changed = false
    for (const m of getState().messages) {
      if (m.receiver_id === uid && m.sender_id === partnerId && !m.is_read) {
        m.is_read = true
        changed = true
      }
    }
    if (changed) commit('messages')
  },
  subscribe(userId, onMessage) {
    let seen = Math.max(0, ...getState().messages.map((m) => m.id))
    return onDbChange((tables) => {
      if (!tables.includes('messages')) return
      const fresh = getState().messages.filter((m) => m.id > seen && (m.receiver_id === userId || m.sender_id === userId))
      seen = Math.max(seen, ...getState().messages.map((m) => m.id))
      fresh.forEach(onMessage)
    })
  },
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
const notifications: NotificationService = {
  async list() {
    await latency(80, 200)
    const uid = me()
    return getState()
      .notifications.filter((n) => n.user_id === uid)
      .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)
      .slice(0, 50)
  },
  async markRead(id) {
    const n = getState().notifications.find((x) => x.id === id && x.user_id === me())
    if (n && !n.is_read) {
      n.is_read = true
      commit('notifications')
    }
  },
  async markAllRead() {
    const uid = me()
    getState().notifications.forEach((n) => {
      if (n.user_id === uid) n.is_read = true
    })
    commit('notifications')
  },
  subscribe(userId, onNotification) {
    let seen = Math.max(0, ...getState().notifications.map((n) => n.id))
    return onDbChange((tables) => {
      if (!tables.includes('notifications')) return
      const fresh = getState().notifications.filter((n) => n.id > seen && n.user_id === userId)
      seen = Math.max(seen, ...getState().notifications.map((n) => n.id))
      fresh.forEach(onNotification)
    })
  },
}

// ---------------------------------------------------------------------------
// SOS
// ---------------------------------------------------------------------------
const sos: SosService = {
  async trigger(input) {
    await latency(300, 600)
    const uid = me()
    const s = getState()
    const p = profileOf(uid)
    const live = s.orders.find((o) => (o.seeker_id === uid || o.provider_id === uid) && ['accepted', 'navigating', 'in_progress'].includes(o.order_status))
    const alert = {
      id: crypto.randomUUID(),
      user_id: uid,
      lat: input.lat,
      lng: input.lng,
      accuracy_m: input.accuracy,
      location_source: input.source,
      order_id: live?.id ?? null,
      status: 'triggered' as const,
      notified_at: p?.emergency_contact_phone ? now() : null,
      notify_channel: p?.emergency_contact_phone ? 'demo' : null,
      notify_error: p?.emergency_contact_phone ? null : 'no_emergency_contact',
      resolved_at: null,
      created_at: now(),
    }
    s.sos.push(alert)
    if (live) {
      const other = live.seeker_id === uid ? live.provider_id : live.seeker_id
      notify(other, 'sos', `${displayName(p)} 按下了 SOS`, `請立即聯繫 ${p?.phone ?? ''}。位置：https://maps.google.com/?q=${input.lat},${input.lng}`, live.id)
    }
    commit('sos', 'notifications')
    return { alertId: alert.id, notified: Boolean(p?.emergency_contact_phone), contactName: p?.emergency_contact_name ?? null }
  },
}

// ---------------------------------------------------------------------------
// GPS tracking (BroadcastChannel + simulator)
// ---------------------------------------------------------------------------
/**
 * One shared stream per order: real points from a companion tab (via
 * BroadcastChannel) win; otherwise a single simulator feeds every listener,
 * so the home banner and the map always agree.
 */
interface DemoStream {
  listeners: Set<(point: TrackingPoint) => void>
  last: TrackingPoint | null
  lastRealAt: number
  stopSim: (() => void) | null
  kick: ReturnType<typeof setTimeout> | null
  offChannel: () => void
}
const streams = new Map<string, DemoStream>()

function startSimulation(orderId: string, stream: DemoStream, origin?: LatLng | null) {
  const o = getState().orders.find((x) => x.id === orderId)
  if (!o || o.location_lat == null || o.location_lng == null) return
  const destination = { lat: o.location_lat, lng: o.location_lng }
  const start = origin ?? (o.provider_id ? getState().homeBase[o.provider_id] : null) ?? { lat: destination.lat + 0.012, lng: destination.lng - 0.016 }
  stream.stopSim = startRouteSimulation({
    origin: start,
    destination,
    onPoint: (point) => {
      stream.last = point
      stream.listeners.forEach((l) => l(point))
    },
  })
}

const tracking: TrackingService = {
  publisher(orderId) {
    return {
      send: (point: TrackingPoint) => publishTracking(orderId, point),
      close: () => undefined,
    }
  },
  subscribe(orderId, onPoint, origin) {
    let stream = streams.get(orderId)
    if (!stream) {
      const created: DemoStream = { listeners: new Set(), last: null, lastRealAt: 0, stopSim: null, kick: null, offChannel: () => undefined }
      created.offChannel = onTracking(orderId, (point) => {
        created.lastRealAt = Date.now()
        if (created.stopSim) {
          created.stopSim()
          created.stopSim = null
        }
        created.last = point
        created.listeners.forEach((l) => l(point))
      })
      // No companion tab broadcasting? Bring a virtual one to life.
      created.kick = setTimeout(() => {
        if (Date.now() - created.lastRealAt > 4000 && !created.stopSim) startSimulation(orderId, created, origin)
      }, 1800)
      streams.set(orderId, created)
      stream = created
    }
    stream.listeners.add(onPoint)
    if (stream.last) onPoint(stream.last)
    const current = stream
    return () => {
      current.listeners.delete(onPoint)
      if (current.listeners.size === 0) {
        if (current.kick) clearTimeout(current.kick)
        current.stopSim?.()
        current.offChannel()
        streams.delete(orderId)
      }
    }
  },
}

/** Demo GPS source for the companion's own device. */
export function simulateCompanionGps(orderId: string, onPoint: (point: TrackingPoint) => void) {
  const s = getState()
  const o = s.orders.find((x) => x.id === orderId)
  if (!o || o.location_lat == null || o.location_lng == null) return () => undefined
  const destination = { lat: o.location_lat, lng: o.location_lng }
  const origin = (o.provider_id && s.homeBase[o.provider_id]) || { lat: destination.lat + 0.012, lng: destination.lng - 0.016 }
  return startRouteSimulation({ origin, destination, onPoint, startAt: 0.05 })
}

export function demoHomeBase(providerId: string | null | undefined) {
  return providerId ? (getState().homeBase[providerId] ?? null) : null
}

export function demoFallbackRoute(orderId: string) {
  const s = getState()
  const o = s.orders.find((x) => x.id === orderId)
  if (!o || o.location_lat == null || o.location_lng == null) return null
  const destination = { lat: o.location_lat, lng: o.location_lng }
  const origin = (o.provider_id && s.homeBase[o.provider_id]) || { lat: destination.lat + 0.012, lng: destination.lng - 0.016 }
  return estimateRoute(origin, destination)
}

export const demoBackend = {
  auth,
  profiles,
  providers,
  kinship,
  health,
  orders,
  payments,
  careLogs,
  chat,
  notifications,
  sos,
  tracking,
}

/** Keep other tabs aware that this account is being used. */
export function startPresenceHeartbeat() {
  const tick = () => {
    const id = getSessionUserId()
    if (id) announcePresence(id)
  }
  tick()
  const timer = setInterval(tick, 10_000)
  return () => clearInterval(timer)
}

export function demoCredentials() {
  return { seekerEmail: 'yijun@silvercompanion.test', providerEmail: 'xiaojun@silvercompanion.test', password: DEMO_PASSWORD }
}
