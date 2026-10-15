import { useEffect } from 'react'

/** Keeps the screen awake while navigating (Screen Wake Lock API). */
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return
    let sentinel: WakeLockSentinel | null = null
    let cancelled = false
    const request = async () => {
      try {
        sentinel = await navigator.wakeLock.request('screen')
      } catch {
        /* user agent refused (battery saver, background tab) */
      }
    }
    void request()
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !cancelled) void request()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void sentinel?.release().catch(() => undefined)
    }
  }, [enabled])
}
