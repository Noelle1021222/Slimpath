import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Textarea } from '@/components/ui/input'
import { ResponsiveModal } from '@/components/ui/responsive-modal'
import { StarInput } from '@/components/ui/star-rating'
import { qk, useInvalidate } from '@/hooks/queries'
import { RATING_TAGS } from '@/lib/constants'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { careLogService } from '@/services'

export interface RatingTarget {
  orderId: string
  providerName: string
}

/** Spec 4.2.4 — 1–5 stars, quick tags, a comment; a DB trigger updates the average. */
export function RatingModal({ target: order, onOpenChange }: { target: RatingTarget | null; onOpenChange: (open: boolean) => void }) {
  const invalidate = useInvalidate()
  const [rating, setRating] = useState(0)
  const [tags, setTags] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (order) {
      setRating(0)
      setTags([])
      setComment('')
    }
  }, [order])

  const submit = async () => {
    if (!order || !rating) return
    setSaving(true)
    try {
      await careLogService.rate({ order_id: order.orderId, rating, tags, comment })
      await invalidate(['orders'], qk.careLogs, ['provider'], ['reviews'])
      toast.success('謝謝您的評價！', { description: `已傳達給 ${order.providerName}，這對陪伴者很重要。` })
      onOpenChange(false)
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <ResponsiveModal
      open={!!order}
      onOpenChange={onOpenChange}
      title={`這次 ${order?.providerName ?? ''} 的陪伴還好嗎？`}
      description="評價只能填寫一次，會匿名顯示在陪伴者的介紹頁。"
      footer={
        <Button size="lg" block onClick={submit} disabled={!rating} loading={saving}>
          送出評價
        </Button>
      }
    >
      <div className="space-y-7 pt-2">
        <StarInput value={rating} onChange={setRating} />
        <fieldset>
          <legend className="mb-3 text-base font-bold">印象最深的是…</legend>
          <div className="flex flex-wrap gap-2">
            {RATING_TAGS.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tags.includes(t)}
                onClick={() => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))}
                className={cn(
                  'min-h-11 rounded-full border px-4 text-[15px] font-bold transition-colors',
                  tags.includes(t) ? 'border-primary bg-primary text-on-primary' : 'border-line-strong text-ink-2 hover:border-ink-3',
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </fieldset>
        <Field label="想對陪伴者說的話" optional>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            placeholder="例如：謝謝妳陪媽媽聊天，她今天好開心！"
            className="min-h-28"
          />
        </Field>
      </div>
    </ResponsiveModal>
  )
}
