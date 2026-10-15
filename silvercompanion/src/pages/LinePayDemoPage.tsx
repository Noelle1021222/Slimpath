import { FlaskConical, Lock, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { ServiceIcon } from '@/components/common/ServiceIcon'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SERVICE_MAP } from '@/lib/constants'
import { formatDateLong, formatMoney, formatTimeRange, orderCode } from '@/lib/format'
import { isDemo, orderService } from '@/services'
import type { OrderDetails } from '@/types'

/**
 * Demo mode only: stands in for the LINE Pay authorisation page so the whole
 * Request → redirect → Confirm round-trip can be walked through without a
 * merchant account. Production never routes here.
 */
export default function LinePayDemoPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const transactionId = params.get('transactionId') ?? ''
  const orderRef = params.get('orderId') ?? ''
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = 'seeker'
    if (orderRef) void orderService.get(orderRef.slice(0, 36)).then(setOrder)
  }, [orderRef])

  if (!isDemo) return <Navigate to="/" replace />

  return (
    <div className="min-h-[100dvh] bg-[#eef1f0] px-5 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-5 flex items-center justify-center gap-2 rounded-full bg-warning-soft px-4 py-2 text-[15px] font-bold text-warning">
          <FlaskConical className="size-5" /> 示範模式・付款模擬器（不會實際扣款）
        </div>
        <div className="overflow-hidden rounded-[28px] bg-white shadow-lift">
          <div className="bg-[#1f2a2e] px-6 py-5 text-white">
            <p className="flex items-center gap-2 text-sm font-bold text-white/70">
              <Lock className="size-4" /> 第三方支付授權（模擬）
            </p>
            <p className="mt-1 text-lg font-bold">銀髮伴 SilverCompanion</p>
          </div>
          <div className="p-6">
            {!order ? (
              <Skeleton className="h-40" />
            ) : (
              <>
                <p className="text-sm font-bold text-ink-3">付款金額</p>
                <p className="font-num text-5xl font-semibold">{formatMoney(order.total_amount)}</p>
                <div className="mt-5 flex items-center gap-3 rounded-2xl bg-surface-2 p-4">
                  <ServiceIcon type={order.service_type} />
                  <div className="text-[15px]">
                    <p className="font-bold">
                      {SERVICE_MAP[order.service_type].label}・{order.provider_name}
                    </p>
                    <p className="text-ink-2">
                      {formatDateLong(order.service_date)} {formatTimeRange(order.start_time, order.end_time)}
                    </p>
                  </div>
                </div>
                <dl className="mt-5 space-y-1.5 text-[15px]">
                  <div className="flex justify-between">
                    <dt className="text-ink-3">訂單編號</dt>
                    <dd className="font-bold tabular">{orderCode(order.id)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-3">交易序號</dt>
                    <dd className="font-bold tabular">{transactionId}</dd>
                  </div>
                </dl>
              </>
            )}
            <div className="mt-7 grid gap-3">
              <Button
                size="lg"
                variant="line"
                loading={paying}
                disabled={!order}
                onClick={() => {
                  setPaying(true)
                  setTimeout(() => navigate(`/payment/confirm?${new URLSearchParams({ transactionId, orderId: orderRef })}`, { replace: true }), 900)
                }}
              >
                確認付款
              </Button>
              <Button
                size="lg"
                variant="ghost"
                disabled={paying}
                onClick={() => navigate(`/payment/confirm?${new URLSearchParams({ status: 'cancel', orderId: orderRef.slice(0, 36) })}`, { replace: true })}
              >
                取消付款
              </Button>
            </div>
            <p className="mt-5 flex items-start gap-2 text-sm leading-relaxed text-ink-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" />
              正式環境會導向 LINE Pay 官方頁面，由 Edge Function 以 HMAC-SHA256 簽章完成 Request / Confirm。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
