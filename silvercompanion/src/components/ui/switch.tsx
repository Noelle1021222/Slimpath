import { Switch as RadixSwitch } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function Switch({ className, ...props }: ComponentProps<typeof RadixSwitch.Root>) {
  return (
    <RadixSwitch.Root
      className={cn(
        'relative inline-flex h-9 w-16 shrink-0 cursor-pointer items-center rounded-full bg-line-strong transition-colors duration-300',
        'disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary',
        'focus-visible:ring-4 focus-visible:ring-[var(--ring)] focus-visible:outline-none',
        className,
      )}
      {...props}
    >
      <RadixSwitch.Thumb className="block size-7 translate-x-1 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.25)] transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] data-[state=checked]:translate-x-8" />
    </RadixSwitch.Root>
  )
}
