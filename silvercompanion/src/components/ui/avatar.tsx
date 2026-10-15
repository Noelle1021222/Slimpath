import { BadgeCheck } from 'lucide-react'
import { monogram } from '@/lib/format'
import { cn } from '@/lib/utils'

const PALETTES = [
  ['#f9d2b6', '#e9803f', '#5a2a10'],
  ['#f6e0aa', '#d99a2b', '#4f3404'],
  ['#d3e4c8', '#6f9a63', '#1f3a1b'],
  ['#c9e0e8', '#4f87a0', '#123341'],
  ['#ebd0dd', '#a35c7e', '#3f1426'],
  ['#ddd5ef', '#7a65b0', '#241a45'],
  ['#cfe9e4', '#2fa292', '#0d3a34'],
] as const

function hash(text: string) {
  let h = 0
  for (const ch of text) h = (h * 31 + ch.codePointAt(0)!) | 0
  return Math.abs(h)
}

const SIZES = {
  xs: 'size-8 text-sm',
  sm: 'size-10 text-base',
  md: 'size-14 text-xl',
  lg: 'size-[72px] text-[28px]',
  xl: 'size-24 text-4xl',
  '2xl': 'size-32 text-5xl',
} as const

interface UserAvatarProps {
  name: string
  src?: string | null
  size?: keyof typeof SIZES
  online?: boolean
  verified?: boolean
  className?: string
  ring?: boolean
}

/** Photo when available, otherwise a serif monogram on a warm gradient. */
export function UserAvatar({ name, src, size = 'md', online, verified, className, ring }: UserAvatarProps) {
  const [light, mid, ink] = PALETTES[hash(name) % PALETTES.length]
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <span
        className={cn('relative grid place-items-center overflow-hidden rounded-full font-serif font-bold', SIZES[size], ring && 'ring-4 ring-surface')}
        style={src ? undefined : { background: `radial-gradient(120% 120% at 30% 20%, ${light} 0%, ${mid} 100%)`, color: ink }}
        aria-hidden={!src}
      >
        {src ? (
          <img src={src} alt={name} className="size-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <span className="translate-y-[-0.03em] drop-shadow-[0_1px_0_rgba(255,255,255,0.35)]">{monogram(name)}</span>
        )}
      </span>
      {online !== undefined && (
        <span
          className={cn(
            'absolute right-0 bottom-0 rounded-full border-[3px] border-surface',
            size === 'xs' || size === 'sm' ? 'size-3' : 'size-4',
            online ? 'bg-[#2fae66]' : 'bg-line-strong',
          )}
          role="img"
          aria-label={online ? '上線中' : '休息中'}
        />
      )}
      {verified && (
        <span className="absolute -right-1 -bottom-1 grid place-items-center rounded-full bg-surface p-0.5" title="已實名認證">
          <BadgeCheck className={cn('fill-primary text-surface', size === 'xl' || size === '2xl' ? 'size-7' : 'size-5')} role="img" aria-label="已實名認證" />
        </span>
      )}
    </span>
  )
}
