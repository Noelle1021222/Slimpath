import { AlertCircle, CreditCard, RotateCcw, XCircle } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { LogoMark } from '@/components/common/Logo'
import { BookingSuccess } from '@/components/seeker/BookingSuccess'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { errorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/format'
import { orderService, paymentService, startLinePayCheckout } from '@/services'
import { useUserStore } from '@/store/useUserStore'
import type { Order, OrderDetails } from '@/types'
import { Splash } from './RootLayout'

type State = { kind: 'confirming' } | { kind: 'paid'; order: Order } | { kind: 'failed'; message: string } | { kind: 'cancelled'; order: OrderDetails | null }

/**
 * Spec 5.2 — LINE Pay redirects here with ?transactionId=…&orderId=…; we call
 * the linepay-confirm edge function exactly once (idempotent server-side too).
 */
export default function PaymentConfirmPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const status = useUserStore((s) => s.status)
  const confirm = useConfirm()
  const transactionId = params.get('transactionId')
  const orderId = params.get('orderId')
  const cancelled = params.get('status') === 'cancel'
  const [state, setState] = useState<State>(cancelled ? { kind: 'cancelled', order: null } : { kind: 'confirming' })
  const [busy, setBusy] = useState(false)
  const ran = useRef(false)

  useEffect(() => {
    document.documentElement.dataset.theme = 'seeker'
  }, [])

  useEffect(() => {
    if (status !== 'ready' || ran.current) return
    ran.current = true
    if (cancelled) {
      if (orderId) orderService.get(orderId.slice(0, 36)).then((order) => setState({ kind: 'cancelled', order }))
      return
    }
    if (!transactionId || !orderId) {
      setState({ kind: 'failed', message: '付款資訊不完整，請回到訂單重新付款。' })
      return
    }
    paymentService
      .confirmLinePay({ transactionId, orderId })
      .then((order) => setState({ kind: 'paid', order }))
      .catch((e) => setState({ kind: 'failed', message: errorMessage(e) }))
  }, [status, cancelled, transactionId, orderId])

  if (status === 'loading') return <Splash label="確認付款中" />
  if (status === 'signedOut')
    return (
      <Shell>
        <h1 className="text-3xl">請先登入</h1>
        <p className="mt-2 text-lg text-ink-2">登入後會自動完成付款確認。</p>
        <Button size="lg" className="mt-6" onClick={() => navigate(`/auth?next=${encodeURIComponent(`/payment/confirm?${params}`)}`)}>
          登入
        </Button>
      </Shell>
    )

  return (
    <Shell>
      {state.kind === 'confirming' && (
        <div className="py-8 text-center" role="status" aria-live="polite">
          <div className="relative mx-auto size-28">
            <motion.span
              className="absolute inset-0 rounded-full border-4 border-line-green/25 border-t-line-green"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
            />
            <span className="absolute inset-4 grid place-items-center rounded-full bg-[#e7f9ee] text-line-green">
              <CreditCard className="size-10" />
            </span>
          </div>
          <h1 className="mt-8 text-3xl">正在確認付款…</h1>
          <p className="mt-3 text-lg text-ink-2">正在向 LINE Pay 完成請款，請不要關閉這個畫面。</p>
        </div>
      )}
      {state.kind === 'paid' && (
        <BookingSuccess
          order={state.order}
          onViewOrders={() => navigate('/seeker/orders', { replace: true })}
          onClose={() => navigate('/seeker', { replace: true })}
          closeLabel="回首頁"
        />
      )}
      {state.kind === 'failed' && (
        <div className="py-6 text-center">
          <AlertCircle className="mx-auto size-16 text-danger" />
          <h1 className="mt-5 text-3xl">付款沒有完成</h1>
          <p className="mx-auto mt-3 max-w-sm text-lg text-ink-2">{state.message}</p>
          <p className="mt-2 text-base text-ink-3">若 LINE Pay 已扣款，系統會自動對帳；也可以聯絡客服協助。</p>
          <div className="mx-auto mt-8 grid max-w-sm gap-3">
            {orderId && (
              <Button
                size="lg"
                variant="line"
                loading={busy}
                onClick={async () => {
                  setBusy(true)
                  try {
                    await startLinePayCheckout(orderId.slice(0, 36))
                  } catch (e) {
                    toast.error(errorMessage(e))
                    setBusy(false)
                  }
                }}
              >
                <RotateCcw /> 重新付款
              </Button>
            )}
            <Button asChild size="lg" variant="secondary">
              <Link to="/seeker/orders">查看我的訂單</Link>
            </Button>
          </div>
        </div>
      )}
      {state.kind === 'cancelled' && (
        <div className="py-6 text-center">
          <XCircle className="mx-auto size-16 text-warning" />
          <h1 className="mt-5 text-3xl">付款已取消</h1>
          <p className="mx-auto mt-3 max-w-sm text-lg text-ink-2">
            預約還保留著{state.order ? `（${formatMoney(state.order.total_amount)}）` : ''}，30 分鐘內完成付款就能送出；逾時系統會自動釋出時段。
          </p>
          <div className="mx-auto mt-8 grid max-w-sm gap-3">
            {orderId && (
              <Button
                size="lg"
                variant="line"
                loading={busy}
                onClick={async () => {
                  setBusy(true)
                  try {
                    await startLinePayCheckout(orderId.slice(0, 36))
                  } catch (e) {
                    toast.error(errorMessage(e))
                    setBusy(false)
                  }
                }}
              >
                <RotateCcw /> 重新付款
              </Button>
            )}
            {state.order && state.order.order_status === 'pending' && (
              <Button
                size="lg"
                variant="secondary"
                onClick={async () => {
                  if (!(await confirm({ title: '取消這筆預約？', description: '時段會立刻釋出給其他家庭。', confirmText: '取消預約', tone: 'danger' }))) return
                  try {
                    await orderService.cancel(state.order!, '付款前取消')
                    toast.success('已取消預約')
                    navigate('/seeker/orders', { replace: true })
                  } catch (e) {
                    toast.error(errorMessage(e))
                  }
                }}
              >
                取消這筆預約
              </Button>
            )}
            <Button asChild size="lg" variant="ghost">
              <Link to="/seeker">回首頁</Link>
            </Button>
          </div>
        </div>
      )}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-bg px-5 py-10">
      <div className="w-full max-w-lg">
        <Link to="/seeker" className="mx-auto mb-8 flex w-fit items-center gap-2 text-ink-3" aria-label="銀髮伴首頁">
          <LogoMark className="size-9" />
        </Link>
        <div className="rounded-[32px] border border-line bg-surface p-6 shadow-lift md:p-10">{children}</div>
      </div>
    </div>
  )
}
