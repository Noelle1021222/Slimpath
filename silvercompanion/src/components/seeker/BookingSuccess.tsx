import { CalendarCheck, Check } from 'lucide-react'
import { motion } from 'motion/react'
import { ServiceIcon } from '@/components/common/ServiceIcon'
import { Button } from '@/components/ui/button'
import { PAYMENT_METHOD_META, SERVICE_MAP } from '@/lib/constants'
import { formatDateLong, formatMoney, formatTimeRange, orderCode } from '@/lib/format'
import type { Order } from '@/types'

/** BookingSuccessModal content (spec 5.2 step 4) — also used after LINE Pay returns. */
export function BookingSuccess({
  order,
  providerName,
  onViewOrders,
  onClose,
  closeLabel = '完成',
}: {
  order: Order
  providerName?: string | null
  onViewOrders: () => void
  onClose: () => void
  closeLabel?: string
}) {
  const paid = order.payment_status === 'paid'
  return (
    <div className="py-4 text-center">
      <div className="relative mx-auto size-28">
        <motion.span
          className="absolute inset-0 rounded-full bg-success/15"
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: [0.4, 1.25, 1], opacity: [0, 1, 1] }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.span
          className="absolute inset-3 grid place-items-center rounded-full bg-success text-white shadow-[0_16px_40px_-12px_rgba(47,107,69,0.6)]"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.15 }}
        >
          <svg
            viewBox="0 0 24 24"
            className="size-12"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.45, duration: 0.45 }} />
          </svg>
        </motion.span>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <motion.span
            key={i}
            className="absolute top-1/2 left-1/2 size-2.5 rounded-full"
            style={{ background: ['#e9803f', '#f2b45a', '#2fb5a5', '#6f9a63', '#b5481b', '#7a65b0'][i] }}
            initial={{ x: 0, y: 0, opacity: 0 }}
            animate={{ x: Math.cos((i / 6) * Math.PI * 2) * 70, y: Math.sin((i / 6) * Math.PI * 2) * 70, opacity: [0, 1, 0] }}
            transition={{ delay: 0.4, duration: 0.9, ease: 'easeOut' }}
          />
        ))}
      </div>
      <h2 className="mt-6 text-[30px] leading-tight">{paid ? '付款成功，預約已送出！' : '預約已送出！'}</h2>
      <p className="mx-auto mt-2 max-w-sm text-lg text-ink-2">
        {providerName ? `已通知 ${providerName}，` : ''}接單後會立刻告訴您，也可以在「我的訂單」隨時查看。
      </p>
      <div className="mx-auto mt-7 max-w-sm rounded-3xl border border-line bg-surface-2 p-5 text-left">
        <div className="flex items-center gap-3">
          <ServiceIcon type={order.service_type} />
          <div>
            <p className="text-lg font-bold">{SERVICE_MAP[order.service_type].label}</p>
            <p className="text-[15px] text-ink-2">
              {formatDateLong(order.service_date)}・{formatTimeRange(order.start_time, order.end_time)}
            </p>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-y-2 border-t border-line pt-4 text-[15px]">
          <dt className="text-ink-3">訂單編號</dt>
          <dd className="text-right font-bold tabular">{orderCode(order.id)}</dd>
          <dt className="text-ink-3">付款方式</dt>
          <dd className="text-right font-bold">
            {PAYMENT_METHOD_META[order.payment_method].label}
            {paid ? '（已付款）' : order.payment_method === 'cash' ? '（服務後付現）' : ''}
          </dd>
          <dt className="text-ink-3">金額</dt>
          <dd className="text-right font-num text-xl font-bold">{formatMoney(order.total_amount)}</dd>
        </dl>
      </div>
      <div className="mx-auto mt-7 grid max-w-sm gap-3">
        <Button size="lg" onClick={onViewOrders}>
          <CalendarCheck /> 查看我的訂單
        </Button>
        <Button size="lg" variant="ghost" onClick={onClose}>
          <Check /> {closeLabel}
        </Button>
      </div>
    </div>
  )
}
