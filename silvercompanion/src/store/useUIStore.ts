import { create } from 'zustand'

export interface ChatTarget {
  partnerId: string
  name: string
  avatar?: string | null
}

export interface TrackingView {
  orderId: string
  mode: 'sender' | 'receiver'
}

interface UIState {
  sosOpen: boolean
  chat: ChatTarget | null
  tracking: TrackingView | null
  openSos: () => void
  closeSos: () => void
  openChat: (target: ChatTarget) => void
  closeChat: () => void
  openTracking: (view: TrackingView) => void
  closeTracking: () => void
}

export const useUIStore = create<UIState>((set) => ({
  sosOpen: false,
  chat: null,
  tracking: null,
  openSos: () => set({ sosOpen: true }),
  closeSos: () => set({ sosOpen: false }),
  openChat: (chat) => set({ chat }),
  closeChat: () => set({ chat: null }),
  openTracking: (tracking) => set({ tracking }),
  closeTracking: () => set({ tracking: null }),
}))
