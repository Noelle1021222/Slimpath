/**
 * SMS delivery for SOS alerts. Mitake (三竹簡訊, Taiwan) is preferred when
 * configured, Twilio otherwise. LINE Notify was retired on 2025-03-31, so it is
 * intentionally not used.
 */
export type SmsChannel = 'mitake' | 'twilio'

export interface SmsResult {
  ok: boolean
  channel: SmsChannel | null
  error: string | null
}

type Env = { get(key: string): string | undefined }
type FetchLike = (input: string, init: RequestInit) => Promise<Response>

/** 0912345678 → +886912345678 */
export function toE164(phone: string) {
  const digits = phone.replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) return digits
  if (digits.startsWith('886')) return `+${digits}`
  if (digits.startsWith('0')) return `+886${digits.slice(1)}`
  return `+${digits}`
}

/** +886912345678 → 0912345678 (Mitake expects local numbers) */
export function toLocal(phone: string) {
  const e164 = toE164(phone)
  return e164.startsWith('+886') ? `0${e164.slice(4)}` : e164.replace('+', '')
}

export async function sendSms(to: string, body: string, env: Env = Deno.env, fetchImpl: FetchLike = fetch): Promise<SmsResult> {
  const mitakeUser = env.get('MITAKE_USERNAME')
  const mitakePass = env.get('MITAKE_PASSWORD')
  if (mitakeUser && mitakePass) {
    try {
      const url = new URL(env.get('MITAKE_API_URL') ?? 'https://smsapi.mitake.com.tw/api/mtk/SmSend')
      url.searchParams.set('CharsetURL', 'UTF-8')
      const form = new URLSearchParams({ username: mitakeUser, password: mitakePass, dstaddr: toLocal(to), smbody: body })
      const res = await fetchImpl(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form,
        signal: AbortSignal.timeout(10_000),
      })
      const text = await res.text()
      // statuscode 0/1/2/4 = accepted for delivery
      const status = /statuscode=(\w)/.exec(text)?.[1]
      if (res.ok && status && ['0', '1', '2', '4'].includes(status)) return { ok: true, channel: 'mitake', error: null }
      return { ok: false, channel: 'mitake', error: `mitake status ${status ?? res.status}` }
    } catch (error) {
      return { ok: false, channel: 'mitake', error: String(error) }
    }
  }

  const sid = env.get('TWILIO_ACCOUNT_SID')
  const token = env.get('TWILIO_AUTH_TOKEN')
  const from = env.get('TWILIO_FROM')
  if (sid && token && from) {
    try {
      const form = new URLSearchParams({ To: toE164(to), Body: body })
      if (from.startsWith('MG')) form.set('MessagingServiceSid', from)
      else form.set('From', from)
      const res = await fetchImpl(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form,
        signal: AbortSignal.timeout(10_000),
      })
      if (res.ok) return { ok: true, channel: 'twilio', error: null }
      return { ok: false, channel: 'twilio', error: `twilio ${res.status}: ${(await res.text()).slice(0, 200)}` }
    } catch (error) {
      return { ok: false, channel: 'twilio', error: String(error) }
    }
  }

  return { ok: false, channel: null, error: 'no_sms_provider_configured' }
}

export function sosMessage(input: { name: string; phone: string; lat: number; lng: number; approximate: boolean; at: Date }) {
  const time = new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(input.at)
  const link = `https://maps.google.com/?q=${input.lat.toFixed(6)},${input.lng.toFixed(6)}`
  return `【銀髮伴緊急求助】${input.name} 於 ${time} 按下 SOS，可能需要協助。${input.approximate ? '約略' : ''}位置：${link} 請盡快聯繫 ${input.phone}，必要時撥打 119。`
}
