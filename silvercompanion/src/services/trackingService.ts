import type { RealtimeChannel } from '@supabase/supabase-js'
import type { TrackingPoint } from '@/types'
import type { TrackingService } from './contracts'
import { demoBackend } from './demo/backend'
import { isDemo } from './env'
import { db } from './supabaseClient'

export const trackingChannelName = (orderId: string) => `tracking:order_${orderId}`

/**
 * Spec 5.1 — positions travel over a private Supabase Realtime Broadcast
 * channel (`tracking:order_{id}`) instead of being written to the database.
 * The latest fix is also kept in Presence so a family member who opens the
 * map mid-trip sees the companion immediately instead of waiting for the next
 * broadcast. realtime.messages RLS only lets the assigned companion send.
 */
const supabaseTracking: TrackingService = {
  publisher(orderId) {
    let channel: RealtimeChannel | null = db().channel(trackingChannelName(orderId), {
      config: { private: true, broadcast: { self: false, ack: false } },
    })
    let ready = false
    let pending: TrackingPoint | null = null
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        ready = true
        if (pending) send(pending)
      }
    })
    const send = (point: TrackingPoint) => {
      if (!channel) return
      if (!ready) {
        pending = point
        return
      }
      void channel.send({ type: 'broadcast', event: 'location', payload: point })
      void channel.track({ ...point })
    }
    return {
      send,
      close() {
        if (channel) {
          void channel.untrack()
          void db().removeChannel(channel)
        }
        channel = null
      },
    }
  },
  subscribe(orderId, onPoint) {
    const channel = db()
      .channel(trackingChannelName(orderId), { config: { private: true } })
      .on('broadcast', { event: 'location' }, ({ payload }) => onPoint(payload as TrackingPoint))
      .on('presence', { event: 'sync' }, () => {
        const latest = Object.values(channel.presenceState<TrackingPoint>())
          .flat()
          .sort((a, b) => b.at - a.at)[0]
        if (latest) onPoint({ lat: latest.lat, lng: latest.lng, accuracy: latest.accuracy, heading: latest.heading, speed: latest.speed, at: latest.at })
      })
      .subscribe()
    return () => {
      void db().removeChannel(channel)
    }
  },
}

export const trackingService: TrackingService = isDemo ? demoBackend.tracking : supabaseTracking
