import { assert, assertEquals, assertRejects } from 'jsr:@std/assert@1'
import { HttpError } from './http.ts'
import {
  buildRequestPayload,
  hmacBase64,
  linePayConfig,
  linePayGet,
  linePayPost,
  orderUuidFromLinePayOrderId,
  parseLinePayJson,
  PRODUCTION_URL,
  SANDBOX_URL,
  signedHeaders,
} from './linepay.ts'
import { resolveReturnUrl } from './returnUrl.ts'
import { sendSms, sosMessage, toE164, toLocal } from './sms.ts'

const env = (values: Record<string, string>) => ({ get: (k: string) => values[k] })
const config = { channelId: '1234567890', channelSecret: 'a917ab6a2367b536f8e5a6e2977e06f4', baseUrl: SANDBOX_URL, sandbox: true }
const NONCE = '3a7f1c1e-58a5-4f3c-9b8c-1f7c2b6c4d11'

Deno.test('HMAC-SHA256 signature matches the LINE Pay v3 formula (secret + uri + body + nonce)', async () => {
  // Reference values computed independently with Node's crypto.createHmac.
  const headers = await signedHeaders(config, '/v3/payments/request', '{"amount":100}', NONCE)
  assertEquals(headers['X-LINE-Authorization'], 'ev0AJgHS3pqOubQh8fObVwkIj0XBvh9htV6panBMdTs=')
  assertEquals(headers['X-LINE-ChannelId'], '1234567890')
  assertEquals(headers['X-LINE-Authorization-Nonce'], NONCE)
  assertEquals(
    await hmacBase64(config.channelSecret, `${config.channelSecret}/v3/paymentstransactionId=2026101400000000001${NONCE}`),
    '0levBsR4AFaZ9NgHCPxLsTNit19EokQ49OlTHQYDd3o=',
  )
})

Deno.test('19-digit transactionId survives JSON parsing', () => {
  const parsed = parseLinePayJson<{ info: { transactionId: string; refundTransactionId: string } }>(
    '{"returnCode":"0000","info":{"transactionId":2026101498765432123,"refundTransactionId": 2026101498765432199}}',
  )
  assertEquals(parsed.info.transactionId, '2026101498765432123')
  assertEquals(parsed.info.refundTransactionId, '2026101498765432199')
})

Deno.test('sandbox / production switch follows LINEPAY_IS_SANDBOX', () => {
  assertEquals(linePayConfig(env({ LINEPAY_CHANNEL_ID: 'a', LINEPAY_CHANNEL_SECRET: 'b' })).baseUrl, SANDBOX_URL)
  assertEquals(linePayConfig(env({ LINEPAY_CHANNEL_ID: 'a', LINEPAY_CHANNEL_SECRET: 'b', LINEPAY_IS_SANDBOX: 'false' })).baseUrl, PRODUCTION_URL)
  let threw = false
  try {
    linePayConfig(env({}))
  } catch (e) {
    threw = e instanceof HttpError && e.code === 'linepay_not_configured'
  }
  assert(threw)
})

Deno.test('request payload is built from database amounts and balances', () => {
  const order = {
    id: 'c3333333-0000-4000-8000-000000000001',
    service_type: 'medical',
    service_date: '2026-10-15',
    start_time: '14:00:00',
    end_time: '17:00:00',
    hours: 3,
    hourly_rate: 400,
    total_amount: 1200,
  }
  const payload = buildRequestPayload(order, { confirmUrl: 'https://x.tw/payment/confirm', cancelUrl: 'https://x.tw/c' }, 'k9')
  assertEquals(payload.amount, 1200)
  assertEquals(payload.currency, 'TWD')
  assertEquals(payload.orderId, `${order.id}-k9`)
  assertEquals(orderUuidFromLinePayOrderId(payload.orderId), order.id)
  const pkg = payload.packages[0]
  assertEquals(pkg.amount, payload.amount)
  assertEquals(
    pkg.products.reduce((sum, p) => sum + p.quantity * p.price, 0),
    pkg.amount,
  )
  assertEquals(pkg.products[0].name, '陪同就醫｜10/15 14:00–17:00（3 小時）')
})

