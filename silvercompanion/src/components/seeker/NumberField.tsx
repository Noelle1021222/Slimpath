import { forwardRef, type InputHTMLAttributes } from 'react'
import { fieldBase } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/** Big numeric input with a unit suffix — easy to read, numeric keypad on phones. */
export const NumberField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { unit: string; decimal?: boolean }>(function NumberField(
  { unit, decimal, className, ...props },
  ref,
) {
  return (
    <div className="relative">
      <input
        ref={ref}
        type="number"
        inputMode={decimal ? 'decimal' : 'numeric'}
        step={decimal ? '0.1' : '1'}
        className={cn(fieldBase, 'h-16 pr-16 pl-4 font-num text-[28px] font-bold tabular', className)}
        {...props}
      />
      <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-base font-bold text-ink-3">{unit}</span>
    </div>
  )
})
