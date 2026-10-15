/**
 * POST /functions/v1/linepay-confirm   { transactionId, orderId }
 *
 * Spec 5.2 — Confirm API. Called by /payment/confirm after LINE Pay redirects
 * back. Idempotent: confirming twice (refresh, double tap) never charges twice.
 */
import { HttpError, json, postWebhook, readJson, serve } from '../_shared/http.ts'
import {
  ALREADY_CONFIRMED_CODES,
  describeReturnCode,
  linePayConfig,
  linePayGet,
  linePayPost,
  orderUuidFromLinePayOrderId,
  type PaymentDetailsInfo,
} from '../_shared/linepay.ts'
import { adminClient, type OrderRow, requireUser } from '../_shared/supabase.ts'

serve(async (req) => {
  const user = await requireUser(req)
  const body = await readJson<{ transactionId: string; orderId: string }>(req)
  const transactionId = String(body.transactionId ?? '')
  if (!/^\d{10,25}$/.test(transactionId)) throw new HttpError(400, 'transactionId 格式錯誤。', 'bad_request')

  const db = adminClient()
  const { data, error } = await db.from('orders').select('*').eq('linepay_transaction_id', transactionId).maybeSingle()
  if (error) throw new HttpError(500, '讀取訂單失敗。', 'db_error')
  const order = data as OrderRow | null
  const claimed = body.orderId ? orderUuidFromLinePayOrderId(String(body.orderId)) : null
  if (!order || order.seeker_id !== user.id || (claimed && claimed !== order.id)) {
    throw new HttpError(404, '找不到這筆付款對應的訂單。', 'order_not_found')
  }

  if (order.payment_status === 'paid') return json({ order, alreadyPaid: true })
  if (order.order_status === 'cancelled') throw new HttpError(409, '訂單已取消，款項不會被扣除。', 'order_cancelled')

  const config = linePayConfig()
  const res = await linePayPost(config, `/v3/payments/${transactionId}/confirm`, {
    amount: order.total_amount,
    currency: 'TWD',
  })

  let confirmed = res.returnCode === '0000'
  if (!confirmed && ALREADY_CONFIRMED_CODES.has(res.returnCode)) {
    // Our earlier confirm reached LINE Pay but the database update did not land.
    const details = await linePayGet<PaymentDetailsInfo[]>(config, '/v3/payments', { transactionId })
    confirmed = details.returnCode === '0000' && (details.info ?? []).some((t) => t.transactionId === transactionId && t.transactionType === 'PAYMENT')
  }
  if (!confirmed) {
    console.warn('linepay confirm failed', order.id, res.returnCode, res.returnMessage)
    throw new HttpError(402, describeReturnCode(res.returnCode, res.returnMessage), `linepay_${res.returnCode}`)
  }

  // The orders trigger notifies the companion in-app (spec 5.2 step 4).
  const { data: updated, error: updateError } = await db
    .from('orders')
    .update({ payment_status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', order.id)
    .eq('payment_status', 'unpaid')
    .select('*')
    .maybeSingle()
  if (updateError) throw new HttpError(500, '付款成功，但更新訂單失敗，請聯絡客服。', 'db_error')

  await postWebhook('order.paid', {
    orderId: order.id,
    providerId: order.provider_id,
    amount: order.total_amount,
    serviceDate: order.service_date,
  })

  return json({ order: updated ?? { ...order, payment_status: 'paid' } })
})
