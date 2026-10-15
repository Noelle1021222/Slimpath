import { useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from './useMediaQuery'

/** Animates a number towards `value` (eased), for dashboard figures. */
export function useCountUp(value: number, duration = 900) {
  const reduce = usePrefersReducedMotion()
  const [shown, setShown] = useState(reduce ? value : 0)
  const from = useRef(reduce ? value : 0)

  useEffect(() => {
    if (reduce) {
      setShown(value)
      return
    }
    const start = performance.now()
    const begin = from.current
    let raf = 0
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration)
      const eased = 1 - (1 - k) ** 3
      const next = begin + (value - begin) * eased
      setShown(next)
      if (k < 1) raf = requestAnimationFrame(tick)
      else from.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration, reduce])

  return shown
}
