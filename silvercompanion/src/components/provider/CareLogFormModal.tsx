import { useQueryClient } from '@tanstack/react-query'
import { Camera, ImagePlus, Send, X } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { MoodFace } from '@/components/common/MoodFace'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Textarea } from '@/components/ui/input'
import { ResponsiveModal } from '@/components/ui/responsive-modal'
import { CARE_LOG_PROMPTS, MOODS } from '@/lib/constants'
import { errorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/format'
import { cn, haptic } from '@/lib/utils'
import { careLogService } from '@/services'
import type { Mood, OrderDetails } from '@/types'

const MAX_PHOTOS = 9

/**
 * Spec 4.3.3 — after the visit: mood, a journal entry and photos. Submitting
 * completes the order and settles the earnings into the withdrawable balance.
 */
export function CareLogFormModal({ order, onOpenChange }: { order: OrderDetails | null; onOpenChange: (open: boolean) => void }) {
  const client = useQueryClient()
  const [mood, setMood] = useState<Mood | null>(null)
  const [message, setMessage] = useState('')
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const textarea = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (order) {
      setMood(null)
      setMessage('')
      setPhotos([])
      setError(null)
    }
  }, [order])
  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), [photos])

  if (!order)
    return (
      <ResponsiveModal open={false} onOpenChange={onOpenChange} title="">
        {null}
      </ResponsiveModal>
    )
  const elder = order.recipient_nickname ?? order.recipient_name
  const cash = order.payment_method === 'cash'

  const addPrompt = (p: string) => {
    setMessage((m) => (m ? `${m.trimEnd()}\n${p}` : p))
    requestAnimationFrame(() => {
      const el = textarea.current
      if (el) {
        el.focus()
        el.setSelectionRange(el.value.length, el.value.length)
      }
    })
  }

  const submit = async () => {
    if (!mood) return setError(`請選擇 ${elder} 今天的心情。`)
    if (message.trim().length < 10) return setError('請多寫幾句今天的陪伴紀錄（至少 10 個字），家屬會很想知道。')
    setSaving(true)
    try {
      await careLogService.submit({ order_id: order.id, mood, message, photos: photos.map((p) => p.file) })
      haptic([20, 40, 20])
      await Promise.all(['orders', 'stats', 'myProvider', 'careLogs'].map((k) => client.invalidateQueries({ queryKey: [k] })))
      toast.success('服務完成，辛苦了！', {
        description: cash
          ? `請向家屬收取現金 ${formatMoney(order.total_amount)}；平台服務費 ${formatMoney(order.platform_fee)} 會自餘額扣除。`
          : `${formatMoney(order.provider_earning)} 已入帳到可提領餘額。`,
        duration: 8000,
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
      open={!!order}
      onOpenChange={onOpenChange}
      size="lg"
      locked={saving}
      title="填寫數位聯絡簿"
      description={`寫給 ${order.seeker_name} 的陪伴紀錄，送出後這次服務就完成了。`}
      footer={
        <div className="space-y-3">
          <p className="rounded-2xl bg-success-soft px-4 py-2.5 text-[15px] text-success">
            {cash
              ? `現金訂單：服務費 ${formatMoney(order.total_amount)} 由您現場收取，平台服務費 ${formatMoney(order.platform_fee)} 將自可提領餘額扣除。`
              : `送出後 ${formatMoney(order.provider_earning)} 會立即入帳到可提領餘額。`}
          </p>
          <Button size="lg" block onClick={submit} loading={saving}>
            <Send /> 送出聯絡簿並完成服務
          </Button>
        </div>
      }
    >
      <div className="space-y-7">
        <fieldset>
          <legend className="mb-3 text-base font-bold">{elder} 今天的心情</legend>
          <div className="grid grid-cols-3 gap-3" role="radiogroup">
            {MOODS.map((m) => (
              <motion.button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={mood === m.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  haptic(10)
                  setMood(m.id)
                  setError(null)
                }}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-3xl border-2 p-4 transition-colors',
                  mood === m.id ? 'shadow-soft' : 'border-line hover:border-line-strong',
                )}
                style={mood === m.id ? { borderColor: m.color, background: m.soft } : undefined}
              >
                <MoodFace mood={m.id} className={cn('size-16 transition-transform', mood === m.id && 'scale-110')} label={false} />
                <span className="text-lg font-black" style={{ color: mood === m.id ? m.color : undefined }}>
                  {m.label}
                </span>
                <span className="hidden text-center text-sm leading-snug text-ink-3 sm:block">{m.caption}</span>
              </motion.button>
            ))}
          </div>
        </fieldset>

        <div>
          <Field label="今天的陪伴紀錄" aside={<span className="text-sm text-ink-3 tabular">{message.length} / 2000</span>}>
            <Textarea
              ref={textarea}
              value={message}
              maxLength={2000}
              onChange={(e) => {
                setMessage(e.target.value)
                setError(null)
              }}
              className="min-h-44"
              placeholder={`例如：今天陪${elder}去公園散步，聊到年輕時的工作…`}
            />
          </Field>
          <div className="mt-3 flex flex-wrap gap-2" aria-label="寫作提示">
            {CARE_LOG_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => addPrompt(p)}
                className="min-h-10 rounded-full border border-dashed border-line-strong px-3.5 text-[15px] font-bold text-ink-2 hover:border-primary hover:text-primary-ink"
              >
                + {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-3 flex items-center justify-between text-base font-bold">
            服務照片
            <span className="text-sm font-medium text-ink-3">
              {photos.length} / {MAX_PHOTOS}
            </span>
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((p, i) => (
              <div key={p.url} className="group relative">
                <img src={p.url} alt={`照片 ${i + 1}`} className="aspect-square w-full rounded-2xl object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos((cur) => cur.filter((x) => x.url !== p.url))}
                  className="absolute top-1.5 right-1.5 grid size-9 place-items-center rounded-full bg-black/60 text-white"
                  aria-label={`移除照片 ${i + 1}`}
                >
                  <X className="size-5" />
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => input.current?.click()}
                className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-line-strong text-ink-2 transition-colors hover:border-primary hover:text-primary-ink"
              >
                {photos.length ? <ImagePlus className="size-7" /> : <Camera className="size-7" />}
                <span className="text-sm font-bold">{photos.length ? '再加一張' : '拍照或上傳'}</span>
              </button>
            )}
          </div>
          <input
            ref={input}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-label="選擇要附上的照片"
            onChange={(e) => {
              const files = [...(e.target.files ?? [])].slice(0, MAX_PHOTOS - photos.length)
              e.target.value = ''
              setPhotos((cur) => [...cur, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))])
            }}
          />
          <p className="mt-2 text-sm text-ink-3">照片會自動壓縮，只有這位家屬看得到。</p>
        </div>

        {error && (
          <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-base font-bold text-danger-strong">
            {error}
          </p>
        )}
      </div>
    </ResponsiveModal>
  )
}
