import { Slider } from 'radix-ui'
import { useLayoutEffect, useRef, useState } from 'react'
import { cn, haptic } from '@/lib/utils'

interface RangeSliderProps {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step: number
  label: string
  format?: (value: number) => string
  /** extra marks shown under the track */
  marks?: number[]
  className?: string
  suffix?: string
}

const THUMB = 40

/**
 * Spec 6.2 — thick track, a value tag that floats ABOVE the thumb (never under
 * the finger), min / max marks below. Arrow keys move by one step, Page Up/Down
 * by ten. Every step gives a tiny haptic tick on phones.
 */
export function RangeSlider({ value, onChange, min, max, step, label, format = String, marks = [], className, suffix }: RangeSliderProps) {
  const last = useRef(value)
  const wrap = useRef<HTMLDivElement>(null)
  const tag = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ wrap: 0, tag: 0 })
  const pct = (value - min) / (max - min)

  useLayoutEffect(() => {
    const measure = () => setBox({ wrap: wrap.current?.offsetWidth ?? 0, tag: tag.current?.offsetWidth ?? 0 })
    measure()
    const ro = new ResizeObserver(measure)
    if (wrap.current) ro.observe(wrap.current)
    if (tag.current) ro.observe(tag.current)
    return () => ro.disconnect()
  }, [])

  // Centre of the thumb in px, then clamp so the tag never leaves the track.
  const thumbCenter = pct * (box.wrap - THUMB) + THUMB / 2
  const tagLeft = box.wrap ? Math.min(Math.max(thumbCenter, box.tag / 2), box.wrap - box.tag / 2) : 0
  const pointerShift = thumbCenter - tagLeft

  return (
    <div ref={wrap} className={cn('select-none', className)}>
      <div className="relative h-[68px]" aria-hidden>
        <div ref={tag} className="absolute bottom-2 -translate-x-1/2" style={{ left: tagLeft, opacity: box.wrap ? 1 : 0 }}>
          <div className="flex items-baseline gap-1 rounded-2xl bg-ink px-4 py-2 whitespace-nowrap text-white shadow-lift">
            <span className="font-num text-2xl font-bold tracking-tight">{format(value)}</span>
            {suffix && <span className="text-sm font-bold text-white/75">{suffix}</span>}
          </div>
          <div className="-mt-1.5 size-3 rotate-45 rounded-[2px] bg-ink" style={{ marginLeft: `calc(50% - 6px + ${pointerShift}px)` }} />
        </div>
      </div>
      <Slider.Root
        className="relative flex h-11 w-full touch-none items-center"
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => {
          if (v !== last.current) haptic(4)
          last.current = v
          onChange(v)
        }}
        aria-label={label}
      >
        <Slider.Track className="relative h-4 grow overflow-hidden rounded-full bg-surface-3 shadow-[inset_0_1px_2px_rgb(0_0_0/0.08)]">
          <Slider.Range className="absolute h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--primary))]" />
        </Slider.Track>
        <Slider.Thumb
          aria-label={label}
          aria-valuetext={`${format(value)}${suffix ?? ''}`}
          className={cn(
            'block size-10 cursor-grab rounded-full border-[5px] border-white bg-primary shadow-[0_6px_16px_-4px_rgb(0_0_0/0.35)] active:cursor-grabbing',
            'transition-transform duration-150 hover:scale-105 active:scale-110',
            'focus-visible:ring-4 focus-visible:ring-[var(--ring)] focus-visible:outline-none',
          )}
        />
      </Slider.Root>
      <div className="relative mt-2 flex justify-between text-sm font-bold text-ink-3 tabular">
        <span>{format(min)}</span>
        {marks.map((m) => (
          <span
            key={m}
            className="absolute -translate-x-1/2"
            style={{ left: `calc(${((m - min) / (max - min)) * 100}% + ${(0.5 - (m - min) / (max - min)) * THUMB}px)` }}
          >
            {format(m)}
          </span>
        ))}
        <span>{format(max)}</span>
      </div>
    </div>
  )
}
