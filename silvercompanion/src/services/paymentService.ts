import type { Order } from '@/types'
import type { PaymentService } from './contracts'
import { demoBackend } from './demo/backend'
import { appUrl, isDemo } from './env'
import { invokeFunction } from './supabaseClient'

/**
 * Spec 5.2 — the browser never sees the Channel Secret: both steps go through
 * Supabase Edge Functions, which read the amount from the database.
 */
const supabasePayments: PaymentService = {
  async requestLinePay(orderId) {
    const { paymentUrl } = await invokeFunction<{ paymentUrl: string }>('linepay-request', {
      orderId,
      returnUrl: appUrl('/payment/confirm'),
    })
    return { paymentUrl }
  },
  async confirmLinePay({ transactionId, orderId }) {
    const { order } = await invokeFunction<{ order: Order }>('linepay-confirm', { transactionId, orderId })
    return order
  },
}

export const paymentService: PaymentService = isDemo ? demoBackend.payments : supabasePayments

/** Step 5: hand the window over to LINE Pay. */
export async function startLinePayCheckout(orderId: string) {
  const { paymentUrl } = await paymentService.requestLinePay(orderId)
  window.location.href = paymentUrl
}
