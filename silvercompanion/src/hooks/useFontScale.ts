import { useEffect } from 'react'
import { usePrefsStore } from '@/store/usePrefsStore'

/** Applies the persisted font scale to <html>. Mount once. */
export function useApplyFontScale() {
  const scale = usePrefsStore((s) => s.fontScale)
  useEffect(() => {
    document.documentElement.dataset.fontScale = scale
  }, [scale])
}
