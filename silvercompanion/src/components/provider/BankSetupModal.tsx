import { Landmark, Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input, Select } from '@/components/ui/input'
import { ResponsiveModal } from '@/components/ui/responsive-modal'
import { useUpdateProvider } from '@/hooks/useProviderMutations'
import { TAIWAN_BANKS } from '@/lib/banks'
import { useUserStore } from '@/store/useUserStore'
import type { ProviderDetails } from '@/types'

/**
 * Spec 4.3.1 — payout account. The account holder is locked to the verified
 * legal name (profiles.full_name); withdrawals are only ever paid to it.
 */
export function BankSetupModal({
  open,
  onOpenChange,
  details,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  details: ProviderDetails
  onSaved?: () => void
}) {
  const fullName = useUserStore((s) => s.profile?.full_name ?? '')
  const update = useUpdateProvider('收款帳戶已更新')
  const [code, setCode] = useState('')
  const [account, setAccount] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setCode(details.bank_code ?? '')
    setAccount(details.bank_account ?? '')
    setError(null)
  }, [open, details.bank_code, details.bank_account])

  const save = () => {
    if (!/^\d{3}$/.test(code)) return setError('請選擇收款銀行。')
    if (!/^\d{6,16}$/.test(account)) return setError('帳號需為 6–16 碼數字，請勿輸入「-」。')
    update.mutate(
      { bank_code: code, bank_account: account },
      {
        onSuccess: () => {
          onSaved?.()
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="收款銀行帳戶"
      description="每月提領會匯入這個帳戶。"
      footer={
        <Button size="lg" block onClick={save} loading={update.isPending}>
          <Landmark /> 儲存帳戶
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="flex items-start gap-3 rounded-3xl border border-line bg-surface-2 p-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-ink text-white">
            <Lock className="size-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-ink-3">戶名（實名認證，無法修改）</p>
            <p className="text-2xl font-black tracking-wider">{fullName}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">為保護您的收入，只能匯入與實名認證姓名相同的帳戶。</p>
          </div>
        </div>
        <Field label="銀行">
          <Select value={code} onChange={(e) => setCode(e.target.value)}>
            <option value="">選擇銀行</option>
            {TAIWAN_BANKS.map((b) => (
              <option key={b.code} value={b.code}>
                {`${b.code}\u3000${b.name}`}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="帳號" error={error} hint="只填數字，不需要「-」">
          <Input
            inputMode="numeric"
            autoComplete="off"
            value={account}
            maxLength={16}
            onChange={(e) => setAccount(e.target.value.replace(/\D/g, ''))}
            className="font-num tracking-wider"
            placeholder="012345678901"
          />
        </Field>
      </div>
    </ResponsiveModal>
  )
}
