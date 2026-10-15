import type { ProviderDetails } from '@/types'
import type { ProviderService } from './contracts'
import { demoBackend } from './demo/backend'
import { isDemo } from './env'
import { currentUserId, db, unwrap, unwrapMaybe } from './supabaseClient'

const supabaseProviders: ProviderService = {
  async search(f) {
    const rows = unwrap(
      await db().rpc('search_providers', {
        p_service: f.service ?? undefined,
        p_city: f.online ? undefined : (f.city ?? undefined),
        p_district: f.online ? undefined : (f.district ?? undefined),
        p_online: f.online || undefined,
        p_date: f.date ?? undefined,
        p_hour: f.date && f.hour != null ? f.hour : undefined,
        p_max_rate: f.maxRate,
      }),
    )
    return rows ?? []
  },
  async getPublic(id) {
    return unwrapMaybe(await db().from('provider_public').select('*').eq('provider_id', id).maybeSingle())
  },
  async reviews(id) {
    return unwrap(await db().from('provider_reviews').select('*').eq('provider_id', id).order('rated_at', { ascending: false }).limit(20))
  },
  async bookedSlots(id, from, to) {
    return unwrap(await db().rpc('get_booked_slots', { p_provider_id: id, p_from: from, p_to: to })) ?? []
  },
  async getMine() {
    const id = await currentUserId().catch(() => null)
    if (!id) return null
    return unwrapMaybe(await db().from('provider_details').select('*').eq('provider_id', id).maybeSingle())
  },
  async updateMine(patch) {
    const id = await currentUserId()
    return unwrap(await db().from('provider_details').update(patch).eq('provider_id', id).select('*').single()) as ProviderDetails
  },
  async stats() {
    const rows = unwrap(await db().rpc('get_provider_stats'))
    const row = rows?.[0]
    if (!row) throw new Error('找不到陪伴者資料。')
    return row
  },
  async withdrawals() {
    return unwrap(await db().from('withdrawals').select('*').order('created_at', { ascending: false }).limit(24))
  },
  async requestWithdrawal() {
    return unwrap(await db().rpc('request_withdrawal'))
  },
  async documents() {
    const id = await currentUserId()
    const { data, error } = await db()
      .storage.from('provider-documents')
      .list(id, { sortBy: { column: 'created_at', order: 'desc' } })
    if (error) throw error
    return (data ?? []).map((f) => {
      const [kind, ...rest] = f.name.split('__')
      return { name: rest.join('__') || f.name, kind: rest.length ? decodeURIComponent(kind) : '文件', path: `${id}/${f.name}`, uploadedAt: f.created_at ?? '' }
    })
  },
  async uploadDocument(file, kind) {
    const id = await currentUserId()
    const safe = file.name.replace(/[^\w.\-一-鿿]/g, '_')
    const path = `${id}/${encodeURIComponent(kind)}__${Date.now()}-${safe}`
    const { error } = await db()
      .storage.from('provider-documents')
      .upload(path, file, { contentType: file.type || undefined })
    if (error) throw error
  },
}

export const providerService: ProviderService = isDemo ? demoBackend.providers : supabaseProviders
