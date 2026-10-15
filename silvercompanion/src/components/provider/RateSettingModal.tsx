import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { RangeSlider } from '@/components/ui/range-slider'
import { ResponsiveModal } from '@/components/ui/responsive-modal'
import { useUpdateProvider } from '@/hooks/useProviderMutations'
import { formatMoney } from '@/lib/format'
import { computePrice, RATE_MAX, RATE_MIN, RATE_STEP } from '@/lib/pricing'
import type { ProviderDetails } from '@/types'

/** Spec 4.3.4 — large slider, $200–$1000 in $50 steps, with take-home preview. */
export function RateSettingModal({ open, onOpenChange, details }: { open: boolean; onOpenChange: (open: boolean) => void; details: ProviderDetails }) {
  const [rate, setRate] = useState(details.hourly_rate)
  const update = useUpdateProvider('時薪已更新，新預約會套用新費率')
  useEffect(() => {
    if (open) setRate(details.hourly_rate)
  }, [open, details.hourly_rate])
  const hour = computePrice(rate, 1)
  const visit = computePrice(rate, 3)

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="服務費率設定"
      description="已成立的訂單維持原價，新預約才會套用新費率。"
      footer={
        <Button
          size="lg"
          block
          disabled={rate === details.hourly_rate}
          loading={update.isPending}
          onClick={() => update.mutate({ hourly_rate: rate }, { onSuccess: () => onOpenChange(false) })}
        >
          儲存時薪 ${rate}
        </Button>
      }
    >
      <RangeSlider
        value={rate}
        onChange={setRate}
        min={RATE_MIN}
        max={RATE_MAX}
        step={RATE_STEP}
        label="基本時薪"
        format={(v) => `$${v}`}
        suffix=" / 小時"
        marks={[400, 600, 800]}
      />
      <dl className="mt-8 grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-surface-2 p-4">
          <dt className="text-sm font-bold text-ink-3">家屬每小時支付</dt>
          <dd className="mt-1 font-num text-3xl font-extrabold">{formatMoney(hour.total)}</dd>
        </div>
        <div className="rounded-3xl bg-primary-soft p-4 text-primary-ink">
          <dt className="text-sm font-bold">您每小時實拿</dt>
          <dd className="mt-1 font-num text-3xl font-extrabold">{formatMoney(hour.providerEarning)}</dd>
        </div>
      </dl>
      <p className="mt-4 text-[15px] leading-relaxed text-ink-2">
        以一次 3 小時的陪診計算，您可以拿到 <b className="text-ink">{formatMoney(visit.providerEarning)}</b>（平台服務費 15%：{formatMoney(visit.platformFee)}
        ）。
      </p>
    </ResponsiveModal>
  )
}
