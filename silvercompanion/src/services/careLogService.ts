import { compressImage } from '@/lib/image'
import type { CareLogService } from './contracts'
import { demoBackend } from './demo/backend'
import { isDemo } from './env'
import { db, unwrap, unwrapMaybe } from './supabaseClient'

const supabaseCareLogs: CareLogService = {
  async list() {
    return unwrap(await db().from('care_log_details').select('*').order('created_at', { ascending: false }).limit(60))
  },
  async forOrder(orderId) {
    return unwrapMaybe(await db().from('care_log_details').select('*').eq('order_id', orderId).maybeSingle())
  },
  async submit({ order_id, mood, message, photos }) {
    // Upload first (allowed only while the order is in progress), then one RPC
    // writes the log, completes the order and settles the balance atomically.
    const paths: string[] = []
    for (const file of photos.slice(0, 9)) {
      const blob = await compressImage(file)
      const path = `${order_id}/${crypto.randomUUID()}.jpg`
      const { error } = await db().storage.from('care-photos').upload(path, blob, { contentType: 'image/jpeg' })
      if (error) throw error
      paths.push(path)
    }
    return unwrap(await db().rpc('submit_care_log', { p_order_id: order_id, p_mood: mood, p_message: message, p_photos: paths }))
  },
  async rate({ order_id, rating, tags, comment }) {
    // care_logs_refresh_rating trigger updates the companion's average.
    const { error } = await db()
      .from('care_logs')
      .update({ seeker_rating: rating, seeker_tags: tags, seeker_comment: comment ?? null })
      .eq('order_id', order_id)
    if (error) throw error
  },
  async photoUrls(paths) {
    if (!paths.length) return []
    const { data, error } = await db()
      .storage.from('care-photos')
      .createSignedUrls(paths, 60 * 60)
    if (error) throw error
    return (data ?? []).map((d) => d.signedUrl ?? '')
  },
}

export const careLogService: CareLogService = isDemo ? demoBackend.careLogs : supabaseCareLogs
