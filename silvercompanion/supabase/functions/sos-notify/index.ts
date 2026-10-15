/**
 * POST /functions/v1/sos-notify   { alertId }
 *
 * Spec 5.3 — after the app writes a row to sos_alerts it calls this function,
 * which texts the user's emergency contact a Google Maps link and alerts the
 * other side of any live booking in-app. The phone dials 119 in parallel, so
 * this function must never be the thing that blocks help.
 */
import { HttpError, json, postWebhook, readJson, requireUuid, serve } from '../_shared/http.ts'
import { sendSms, sosMessage } from '../_shared/sms.ts'
import { adminClient, requireUser } from '../_shared/supabase.ts'

serve(async (req) => {
  const user = await requireUser(req)
  const body = await readJson<{ alertId: string }>(req)
  const alertId = requireUuid(body.alertId, 'alertId')
  const db = adminClient()

  const { data: alert } = await db.from('sos_alerts').select('*').eq('id', alertId).eq('user_id', user.id).maybeSingle()
  if (!alert) throw new HttpError(404, '找不到這筆求助紀錄。', 'alert_not_found')

  const { data: profile } = await db
    .from('profiles')
    .select('full_name, nickname, phone, emergency_contact_name, emergency_contact_phone')
    .eq('id', user.id)
    .single()
  if (!profile) throw new HttpError(404, '找不到使用者資料。', 'profile_not_found')

  const name = profile.nickname ? `${profile.full_name}（${profile.nickname}）` : profile.full_name
  let sms = { ok: false, channel: null as string | null, error: 'no_emergency_contact' as string | null }
  if (profile.emergency_contact_phone) {
    sms = await sendSms(
      profile.emergency_contact_phone,
      sosMessage({
        name,
        phone: profile.phone,
        lat: alert.lat,
        lng: alert.lng,
        approximate: alert.location_source !== 'gps',
        at: new Date(alert.created_at),
      }),
    )
  }

  // Tell whoever is on a live booking with this user right now.
  const { data: live } = await db
    .from('orders')
    .select('id, seeker_id, provider_id')
    .or(`seeker_id.eq.${user.id},provider_id.eq.${user.id}`)
    .in('order_status', ['accepted', 'navigating', 'in_progress'])
    .order('service_date', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (live) {
    const other = live.seeker_id === user.id ? live.provider_id : live.seeker_id
    if (other) {
      await db.from('notifications').insert({
        user_id: other,
        type: 'sos',
        title: `${profile.nickname ?? profile.full_name} 按下了 SOS`,
        body: `請立即聯繫 ${profile.phone}。位置：https://maps.google.com/?q=${alert.lat},${alert.lng}`,
        order_id: live.id,
      })
    }
    if (!alert.order_id) await db.from('sos_alerts').update({ order_id: live.id }).eq('id', alert.id)
  }

  await db
    .from('sos_alerts')
    .update({
      notified_at: sms.ok ? new Date().toISOString() : null,
      notify_channel: sms.channel,
      notify_error: sms.ok ? null : sms.error,
    })
    .eq('id', alert.id)

  await postWebhook('sos.triggered', { alertId: alert.id, userId: user.id, lat: alert.lat, lng: alert.lng, smsDelivered: sms.ok })

  return json({
    notified: sms.ok,
    channel: sms.channel,
    contactName: profile.emergency_contact_name,
    reason: sms.ok ? null : sms.error,
  })
})
