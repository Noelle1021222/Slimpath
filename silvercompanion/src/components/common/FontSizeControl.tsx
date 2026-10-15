import { cn } from '@/lib/utils'
import { usePrefsStore, type FontScale } from '@/store/usePrefsStore'

const OPTIONS: { value: FontScale; label: string; aria: string; size: string }[] = [
  { value: 'md', label: 'A', aria: '標準字級', size: 'text-base' },
  { value: 'lg', label: 'A', aria: '大字級', size: 'text-xl' },
  { value: 'xl', label: 'A', aria: '特大字級', size: 'text-2xl' },
]

/** 大字模式: scales the root font size, so every rem-based size follows. */
export function FontSizeControl({ dark, className }: { dark?: boolean; className?: string }) {
  const scale = usePrefsStore((s) => s.fontScale)
  const setScale = usePrefsStore((s) => s.setFontScale)
  return (
    <div role="radiogroup" aria-label="字體大小" className={cn('grid grid-cols-3 gap-1 rounded-xl p-1', dark ? 'bg-black/20' : 'bg-surface-3', className)}>
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={scale === o.value}
          aria-label={o.aria}
          onClick={() => setScale(o.value)}
          className={cn(
            'grid h-11 place-items-center rounded-lg font-serif font-bold transition-all focus-visible:ring-4 focus-visible:ring-[var(--ring)] focus-visible:outline-none',
            o.size,
            scale === o.value
              ? dark
                ? 'bg-white text-[#0b2531] shadow-soft'
                : 'bg-surface text-ink shadow-soft'
              : dark
                ? 'text-white/70 hover:text-white'
                : 'text-ink-3 hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
