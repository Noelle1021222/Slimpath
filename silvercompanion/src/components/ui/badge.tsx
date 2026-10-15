import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export const badgeVariants = cva('inline-flex items-center gap-1.5 rounded-full font-bold whitespace-nowrap [&_svg]:size-4', {
  variants: {
    tone: {
      neutral: 'bg-surface-3 text-ink-2',
      primary: 'bg-primary-soft text-primary-ink',
      info: 'bg-info-soft text-info',
      success: 'bg-success-soft text-success',
      warning: 'bg-warning-soft text-warning',
      danger: 'bg-danger-soft text-danger-strong',
      dark: 'bg-hero text-hero-ink',
      outline: 'border border-line-strong text-ink-2',
    },
    size: {
      sm: 'px-2.5 py-0.5 text-xs',
      md: 'px-3 py-1 text-sm',
      lg: 'px-4 py-1.5 text-base',
    },
  },
  defaultVariants: { tone: 'neutral', size: 'md' },
})

export function Badge({ className, tone, size, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />
}
