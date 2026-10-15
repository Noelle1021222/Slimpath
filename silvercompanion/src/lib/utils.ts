import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      shadow: [{ shadow: ['soft', 'lift', 'glow'] }],
      'font-family': [{ font: ['num', 'heading', 'display', 'serif', 'sans'] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function uid() {
  return crypto.randomUUID()
}

/** Vibrate briefly on devices that support it (ignored elsewhere). */
export function haptic(pattern: number | number[] = 8) {
  try {
    if ('vibrate' in navigator) navigator.vibrate(pattern)
  } catch {
    /* not supported */
  }
}
