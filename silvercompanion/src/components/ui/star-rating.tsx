import { Star } from 'lucide-react'
import { useState } from 'react'
import { cn, haptic } from '@/lib/utils'

export function StarRating({ value, size = 'md', className }: { value: number; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const px = size === 'sm' ? 'size-4' : size === 'lg' ? 'size-7' : 'size-5'
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} role="img" aria-label={`${value.toFixed(1)} 顆星`}>
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.max(0, Math.min(1, value - i))
        return (
          <span key={i} className={cn('relative', px)}>
            <Star className={cn('absolute inset-0 fill-line text-line', px)} strokeWidth={1.5} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className={cn('fill-star text-star', px)} strokeWidth={1.5} />
            </span>
          </span>
        )
      })}
    </span>
  )
}

const LABELS = ['', '不太滿意', '還可以', '不錯', '很滿意', '非常滿意！']

export function StarInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [hover, setHover] = useState(0)
  const shown = hover || value
  return (
    <div>
      <div role="radiogroup" aria-label="評分" className="flex justify-center gap-1.5" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} 顆星`}
            onMouseEnter={() => setHover(n)}
            onClick={() => {
              haptic(10)
              onChange(n)
            }}
            className="grid size-14 place-items-center rounded-2xl transition-transform duration-200 hover:scale-110 focus-visible:ring-4 focus-visible:ring-[var(--ring)] focus-visible:outline-none active:scale-95"
          >
            <Star
              className={cn('size-11 transition-all duration-200', n <= shown ? 'scale-100 fill-star text-star' : 'scale-90 fill-transparent text-line-strong')}
              strokeWidth={1.6}
            />
          </button>
        ))}
      </div>
      <p className="mt-2 h-7 text-center text-lg font-bold text-ink-2" aria-live="polite">
        {LABELS[shown]}
      </p>
    </div>
  )
}
