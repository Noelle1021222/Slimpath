import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Spinner } from './spinner'

export const buttonVariants = cva(
  [
    'relative inline-flex items-center justify-center gap-2 font-bold tracking-wide whitespace-nowrap select-none',
    'transition-[background-color,color,box-shadow,transform,border-color] duration-200 ease-out',
    'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45',
    'focus-visible:ring-4 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] focus-visible:outline-none',
    '[&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-primary text-on-primary shadow-[0_10px_24px_-10px_var(--glow)] hover:bg-primary-hover',
        secondary: 'border border-line-strong bg-surface text-ink hover:border-ink-3 hover:bg-surface-2',
        soft: 'bg-primary-soft text-primary-ink hover:bg-[color-mix(in_oklab,var(--primary-soft),var(--primary)_10%)]',
        ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
        danger: 'bg-danger text-white shadow-[0_10px_24px_-10px_rgba(198,47,43,0.55)] hover:bg-danger-strong',
        dangerSoft: 'bg-danger-soft text-danger-strong hover:bg-[#f9d3cf]',
        dark: 'bg-hero text-hero-ink hover:opacity-90',
        line: 'bg-line-green text-white hover:brightness-95',
        link: 'h-auto px-0 text-primary-ink underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-10 rounded-xl px-4 text-sm [&_svg]:size-4',
        md: 'h-12 rounded-2xl px-5 text-base [&_svg]:size-5',
        lg: 'h-14 rounded-2xl px-6 text-lg [&_svg]:size-5',
        xl: 'h-16 rounded-[20px] px-8 text-xl [&_svg]:size-6',
        icon: 'size-12 rounded-2xl [&_svg]:size-5',
        iconSm: 'size-10 rounded-xl [&_svg]:size-[18px]',
      },
      pill: { true: 'rounded-full' },
      block: { true: 'w-full' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, pill, block, asChild, loading, disabled, children, ...props },
  ref,
) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      ref={ref}
      className={cn(buttonVariants({ variant, size, pill, block }), className)}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && (
            <span className="absolute inset-0 grid place-items-center">
              <Spinner className="size-5" />
            </span>
          )}
          <span className={cn('inline-flex items-center gap-2', loading && 'invisible')}>{children}</span>
        </>
      )}
    </Comp>
  )
})
