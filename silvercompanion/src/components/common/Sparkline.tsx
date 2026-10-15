import { useId } from 'react'
import { cn } from '@/lib/utils'

/** Tiny trend line with a soft area fill; decorative (values are printed next to it). */
export function Sparkline({ values, className, color = 'var(--primary)' }: { values: number[]; className?: string; color?: string }) {
  const id = useId().replace(/:/g, '')
  if (values.length < 2) return <div className={cn('h-10', className)} />
  const w = 120
  const h = 36
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 4 - ((v - min) / span) * (h - 8)] as const)
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${w},${h} L0,${h} Z`
  const [lx, ly] = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn('h-10 w-full overflow-visible', className)} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".22" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={lx} cy={ly} r="3.2" fill={color} stroke="white" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
