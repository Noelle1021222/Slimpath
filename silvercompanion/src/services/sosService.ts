import type { SosService } from './contracts'
import { demoBackend } from './demo/backend'
import { isDemo } from './env'
import { currentUserId, db, invokeFunction, unwrap } from './supabaseClient'

/**
 * Spec 5.3 — (1) record the GPS fix in sos_alerts, (2) the sos-notify edge
 * function texts the emergency contact a Google Maps link. The caller dials
 * 119 regardless of how these two steps go.
 */
const supabaseSos: SosService = {
  async trigger(input) {
    const user_id = await currentUserId()
    const alert = unwrap<{ id: string }>(
      await db()
        .from('sos_alerts')
        .insert({ user_id, lat: input.lat, lng: input.lng, accuracy_m: input.accuracy, location_source: input.source })
        .select('id')
        .single(),
    )
    try {
      const res = await invokeFunction<{ notified: boolean; contactName: string | null }>('sos-notify', { alertId: alert.id })
      return { alertId: alert.id, notified: res.notified, contactName: res.contactName }
    } catch {
      return { alertId: alert.id, notified: false, contactName: null }
    }
  },
}

export const sosService: SosService = isDemo ? demoBackend.sos : supabaseSos
