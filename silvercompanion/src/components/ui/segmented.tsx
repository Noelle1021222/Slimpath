import { RadioGroup } from 'radix-ui'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface SegmentOption<T extends string> {
  value: T
  label: ReactNode
  hint?: ReactNode
  icon?: ReactNode
  disabled?: boolean
}

interface SegmentedProps<T extends string> {
  value: T | null
  onChange: (value: T) => void
  options: SegmentOption<T>[]
  label: string
  columns?: 2 | 3 | 4
  className?: string
  size?: 'md' | 'lg'
}

/** Big, tappable single-choice cards (radio group semantics). */
export function Segmented<T extends string>({ value, onChange, options, label, columns = 2, className, size = 'md' }: SegmentedProps<T>) {
  return (
    <RadioGroup.Root
      value={value ?? undefined}
      onValueChange={(v) => onChange(v as T)}
      aria-label={label}
      className={cn('grid gap-2.5', columns === 2 && 'grid-cols-2', columns === 3 && 'grid-cols-3', columns === 4 && 'grid-cols-2 sm:grid-cols-4', className)}
    >
      {options.map((o) => (
        <RadioGroup.Item
          key={o.value}
          value={o.value}
          disabled={o.disabled}
          className={cn(
            'group relative flex flex-col items-start gap-1 rounded-2xl border-2 border-line bg-surface text-left transition-all duration-200',
            size === 'lg' ? 'min-h-20 p-4' : 'min-h-14 px-4 py-3',
            'hover:border-line-strong data-[state=checked]:border-primary data-[state=checked]:bg-primary-soft',
            'focus-visible:ring-4 focus-visible:ring-[var(--ring)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          <span className="flex w-full items-center gap-2.5">
            {o.icon && <span className="text-ink-2 group-data-[state=checked]:text-primary-ink [&_svg]:size-5">{o.icon}</span>}
            <span className="flex-1 text-base font-bold text-ink group-data-[state=checked]:text-primary-ink">{o.label}</span>
            <span
              aria-hidden
              className="grid size-5 shrink-0 place-items-center rounded-full border-2 border-line-strong transition-colors group-data-[state=checked]:border-primary group-data-[state=checked]:bg-primary"
            >
              <span className="size-2 scale-0 rounded-full bg-white transition-transform group-data-[state=checked]:scale-100" />
            </span>
          </span>
          {o.hint && <span className="text-sm leading-snug text-ink-3 group-data-[state=checked]:text-primary-ink/80">{o.hint}</span>}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  )
}
