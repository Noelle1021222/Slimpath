import type { HealthService } from './contracts'
import { demoBackend } from './demo/backend'
import { isDemo } from './env'
import { currentUserId, db, unwrap } from './supabaseClient'

const supabaseHealth: HealthService = {
  async list(recipientId, days = 14) {
    const since = new Date(Date.now() - days * 86_400_000).toISOString()
    let query = db().from('health_logs').select('*').gte('recorded_at', since).order('recorded_at', { ascending: false }).limit(200)
    if (recipientId != null) query = query.eq('recipient_id', recipientId)
    return unwrap(await query)
  },
  async add(input) {
    const seeker_id = await currentUserId()
    return unwrap(
      await db()
        .from('health_logs')
        .insert({ ...input, seeker_id })
        .select('*')
        .single(),
    )
  },
}

export const healthService: HealthService = isDemo ? demoBackend.health : supabaseHealth
