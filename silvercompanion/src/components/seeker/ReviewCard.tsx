import { Quote } from 'lucide-react'
import { ServiceLabel } from '@/components/common/ServiceIcon'
import { StarRating } from '@/components/ui/star-rating'
import { formatRelativeTime } from '@/lib/format'
import type { ProviderReview } from '@/types'

export function ReviewCard({ review }: { review: ProviderReview }) {
  return (
    <article className="relative rounded-3xl border border-line bg-surface p-5">
      <Quote className="absolute top-5 right-5 size-8 text-primary/15" aria-hidden />
      <div className="flex items-center gap-3">
        <StarRating value={review.rating} />
        <span className="text-sm text-ink-3">{formatRelativeTime(review.rated_at)}</span>
      </div>
      {review.comment && <p className="mt-3 text-[17px] leading-relaxed text-ink">「{review.comment}」</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[15px] font-bold text-ink-2">{review.reviewer}</span>
        <ServiceLabel type={review.service_type} className="px-2.5 py-0.5 text-xs" />
        {review.tags.map((t) => (
          <span key={t} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-bold text-ink-2">
            {t}
          </span>
        ))}
      </div>
    </article>
  )
}
