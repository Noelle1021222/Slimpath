/**
 * POST /functions/v1/linepay-request   { orderId, returnUrl? }
 *
 * Spec 5.2 — Request API. Reads the amount from the database (never from the
 * client), signs the LINE Pay v3 request, stores the transactionId on the
 * order and hands the browser the LINE Pay payment page URL.
 */
import { HttpError, json, readJson, requireUuid, serve } from '../_shared/http.ts'
import { buildRequestPayload, describeReturnCode, linePayConfig, linePayPost, type PaymentRequestInfo } from '../_shared/linepay.ts'
import { resolveReturnUrl } from '../_shared/returnUrl.ts'
import { adminClient, loadOrder, requireUser } from '../_shared/supabase.ts'

serve(async (req) => {
  const user = await requireUser(req)
  const body = await readJson<{ orderId: string; returnUrl: string }>(req)
  const orderId = requireUuid(body.orderId, 'orderId')

  const order = await loadOrder(orderId)
  if (order.seeker_id !== user.id) throw new HttpError(404, '找不到這筆訂單。', 'order_not_found')
  if (order.payment_method !== 'linepay') throw new HttpError(400, '這筆訂單不是 LINE Pay 付款。', 'wrong_payment_method')
  if (order.payment_status === 'paid') throw new HttpError(409, '這筆訂單已經付款完成。', 'already_paid')
  if (order.order_status !== 'pending') throw new HttpError(409, '訂單狀態已變更，無法付款。', 'invalid_status')

  const confirmUrl = resolveReturnUrl(body.returnUrl)
  const cancelUrl = new URL(confirmUrl)
  cancelUrl.searchParams.set('status', 'cancel')
  cancelUrl.searchParams.set('orderId', order.id)

  const config = linePayConfig()
  const payload = buildRequestPayload(order, { confirmUrl: confirmUrl.toString(), cancelUrl: cancelUrl.toString() })
  const res = await linePayPost<PaymentRequestInfo>(config, '/v3/payments/request', payload)

  if (res.returnCode !== '0000' || !res.info) {
    console.warn('linepay request failed', order.id, res.returnCode, res.returnMessage)
    throw new HttpError(402, describeReturnCode(res.returnCode, res.returnMessage), `linepay_${res.returnCode}`)
  }

  const { error } = await adminClient()
    .from('orders')
    .update({ linepay_transaction_id: res.info.transactionId })
    .eq('id', order.id)
    .eq('payment_status', 'unpaid')
  if (error) throw new HttpError(500, '儲存付款資訊失敗，請重試。', 'db_error')

  return json({
    paymentUrl: res.info.paymentUrl.web,
    appUrl: res.info.paymentUrl.app,
    transactionId: res.info.transactionId,
    sandbox: config.sandbox,
  })
})
