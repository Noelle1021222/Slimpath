import { Check } from 'lucide-react'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  selected?: boolean
  icon?: ReactNode
  size?: 'md' | 'lg'
  showCheck?: boolean
}

/** Toggle chip (aria-pressed) used for filters and tag pickers. */
export const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { selected, icon, size = 'md', showCheck = false, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={selected}
      className={cn(
        'inline-flex shrink-0 items-center gap-2 rounded-full border font-bold whitespace-nowrap transition-all duration-200',
        size === 'lg' ? 'min-h-12 px-5 text-base' : 'min-h-11 px-4 text-[15px]',
        selected
          ? 'border-primary bg-primary text-on-primary shadow-[0_8px_18px_-10px_var(--glow)]'
          : 'border-line-strong bg-surface text-ink-2 hover:border-ink-3 hover:text-ink',
        'focus-visible:ring-4 focus-visible:ring-[var(--ring)] focus-visible:outline-none active:scale-[0.97]',
        '[&_svg]:size-[18px]',
        className,
      )}
      {...props}
    >
      {showCheck && selected ? <Check strokeWidth={3} /> : icon}
      {children}
    </button>
  )
})
