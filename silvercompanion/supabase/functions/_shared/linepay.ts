/**
 * LINE Pay Online API v3 client.
 * https://pay.line.me/documents/online_v3_en.html
 *
 * Every call is signed with
 *   Base64( HMAC-SHA256( ChannelSecret, ChannelSecret + URI + RequestBody + nonce ) )
 * (for GET requests the query string takes the place of the body). The channel
 * secret never leaves the edge function.
 */
import { HttpError } from './http.ts'

export interface LinePayConfig {
  channelId: string
  channelSecret: string
  baseUrl: string
  sandbox: boolean
}

export interface LinePayResponse<T> {
  returnCode: string
  returnMessage: string
  info?: T
}

export interface PaymentRequestInfo {
  paymentUrl: { web: string; app: string }
  transactionId: string
  paymentAccessToken: string
}

export interface PaymentDetailsInfo {
  transactionId: string
  transactionType: string
  payStatus?: string
  refundList?: { refundTransactionId: string; refundAmount: number }[]
}

export const SANDBOX_URL = 'https://sandbox-api-pay.line.me'
export const PRODUCTION_URL = 'https://api-pay.line.me'

export function linePayConfig(env: { get(key: string): string | undefined } = Deno.env): LinePayConfig {
  const channelId = env.get('LINEPAY_CHANNEL_ID')
  const channelSecret = env.get('LINEPAY_CHANNEL_SECRET')
  if (!channelId || !channelSecret) {
    throw new HttpError(503, 'LINE Pay 尚未完成設定，請改用其他付款方式。', 'linepay_not_configured')
  }
  const sandbox = (env.get('LINEPAY_IS_SANDBOX') ?? 'true').trim().toLowerCase() !== 'false'
  return { channelId, channelSecret, baseUrl: sandbox ? SANDBOX_URL : PRODUCTION_URL, sandbox }
}

const encoder = new TextEncoder()

export async function hmacBase64(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(message)))
  let binary = ''
  for (const byte of signature) binary += String.fromCharCode(byte)
  return btoa(binary)
}

export async function signedHeaders(
  config: LinePayConfig,
  uri: string,
  bodyOrQuery: string,
  nonce: string = crypto.randomUUID(),
): Promise<Record<string, string>> {
  const signature = await hmacBase64(config.channelSecret, config.channelSecret + uri + bodyOrQuery + nonce)
  return {
    'Content-Type': 'application/json',
    'X-LINE-ChannelId': config.channelId,
    'X-LINE-Authorization-Nonce': nonce,
    'X-LINE-Authorization': signature,
  }
}

/**
 * transactionId is a 19-digit integer — larger than Number.MAX_SAFE_INTEGER —
 * so it is quoted before JSON.parse to keep every digit.
 */
export function parseLinePayJson<T>(text: string): T {
  return JSON.parse(text.replace(/"(transactionId|refundTransactionId)"\s*:\s*(\d+)/g, '"$1":"$2"')) as T
}

type FetchLike = (input: string, init: RequestInit) => Promise<Response>

async function send<T>(config: LinePayConfig, uri: string, init: RequestInit, fetchImpl: FetchLike) {
  let res: Response
  try {
    res = await fetchImpl(config.baseUrl + uri, { ...init, signal: AbortSignal.timeout(20_000) })
  } catch (error) {
    console.error('LINE Pay unreachable', error)
    throw new HttpError(502, '暫時無法連線到 LINE Pay，請稍後再試。', 'linepay_unreachable')
  }
  const text = await res.text()
  try {
    return parseLinePayJson<LinePayResponse<T>>(text)
  } catch {
    console.error('LINE Pay non-JSON response', res.status, text.slice(0, 200))
    throw new HttpError(502, 'LINE Pay 回應異常，請稍後再試。', 'linepay_bad_response')
  }
}

export async function linePayPost<T>(config: LinePayConfig, uri: string, payload: unknown, fetchImpl: FetchLike = fetch): Promise<LinePayResponse<T>> {
  const body = JSON.stringify(payload)
  return send<T>(config, uri, { method: 'POST', headers: await signedHeaders(config, uri, body), body }, fetchImpl)
}

export async function linePayGet<T>(
  config: LinePayConfig,
  uri: string,
  query: Record<string, string>,
  fetchImpl: FetchLike = fetch,
): Promise<LinePayResponse<T>> {
  const qs = new URLSearchParams(query).toString()
  return send<T>(config, `${uri}?${qs}`, { method: 'GET', headers: await signedHeaders(config, uri, qs) }, fetchImpl)
}

export const SERVICE_LABELS: Record<string, string> = {
  chat: '傾聽陪伴',
  medical: '陪同就醫',
  walk: '外出散步',
  tech: '手機教學',
  read: '讀報唸書',
  clean: '居家整理',
  custom: '客製服務',
}

export interface PayableOrder {
  id: string
  service_type: string
  service_date: string
  start_time: string
  end_time: string
  hours: number
  hourly_rate: number
  total_amount: number
}

/** Request API body built only from database values (spec 5.2 step 3). */
export function buildRequestPayload(order: PayableOrder, urls: { confirmUrl: string; cancelUrl: string }, attempt: string = Date.now().toString(36)) {
  const label = SERVICE_LABELS[order.service_type] ?? '陪伴服務'
  const [, month, day] = order.service_date.split('-')
  const when = `${Number(month)}/${Number(day)} ${order.start_time.slice(0, 5)}–${order.end_time.slice(0, 5)}`
  return {
    amount: order.total_amount,
    currency: 'TWD',
    // Unique per attempt so a cancelled checkout can be retried (LINE Pay rejects reused ids).
    orderId: `${order.id}-${attempt}`,
    packages: [
      {
        id: order.id,
        amount: order.total_amount,
        name: '銀髮伴 陪伴服務',
        products: [
          {
            id: order.service_type,
            name: `${label}｜${when}（${order.hours} 小時）`,
            quantity: order.hours,
            price: order.hourly_rate,
          },
        ],
      },
    ],
    redirectUrls: urls,
    options: { payment: { capture: true }, display: { locale: 'zh_TW' } },
  }
}

/** First 36 chars of the LINE Pay orderId are our order UUID. */
export function orderUuidFromLinePayOrderId(orderId: string) {
  return orderId.slice(0, 36)
}

/** 1152 = a transaction with this transactionId already exists (confirmed before). */
export const ALREADY_CONFIRMED_CODES = new Set(['1152'])
/** 1198 = the same request is still being processed — safe to retry shortly. */
export const RETRYABLE_CODES = new Set(['1198', '1199', '9000'])

/** Friendly wording for the return codes a family is most likely to meet. */
export function describeReturnCode(code: string, fallback: string) {
  const messages: Record<string, string> = {
    '1101': '這個 LINE 帳號尚未開通 LINE Pay。',
    '1142': 'LINE Pay 餘額不足。',
    '1150': '找不到這筆付款紀錄，請重新付款。',
    '1153': '付款金額與訂單不符，請重新付款。',
    '1169': '付款尚未在 LINE Pay 完成授權。',
    '1172': '這筆訂單已經發起過付款，請重新整理。',
    '1180': '付款已逾時，請重新付款。',
    '1198': 'LINE Pay 正在處理中，請稍候再試。',
    '1281': '信用卡付款失敗，請改用其他卡片。',
    '1298': '信用卡被拒絕，請洽發卡銀行。',
  }
  return messages[code] ?? `LINE Pay：${fallback}（${code}）`
}
