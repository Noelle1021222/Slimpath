import { Banknote, CreditCard, Minus, Plus, ShieldCheck, UserRoundPlus, Wifi } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { ServiceIcon } from '@/components/common/ServiceIcon'
import { UserAvatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Select, Textarea } from '@/components/ui/input'
import { ResponsiveModal } from '@/components/ui/responsive-modal'
import { Switch } from '@/components/ui/switch'
import { qk, useBookedSlots, useInvalidate, useKinship } from '@/hooks/queries'
import { computeDaySlots, maxConsecutiveHours } from '@/lib/availability'
import { PAYMENT_METHOD_META, SERVICE_MAP } from '@/lib/constants'
import { errorMessage } from '@/lib/errors'
import { formatMoney, formatMonthDay, formatWeekday, relativeDayLabel } from '@/lib/format'
import { computePrice } from '@/lib/pricing'
import { hourLabel, nextDays } from '@/lib/time'
import { cn, haptic } from '@/lib/utils'
import { orderService, startLinePayCheckout } from '@/services'
import type { Order, PaymentMethod, ProviderPublic, ServiceType } from '@/types'
import { BookingSuccess } from './BookingSuccess'
import { KinshipFormModal } from './KinshipFormModal'

const ONLINE_CAPABLE: ServiceType[] = ['chat', 'tech', 'read', 'custom']

/**
 * Spec 4.2.3 — pick the elder (address & notes come along), the service, the
 * time and how to pay. LINE Pay hands over to the payment page; cash shows the
 * confirmation straight away.
 */
