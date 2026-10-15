import { MOOD_MAP } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { Mood } from '@/types'

/** Hand-drawn mood faces — warmer than emoji and legible at any size. */
export function MoodFace({ mood, className, label = true }: { mood: Mood; className?: string; label?: boolean }) {
  const meta = MOOD_MAP[mood]
  const mouth = mood === 'happy' ? 'M15 27c3 4 15 4 18 0' : mood === 'neutral' ? 'M16 29h16' : 'M15 31c3-4 15-4 18 0'
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn('size-12', className)}
      role={label ? 'img' : undefined}
      aria-label={label ? `心情：${meta.label}` : undefined}
      aria-hidden={!label}
    >
      <circle cx="24" cy="24" r="22" fill={meta.soft} />
      <circle cx="24" cy="24" r="22" fill="none" stroke={meta.color} strokeOpacity=".25" strokeWidth="2" />
      {mood === 'happy' ? (
        <>
          <path d="M14.5 19.5c1.4-2 4.6-2 6 0" stroke={meta.color} strokeWidth="2.6" strokeLinecap="round" fill="none" />
          <path d="M27.5 19.5c1.4-2 4.6-2 6 0" stroke={meta.color} strokeWidth="2.6" strokeLinecap="round" fill="none" />
          <circle cx="13" cy="27" r="2.6" fill="#f29b7a" opacity=".55" />
          <circle cx="35" cy="27" r="2.6" fill="#f29b7a" opacity=".55" />
        </>
      ) : (
        <>
          <circle cx="17.5" cy="19.5" r="2.4" fill={meta.color} />
          <circle cx="30.5" cy="19.5" r="2.4" fill={meta.color} />
        </>
      )}
      <path d={mouth} stroke={meta.color} strokeWidth="2.8" strokeLinecap="round" fill="none" />
    </svg>
  )
}
