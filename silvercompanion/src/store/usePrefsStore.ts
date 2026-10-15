import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type FontScale = 'md' | 'lg' | 'xl'

interface PrefsState {
  fontScale: FontScale
  /** last elder picked on the home screen / booking form */
  recipientId: number | null
  setFontScale: (scale: FontScale) => void
  setRecipientId: (id: number | null) => void
}

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      fontScale: 'md',
      recipientId: null,
      setFontScale: (fontScale) => set({ fontScale }),
      setRecipientId: (recipientId) => set({ recipientId }),
    }),
    { name: 'silvercompanion:prefs', storage: createJSONStorage(() => localStorage), version: 1 },
  ),
)