Deno.test('linePayPost signs the exact body it sends', async () => {
  let captured: { url: string; init: RequestInit } | null = null
  const fakeFetch = (url: string, init: RequestInit) => {
    captured = { url, init }
    return Promise.resolve(new Response('{"returnCode":"0000","returnMessage":"OK","info":{"transactionId":2026101400000000001}}'))
  }
  const res = await linePayPost<{ transactionId: string }>(config, '/v3/payments/request', { amount: 100 }, fakeFetch)
  assertEquals(res.info?.transactionId, '2026101400000000001')
  assert(captured)
  const { url, init } = captured as { url: string; init: RequestInit }
  assertEquals(url, `${SANDBOX_URL}/v3/payments/request`)
  const headers = init.headers as Record<string, string>
  const expected = await hmacBase64(
    config.channelSecret,
    config.channelSecret + '/v3/payments/request' + String(init.body) + headers['X-LINE-Authorization-Nonce'],
  )
  assertEquals(headers['X-LINE-Authorization'], expected)
})

Deno.test('linePayGet signs the query string', async () => {
  let headers: Record<string, string> = {}
  let calledUrl = ''
  await linePayGet(config, '/v3/payments', { transactionId: '2026101400000000001' }, (url, init) => {
    calledUrl = url
    headers = init.headers as Record<string, string>
    return Promise.resolve(new Response('{"returnCode":"0000","returnMessage":"OK","info":[]}'))
  })
  assertEquals(calledUrl, `${SANDBOX_URL}/v3/payments?transactionId=2026101400000000001`)
  assertEquals(
    headers['X-LINE-Authorization'],
    await hmacBase64(config.channelSecret, config.channelSecret + '/v3/payments' + 'transactionId=2026101400000000001' + headers['X-LINE-Authorization-Nonce']),
  )
})

Deno.test('LINE Pay outages become friendly 502 errors', async () => {
  await assertRejects(
    () => linePayPost(config, '/v3/payments/request', {}, () => Promise.reject(new TypeError('network'))),
    HttpError,
    '暫時無法連線到 LINE Pay',
  )
  await assertRejects(
    () => linePayPost(config, '/v3/payments/request', {}, () => Promise.resolve(new Response('<html>502</html>'))),
    HttpError,
    'LINE Pay 回應異常',
  )
})

Deno.test('return URLs are restricted to trusted origins', () => {
  const e = env({ SITE_URL: 'https://silvercompanion.tw/app/', ALLOWED_ORIGINS: 'http://127.0.0.1:5174' })
  assertEquals(resolveReturnUrl(undefined, e).toString(), 'https://silvercompanion.tw/app/payment/confirm')
  assertEquals(resolveReturnUrl('http://127.0.0.1:5174/payment/confirm?x=1#y', e).toString(), 'http://127.0.0.1:5174/payment/confirm')
  let blocked = false
  try {
    resolveReturnUrl('https://evil.example/payment/confirm', e)
  } catch (err) {
    blocked = err instanceof HttpError && err.code === 'return_url_not_allowed'
  }
  assert(blocked)
})

Deno.test('phone numbers are normalised for each SMS gateway', () => {
  assertEquals(toE164('0912-345-678'), '+886912345678')
  assertEquals(toE164('+886912345678'), '+886912345678')
  assertEquals(toLocal('+886912345678'), '0912345678')
})

Deno.test('SOS text carries a map link and is marked approximate when needed', () => {
  const text = sosMessage({ name: '林秀英', phone: '0912345678', lat: 25.0375, lng: 121.5509, approximate: true, at: new Date('2026-10-14T06:05:00Z') })
  assert(text.includes('https://maps.google.com/?q=25.037500,121.550900'))
  assert(text.includes('約略位置'))
  assert(text.includes('14:05'))
})

Deno.test('SMS goes through Twilio when Mitake is not configured', async () => {
  let body = ''
  const result = await sendSms('0922111222', 'help', env({ TWILIO_ACCOUNT_SID: 'AC1', TWILIO_AUTH_TOKEN: 't', TWILIO_FROM: '+15550001111' }), (_url, init) => {
    body = String(init.body)
    return Promise.resolve(new Response('{}', { status: 201 }))
  })
  assertEquals(result, { ok: true, channel: 'twilio', error: null })
  assert(body.includes('To=%2B886922111222'))
})

Deno.test('SMS via Mitake parses its status code', async () => {
  const ok = await sendSms('0922111222', '求救', env({ MITAKE_USERNAME: 'u', MITAKE_PASSWORD: 'p' }), () =>
    Promise.resolve(new Response('[1]\nmsgid=123\nstatuscode=1\nAccountPoint=99')),
  )
  assertEquals(ok.ok, true)
  const fail = await sendSms('0922111222', '求救', env({ MITAKE_USERNAME: 'u', MITAKE_PASSWORD: 'p' }), () => Promise.resolve(new Response('statuscode=e')))
  assertEquals(fail.ok, false)
  assertEquals((await sendSms('0922111222', 'x', env({}))).error, 'no_sms_provider_configured')
})
