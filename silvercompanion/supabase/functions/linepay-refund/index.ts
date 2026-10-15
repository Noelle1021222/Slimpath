/**
 * POST /functions/v1/linepay-refund   { orderId, reason? }
 *
 * Cancels a LINE Pay–paid order (by the family, or declined by the companion)
 * and refunds the full amount. Only allowed before the companion sets off,
 * matching public.cancel_order().
 */
import { HttpError, json, readJson, requireUuid, serve } from '../_shared/http.ts'
import { describeReturnCode, linePayConfig, linePayPost } from '../_shared/linepay.ts'
import { adminClient, loadOrder, requireUser } from '../_shared/supabase.ts'

const ALREADY_REFUNDED = new Set(['1165'])

serve(async (req) => {
  const user = await requireUser(req)
  const body = await readJson<{ orderId: string; reason: string }>(req)
  const orderId = requireUuid(body.orderId, 'orderId')
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 200) : ''

  const order = await loadOrder(orderId)
  if (user.id !== order.seeker_id && user.id !== order.provider_id) {
    throw new HttpError(404, '找不到這筆訂單。', 'order_not_found')
  }
  if (order.payment_status === 'refunded') return json({ order, alreadyRefunded: true })
  if (order.payment_method !== 'linepay' || order.payment_status !== 'paid' || !order.linepay_transaction_id) {
    throw new HttpError(400, '這筆訂單不需要退款，可直接取消。', 'refund_not_needed')
  }
  if (order.order_status !== 'pending' && order.order_status !== 'accepted') {
    throw new HttpError(409, '陪伴者已出發或服務已開始，請直接聯絡客服處理。', 'invalid_status')
  }

  const res = await linePayPost(linePayConfig(), `/v3/payments/${order.linepay_transaction_id}/refund`, {})
  if (res.returnCode !== '0000' && !ALREADY_REFUNDED.has(res.returnCode)) {
    console.warn('linepay refund failed', order.id, res.returnCode, res.returnMessage)
    throw new HttpError(402, describeReturnCode(res.returnCode, res.returnMessage), `linepay_${res.returnCode}`)
  }

  const declined = user.id === order.provider_id && order.order_status === 'pending'
  const { data: updated, error } = await adminClient()
    .from('orders')
    .update({
      payment_status: 'refunded',
      order_status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: user.id,
      cancel_reason: reason || (declined ? '陪伴者該時段無法服務' : null),
    })
    .eq('id', order.id)
    .select('*')
    .single()
  if (error) throw new HttpError(500, '退款成功，但更新訂單失敗，請聯絡客服。', 'db_error')

  return json({ order: updated })
})