export function BookingFormModal({
  open,
  onOpenChange,
  provider,
  initial,
  initialService,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  provider: ProviderPublic
  initial?: { date: string; hour: number } | null
  initialService?: ServiceType | null
}) {
  const navigate = useNavigate()
  const invalidate = useInvalidate()
  const kinship = useKinship()
  const booked = useBookedSlots(provider.provider_id)
  const [recipientId, setRecipientId] = useState<number | null>(null)
  const [service, setService] = useState<ServiceType>(provider.service_types[0])
  const [date, setDate] = useState<string>('')
  const [start, setStart] = useState<number | null>(null)
  const [hours, setHours] = useState(1)
  const [address, setAddress] = useState('')
  const [online, setOnline] = useState(false)
  const [notes, setNotes] = useState('')
  const [payment, setPayment] = useState<PaymentMethod>('linepay')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<Order | null>(null)
  const [addingElder, setAddingElder] = useState(false)

  const recipients = useMemo(() => kinship.data ?? [], [kinship.data])
  const recipient = recipients.find((r) => r.id === recipientId) ?? null
  const dates = useMemo(() => nextDays(14), [])
  const daySlots = useMemo(
    () => (date ? computeDaySlots(provider.availability_slots, booked.data ?? [], date) : []),
    [date, provider.availability_slots, booked.data],
  )
  const startOptions = daySlots.filter((s) => s.state === 'available')
  const maxHours = start != null ? maxConsecutiveHours(daySlots, start, 8) : 1
  const price = computePrice(provider.hourly_rate, hours)

  // Prefill each time the sheet opens.
  useEffect(() => {
    if (!open) return
    setDone(null)
    setService(initialService && provider.service_types.includes(initialService) ? initialService : provider.service_types[0])
    setDate(initial?.date ?? '')
    setStart(initial?.hour ?? null)
    setHours(1)
    setOnline(false)
    setPayment('linepay')
  }, [open, initial, initialService, provider.service_types])

  useEffect(() => {
    if (open && recipientId == null && recipients.length) setRecipientId(recipients[0].id)
  }, [open, recipients, recipientId])

  // Address and notes follow the chosen elder (spec: 自動帶入地址與注意事項).
  useEffect(() => {
    if (!recipient) return
    setAddress(recipient.address)
    setNotes(recipient.notes ?? '')
  }, [recipient])

  useEffect(() => {
    if (hours > maxHours) setHours(Math.max(1, maxHours))
  }, [maxHours, hours])

  const canOnline = provider.offers_online && ONLINE_CAPABLE.includes(service)
  const ready = recipient && date && start != null && hours >= 1 && (online || address.trim().length >= 4)

  const submit = async () => {
    if (!ready || !recipient || start == null) return
    setSubmitting(true)
    try {
      const order = await orderService.create({
        provider_id: provider.provider_id,
        recipient_id: recipient.id,
        service_type: service,
        service_date: date,
        start_time: hourLabel(start),
        end_time: hourLabel(start + hours),
        location_address: online ? `線上服務（${recipient.address}）` : address.trim(),
        location_lat: recipient.lat,
        location_lng: recipient.lng,
        is_online: online,
        notes: notes.trim() || null,
        payment_method: payment,
      })
      haptic([10, 30, 10])
      await invalidate(['orders'], qk.booked(provider.provider_id))
      if (payment === 'linepay') {
        toast.message('正在前往 LINE Pay…', { description: '完成授權後會自動回到銀髮伴' })
        await startLinePayCheckout(order.id)
        return
      }
      setDone(order)
      setSubmitting(false)
    } catch (e) {
      toast.error(errorMessage(e))
      await invalidate(qk.booked(provider.provider_id))
      setSubmitting(false)
    }
  }

  if (done)
    return (
      <ResponsiveModal open={open} onOpenChange={onOpenChange} title="預約完成" bare size="md">
        <BookingSuccess
          order={done}
          providerName={provider.nickname}
          onViewOrders={() => {
            onOpenChange(false)
            navigate('/seeker/orders')
          }}
          onClose={() => onOpenChange(false)}
        />
      </ResponsiveModal>
    )

  return (
    <>
      <ResponsiveModal
        open={open}
        onOpenChange={onOpenChange}
        size="lg"
        title={
          <span className="flex items-center gap-3">
            <UserAvatar name={provider.nickname} src={provider.avatar_url} size="sm" />
            預約 {provider.nickname}
          </span>
        }
        locked={submitting}
        footer={
          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink-3">
                ${provider.hourly_rate} × {hours} 小時
              </p>
              <p className="font-num text-3xl leading-none font-semibold text-ink">{formatMoney(price.total)}</p>
            </div>
            <Button size="lg" variant={payment === 'linepay' ? 'line' : 'primary'} disabled={!ready} loading={submitting} onClick={submit} className="min-w-44">
              {payment === 'linepay' ? '前往 LINE Pay 付款' : '確認預約'}
            </Button>
          </div>
        }
      >
        <div className="space-y-7">
          <section>
            <p className="mb-3 text-base font-bold">要陪伴哪一位？</p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {recipients.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRecipientId(r.id)}
                  aria-pressed={recipientId === r.id}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl border-2 p-3.5 text-left transition-colors',
                    recipientId === r.id ? 'border-primary bg-primary-soft' : 'border-line hover:border-line-strong',
                  )}
                >
                  <UserAvatar name={r.nickname ?? r.name} size="md" />
                  <span className="min-w-0">
                    <span className="block truncate text-lg font-bold">{r.nickname ?? r.name}</span>
                    <span className="block text-sm text-ink-2">
                      {r.age} 歲・{r.mobility}
                      {r.chronic_diseases.length > 0 && `・${r.chronic_diseases.slice(0, 2).join('、')}`}
                    </span>
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAddingElder(true)}
                className="flex min-h-[76px] items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-strong text-base font-bold text-ink-2 hover:border-primary hover:text-primary-ink"
              >
                <UserRoundPlus className="size-5" /> 新增長輩
              </button>
            </div>
          </section>

          <section>
            <p className="mb-3 text-base font-bold">服務項目</p>
            <div className="flex flex-wrap gap-2">
              {provider.service_types.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={service === s}
                  onClick={() => setService(s)}
                  className={cn(
                    'inline-flex min-h-12 items-center gap-2 rounded-2xl border-2 py-1.5 pr-4 pl-1.5 text-base font-bold transition-colors',
                    service === s ? 'border-primary bg-primary-soft text-primary-ink' : 'border-line text-ink-2 hover:border-line-strong',
                  )}
                >
                  <ServiceIcon type={s} size="sm" />
                  {SERVICE_MAP[s].label}
                </button>
              ))}
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-[1.3fr_1fr]">
            <Field label="日期">
              <Select
                value={date}
                onChange={(e) => {
                  setDate(e.target.value)
                  setStart(null)
                }}
              >
                <option value="">選擇日期</option>
                {dates.map((d) => {
                  const open = computeDaySlots(provider.availability_slots, booked.data ?? [], d).filter((s) => s.state === 'available').length
                  return (
                    <option key={d} value={d} disabled={!open}>
                      {relativeDayLabel(d) ? `${relativeDayLabel(d)} ` : ''}
                      {formatMonthDay(d)}（{formatWeekday(d).slice(1)}）{open ? '' : '・已額滿'}
                    </option>
                  )
                })}
              </Select>
            </Field>
            <Field label="開始時間">
              <Select value={start ?? ''} disabled={!date} onChange={(e) => setStart(e.target.value === '' ? null : Number(e.target.value))}>
                <option value="">{date ? '選擇時間' : '先選日期'}</option>
                {startOptions.map((s) => (
                  <option key={s.hour} value={s.hour}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
          </section>

          <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-surface-2 p-4">
            <div>
              <p className="text-base font-bold">服務時數</p>
              <p className="text-[15px] text-ink-2">
                {start != null ? `${hourLabel(start)} – ${hourLabel(start + hours)}` : '選好開始時間後可調整'}
                {start != null && maxHours > 1 && <span className="text-ink-3">（最多連續 {maxHours} 小時）</span>}
              </p>
            </div>
            <div className="flex items-center gap-3" role="group" aria-label="服務時數">
              <Button variant="secondary" size="icon" aria-label="減少一小時" disabled={hours <= 1} onClick={() => setHours((h) => h - 1)}>
                <Minus />
              </Button>
              <span className="w-16 text-center font-num text-3xl font-bold tabular" aria-live="polite">
                {hours}
                <span className="ml-0.5 font-sans text-base text-ink-3">時</span>
              </span>
              <Button
                variant="secondary"
                size="icon"
                aria-label="增加一小時"
                disabled={start == null || hours >= maxHours}
                onClick={() => setHours((h) => h + 1)}
              >
                <Plus />
              </Button>
            </div>
          </section>

          {canOnline && (
            <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-2xl border border-line px-4 py-3">
              <span className="flex items-center gap-3">
                <Wifi className="size-5 text-info" />
                <span>
                  <span className="block text-base font-bold">改用線上視訊</span>
                  <span className="block text-sm text-ink-3">陪伴者會用 LINE 或 Google Meet 視訊</span>
                </span>
              </span>
              <Switch checked={online} onCheckedChange={setOnline} aria-label="線上視訊服務" />
            </label>
          )}

          {!online && (
            <Field label="服務地址" hint="已帶入長輩的預設地址，可以修改">
              <Textarea value={address} onChange={(e) => setAddress(e.target.value)} className="min-h-20" />
            </Field>
          )}

          <Field label="給陪伴者的備註" optional hint="已帶入照顧注意事項，例如：需輪椅、重聽、帶健保卡">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} className="min-h-24" />
          </Field>

          <section>
            <p className="mb-3 text-base font-bold">付款方式</p>
            <div className="grid gap-2.5 sm:grid-cols-3">
              {(['linepay', 'credit_card', 'cash'] as PaymentMethod[]).map((m) => {
                const meta = PAYMENT_METHOD_META[m]
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={!meta.available}
                    aria-pressed={payment === m}
                    onClick={() => setPayment(m)}
                    className={cn(
                      'relative flex flex-col items-start gap-1 rounded-2xl border-2 p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                      payment === m
                        ? m === 'linepay'
                          ? 'border-line-green bg-[#e7f9ee]'
                          : 'border-primary bg-primary-soft'
                        : 'border-line hover:border-line-strong',
                    )}
                  >
                    {m === 'linepay' && (
                      <span className="absolute top-3 right-3 rounded-full bg-line-green px-2 py-0.5 text-xs font-bold text-white">推薦</span>
                    )}
                    <span className="flex items-center gap-2 text-lg font-black">
                      {m === 'linepay' ? (
                        <span className="grid size-7 place-items-center rounded-lg bg-line-green text-[11px] font-black text-white">PAY</span>
                      ) : m === 'credit_card' ? (
                        <CreditCard className="size-6" />
                      ) : (
                        <Banknote className="size-6" />
                      )}
                      {meta.label}
                    </span>
                    <span className="text-sm leading-snug text-ink-2">{meta.hint}</span>
                  </button>
                )
              })}
            </div>
          </section>

          <p className="flex items-start gap-2 rounded-2xl bg-success-soft px-4 py-3 text-[15px] leading-relaxed text-success">
            <ShieldCheck className="mt-0.5 size-5 shrink-0" />
            陪伴者接單前都可以免費取消；以 LINE Pay 付款的訂單取消後會原路退款。
          </p>
        </div>
      </ResponsiveModal>
      <KinshipFormModal open={addingElder} onOpenChange={setAddingElder} onSaved={(r) => setRecipientId(r.id)} />
    </>
  )
}
