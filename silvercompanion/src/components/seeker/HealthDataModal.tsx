import { Bluetooth, BluetoothSearching, Check, Info } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { ResponsiveModal } from '@/components/ui/responsive-modal'
import { qk, useInvalidate } from '@/hooks/queries'
import { bluetoothSupported, simulatedReading, syncFromBluetooth, type BluetoothReading, type SyncStage } from '@/lib/bluetooth'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { healthService } from '@/services'
import type { HealthLog, KinshipRecipient } from '@/types'
import { NumberField } from './NumberField'

interface Values {
  bp_high: string
  bp_low: string
  heart_rate: string
  temperature: string
  steps: string
  weight: string
}

const EMPTY: Values = { bp_high: '', bp_low: '', heart_rate: '', temperature: '', steps: '', weight: '' }

const STAGE_LABEL: Record<SyncStage, string> = {
  choosing: '請在跳出的視窗選擇血壓計或體重計…',
  connecting: '連線中…',
  measuring: '請開始量測，數值會自動帶入…',
  done: '同步完成',
}

/**
 * Spec 4.2.1 — manual entry plus one-tap Web Bluetooth sync from standard
 * GATT devices (blood pressure / heart rate / thermometer / scale).
 */
export function HealthDataModal({
  open,
  onOpenChange,
  recipient,
  last,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipient: KinshipRecipient | null
  last?: Partial<HealthLog> | null
}) {
  const [values, setValues] = useState<Values>(EMPTY)
  const [source, setSource] = useState<'manual' | 'device'>('manual')
  const [stage, setStage] = useState<SyncStage | null>(null)
  const [device, setDevice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const invalidate = useInvalidate()
  const supported = bluetoothSupported()

  useEffect(() => {
    if (open) {
      setValues(EMPTY)
      setSource('manual')
      setStage(null)
      setDevice(null)
      setError(null)
    }
  }, [open])

  const set = (key: keyof Values) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [key]: e.target.value }))
    setError(null)
  }

  const apply = (r: BluetoothReading) => {
    setValues((v) => ({
      ...v,
      bp_high: r.bp_high?.toString() ?? v.bp_high,
      bp_low: r.bp_low?.toString() ?? v.bp_low,
      heart_rate: r.heart_rate?.toString() ?? v.heart_rate,
      temperature: r.temperature?.toString() ?? v.temperature,
      weight: r.weight?.toString() ?? v.weight,
    }))
    setSource('device')
    setDevice(r.deviceName ?? '藍牙裝置')
  }

  const sync = async () => {
    setError(null)
    if (!supported) {
      setStage('connecting')
      await new Promise((r) => setTimeout(r, 900))
      setStage('measuring')
      await new Promise((r) => setTimeout(r, 1100))
      apply(simulatedReading(last))
      setStage('done')
      return
    }
    try {
      apply(await syncFromBluetooth(setStage))
    } catch (e) {
      setStage(null)
      const msg =
        (e as Error)?.name === 'NotFoundError'
          ? null
          : (e as Error)?.message === 'no_reading'
            ? '裝置沒有傳來數值，請量測後再試一次。'
            : '藍牙連線失敗，請確認裝置已開啟並靠近手機。'
      if (msg) setError(msg)
    }
  }

  const save = async () => {
    const num = (s: string) => (s.trim() === '' ? null : Number(s))
    const input = {
      recipient_id: recipient?.id ?? null,
      bp_high: num(values.bp_high),
      bp_low: num(values.bp_low),
      heart_rate: num(values.heart_rate),
      temperature: num(values.temperature),
      steps: num(values.steps),
      weight: num(values.weight),
      source,
    }
    if ([input.bp_high, input.bp_low, input.heart_rate, input.temperature, input.steps, input.weight].every((v) => v == null))
      return setError('請至少填寫一項數據。')
    if ((input.bp_high == null) !== (input.bp_low == null)) return setError('血壓請同時填寫收縮壓與舒張壓。')
    if (input.bp_high != null && input.bp_low != null && input.bp_high <= input.bp_low) return setError('收縮壓（上面的數字）應該比舒張壓大。')
    if (input.temperature != null && (input.temperature < 30 || input.temperature > 45)) return setError('體溫看起來不太對，請再確認一次。')
    setSaving(true)
    try {
      await healthService.add(input)
      await invalidate(qk.health(recipient?.id ?? null), ['health'])
      toast.success('已記錄今天的健康數據', {
        description: recipient ? `${recipient.nickname ?? recipient.name}・${source === 'device' ? '藍牙同步' : '手動輸入'}` : undefined,
      })
      onOpenChange(false)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="記錄健康數據"
      description={recipient ? `為 ${recipient.nickname ?? recipient.name} 記錄今天的量測結果` : '記錄今天的量測結果'}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" size="lg" className="flex-1" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button size="lg" className="flex-[2]" onClick={save} loading={saving}>
            <Check /> 儲存紀錄
          </Button>
        </div>
      }
    >
      <div
        className={cn(
          'flex flex-col gap-4 rounded-3xl border p-5 sm:flex-row sm:items-center',
          stage === 'done' ? 'border-success/30 bg-success-soft' : 'border-line bg-surface-2',
        )}
      >
        <span className={cn('grid size-14 shrink-0 place-items-center rounded-2xl', stage === 'done' ? 'bg-success text-white' : 'bg-info-soft text-info')}>
          {stage && stage !== 'done' ? (
            <BluetoothSearching className="size-7 animate-pulse" />
          ) : stage === 'done' ? (
            <Check className="size-7" />
          ) : (
            <Bluetooth className="size-7" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold">{stage ? STAGE_LABEL[stage] : '藍牙一鍵帶入'}</p>
          <p className="text-[15px] leading-snug text-ink-2">
            {stage === 'done'
              ? `已從「${device}」帶入數值，請確認後儲存。`
              : supported
                ? '支援標準藍牙血壓計、心率帶、耳溫槍與體重計。'
                : '這個瀏覽器不支援 Web Bluetooth（例如 iPhone），將以模擬數值示範同步流程。'}
          </p>
        </div>
        <Button variant={stage === 'done' ? 'secondary' : 'primary'} onClick={sync} loading={!!stage && stage !== 'done'} className="shrink-0">
          {stage === 'done' ? '重新同步' : supported ? '連接裝置' : '模擬同步'}
        </Button>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-base font-bold text-ink">血壓</legend>
          <div className="grid grid-cols-2 gap-3">
            <NumberField unit="mmHg" aria-label="收縮壓" placeholder="收縮壓" min={50} max={260} value={values.bp_high} onChange={set('bp_high')} />
            <NumberField unit="mmHg" aria-label="舒張壓" placeholder="舒張壓" min={30} max={180} value={values.bp_low} onChange={set('bp_low')} />
          </div>
          <p className="mt-2 text-sm text-ink-3">上面較大的數字是收縮壓，下面的是舒張壓。</p>
        </fieldset>
        <Field label="心率">
          <NumberField unit="次/分" min={25} max={250} value={values.heart_rate} onChange={set('heart_rate')} placeholder="72" />
        </Field>
        <Field label="體溫">
          <NumberField unit="°C" decimal min={30} max={45} value={values.temperature} onChange={set('temperature')} placeholder="36.5" />
        </Field>
        <Field label="今日步數">
          <NumberField unit="步" min={0} max={100000} value={values.steps} onChange={set('steps')} placeholder="3500" />
        </Field>
        <Field label="體重">
          <NumberField unit="公斤" decimal min={10} max={300} value={values.weight} onChange={set('weight')} placeholder="52.4" />
        </Field>
      </div>
      {error && (
        <p role="alert" className="mt-5 rounded-2xl bg-danger-soft px-4 py-3 text-base font-bold text-danger-strong">
          {error}
        </p>
      )}
      <p className="mt-5 flex items-start gap-2 text-sm leading-relaxed text-ink-3">
        <Info className="mt-0.5 size-4 shrink-0" />
        數據僅供日常照護參考，不能取代醫師診斷。如有不適請盡快就醫。
      </p>
    </ResponsiveModal>
  )
}
