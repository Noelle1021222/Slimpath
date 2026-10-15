import { useQueryClient } from '@tanstack/react-query'
import { CalendarClock, Check, CircleAlert, Landmark, Wallet } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ResponsiveModal } from '@/components/ui/responsive-modal'
import { qk } from '@/hooks/queries'
import { bankName } from '@/lib/banks'
import { errorMessage } from '@/lib/errors'
import { formatMoney, formatMonthDay, maskAccount } from '@/lib/format'
import { getWithdrawState } from '@/lib/withdraw'
import { providerService } from '@/services'
import { useUserStore } from '@/store/useUserStore'
import type { ProviderDetails, Withdrawal } from '@/types'
import { BankSetupModal } from './BankSetupModal'

/**
 * Spec 4.3.1 — 提領防呆:
 *   1. a bank account under the verified legal name is required,
 *   2. at most once per calendar month,
 *   3. always the full balance.
 * The same rules run again inside public.request_withdrawal().
 */
export function WithdrawModal({ open, onOpenChange, details }: { open: boolean; onOpenChange: (open: boolean) => void; details: ProviderDetails }) {
  const fullName = useUserStore((s) => s.profile?.full_name ?? '')
  const client = useQueryClient()
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<Withdrawal | null>(null)
  const [bankOpen, setBankOpen] = useState(false)
  const state = getWithdrawState({
    bankCode: details.bank_code,
    bankAccount: details.bank_account,
    balance: details.available_balance,
    lastWithdrawMonth: details.last_withdraw_month,
  })

  useEffect(() => {
    if (open) {
      setAgree(false)
      setDone(null)
    }
  }, [open])

  const submit = async () => {
    setBusy(true)
    try {
      const w = await providerService.requestWithdrawal()
      setDone(w)
      await Promise.all([qk.myProvider, qk.stats, qk.withdrawals, qk.notifications].map((queryKey) => client.invalidateQueries({ queryKey })))
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <ResponsiveModal
        open={open}
        onOpenChange={onOpenChange}
        title={done ? '提領申請已送出' : '申請提領'}
        bare={!!done}
        locked={busy}
        footer={
          done ? (
            <Button size="lg" block onClick={() => onOpenChange(false)}>
              <Check /> 好的
            </Button>
          ) : state.blocker === 'bank_not_set' ? (
            <Button size="lg" block onClick={() => setBankOpen(true)}>
              <Landmark /> 設定收款帳戶
            </Button>
          ) : (
            <Button size="lg" block disabled={!state.canWithdraw || !agree} loading={busy} onClick={submit}>
              <Wallet /> 確認全額提領 {formatMoney(details.available_balance)}
            </Button>
          )
        }
      >
        {done ? (
          <div className="py-6 text-center">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 16 }}
              className="mx-auto grid size-24 place-items-center rounded-full bg-success text-white shadow-[0_16px_40px_-12px_rgba(47,107,69,0.6)]"
            >
              <Check className="size-12" strokeWidth={3} />
            </motion.span>
            <p className="mt-6 font-num text-5xl font-extrabold">{formatMoney(done.amount)}</p>
            <h2 className="mt-3 text-2xl">提領申請已送出</h2>
            <p className="mx-auto mt-2 max-w-xs text-lg text-ink-2">
              將於 3–5 個工作天內匯入 {bankName(done.bank_code)} {maskAccount(done.bank_account)}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-3xl bg-hero p-6 text-hero-ink">
              <p className="text-[15px] font-bold text-hero-ink/70">可提領餘額</p>
              <p className="mt-1 font-num text-5xl font-extrabold tracking-tight">{formatMoney(details.available_balance)}</p>
              <p className="mt-3 text-sm text-hero-ink/70">每月可提領一次，每次全額轉出。</p>
            </div>

            {state.blocker === 'already_withdrawn' && (
              <Notice icon={<CalendarClock />} tone="warning" title="本月已經提領過了">
                下次可提領日是 {state.nextOpenDate ? formatMonthDay(state.nextOpenDate) : '下個月 1 日'}，屆時會把累積的金額一次轉出。
              </Notice>
            )}
            {state.blocker === 'no_balance' && (
              <Notice icon={<CircleAlert />} tone="info" title="目前沒有可提領的金額">
                完成服務並填寫聯絡簿後，收入會自動入帳到這裡。
              </Notice>
            )}
            {state.blocker === 'bank_not_set' && (
              <Notice icon={<Landmark />} tone="warning" title="還沒有設定收款帳戶">
                請先設定戶名為「{fullName}」的銀行帳戶。
              </Notice>
            )}

            {details.bank_code && details.bank_account && (
              <div className="flex items-center gap-4 rounded-3xl border border-line p-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-surface-2">
                  <Landmark className="size-6 text-primary" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink-3">匯入帳戶</p>
                  <p className="truncate text-lg font-bold">
                    {bankName(details.bank_code)} {maskAccount(details.bank_account)}
                  </p>
                  <p className="text-sm text-ink-2">戶名：{fullName}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setBankOpen(true)}>
                  變更
                </Button>
              </div>
            )}

            {state.canWithdraw && (
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-surface-2 p-4">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 size-6 shrink-0 accent-[var(--primary)]" />
                <span className="text-base leading-relaxed">
                  我了解<b>每月僅能提領一次</b>，這次會將 <b>{formatMoney(details.available_balance)}</b> 全額轉出，下個月 1 日起才能再次申請。
                </span>
              </label>
            )}
          </div>
        )}
      </ResponsiveModal>
      <BankSetupModal open={bankOpen} onOpenChange={setBankOpen} details={details} />
    </>
  )
}

function Notice({ icon, tone, title, children }: { icon: React.ReactNode; tone: 'warning' | 'info'; title: string; children: React.ReactNode }) {
  return (
    <div className={`flex gap-3 rounded-3xl p-4 ${tone === 'warning' ? 'bg-warning-soft text-warning' : 'bg-info-soft text-info'}`}>
      <span className="mt-0.5 shrink-0 [&_svg]:size-6">{icon}</span>
      <div>
        <p className="text-lg font-bold">{title}</p>
        <p className="mt-0.5 text-base leading-relaxed text-ink-2">{children}</p>
      </div>
    </div>
  )
}
