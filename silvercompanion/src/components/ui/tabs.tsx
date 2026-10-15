import { motion } from 'motion/react'
import { Tabs as RadixTabs } from 'radix-ui'
import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface TabItem<T extends string> {
  value: T
  label: ReactNode
  count?: number
}

/** Segmented tab bar with a sliding pill; content via <TabsContent>. */
export function TabsBar<T extends string>({ items, value, className }: { items: TabItem<T>[]; value: T; className?: string }) {
  const layoutId = useId()
  return (
    <RadixTabs.List className={cn('scrollbar-none flex gap-1 overflow-x-auto rounded-2xl bg-surface-3 p-1.5', className)}>
      {items.map((item) => (
        <RadixTabs.Trigger
          key={item.value}
          value={item.value}
          className={cn(
            'relative flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-base font-bold whitespace-nowrap transition-colors',
            'text-ink-2 hover:text-ink data-[state=active]:text-ink',
            'focus-visible:ring-4 focus-visible:ring-[var(--ring)] focus-visible:outline-none',
          )}
        >
          {value === item.value && (
            <motion.span
              layoutId={layoutId}
              className="absolute inset-0 rounded-xl bg-surface shadow-soft"
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
            />
          )}
          <span className="relative">{item.label}</span>
          {item.count != null && item.count > 0 && (
            <span className="relative grid min-w-6 place-items-center rounded-full bg-primary px-1.5 text-xs leading-6 text-on-primary">{item.count}</span>
          )}
        </RadixTabs.Trigger>
      ))}
    </RadixTabs.List>
  )
}

export const Tabs = RadixTabs.Root
export const TabsContent = RadixTabs.Content
