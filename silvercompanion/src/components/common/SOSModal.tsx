import { Check, MapPin, MessageSquareText, Phone, PhoneCall, ShieldAlert, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Dialog } from 'radix-ui'
import { useEffect, useRef, useState } from 'react'
import { Spinner } from '@/components/ui/spinner'
import { getCurrentPosition, getLastKnownPosition } from '@/hooks/useGeolocation'
import { useKinship } from '@/hooks/queries'
import { formatPhone } from '@/lib/format'
import { googleMapsPinUrl } from '@/lib/geo'
import { cn, haptic } from '@/lib/utils'
import { sosService } from '@/services'
import { useUIStore } from '@/store/useUIStore'
import { useUserStore } from '@/store/useUserStore'
import type { LatLng, SosLocationSource } from '@/types'

type StepState = 'idle' | 'working' | 'done' | 'failed'

interface Steps {
  locate: StepState
  notify: StepState
  call: StepState
}

/** Red, pulsing, always in the top bar (spec 5.3). */
export function SOSButton({ className, withLabel }: { className?: string; withLabel?: boolean }) {
  const open = useUIStore((s) => s.openSos)
  return (
    <button
      type="button"
      onClick={() => {
        haptic([20, 40, 20])
        open()
      }}
      aria-label="SOS 緊急求助"
      className={cn(
        'group relative inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-danger pr-4 pl-3 font-black tracking-wider text-white',
        'shadow-[0_8px_22px_-8px_rgba(198,47,43,0.75)] transition-transform hover:bg-danger-strong active:scale-95',
        'focus-visible:ring-4 focus-visible:ring-danger/40 focus-visible:outline-none',
        className,
      )}
    >
      <span aria-hidden className="pointer-events-none absolute inset-0 animate-halo rounded-full bg-danger" />
      <span aria-hidden className="pointer-events-none absolute inset-0 animate-halo rounded-full bg-danger [animation-delay:0.9s]" />
      <ShieldAlert className="relative size-5" strokeWidth={2.4} />
      <span className="relative text-[15px]">SOS</span>
      {withLabel && <span className="relative hidden text-[15px] font-bold tracking-normal lg:inline">緊急求助</span>}
    </button>
  )
}

/**
 * Full-screen, high-priority confirmation. Tapping「立即撥打 119」follows a
 * real tel: link (so the dialer always opens, even on iOS) while in the
 * background we record the GPS fix to sos_alerts and text the emergency
 * contact a map link through the sos-notify edge function.
 */
export function SOSModal() {
  const open = useUIStore((s) => s.sosOpen)
  const close = useUIStore((s) => s.closeSos)
  const profile = useUserStore((s) => s.profile)
  const kinship = useKinship()
  const [steps, setSteps] = useState<Steps>({ locate: 'idle', notify: 'idle', call: 'idle' })
  const [location, setLocation] = useState<{ point: LatLng; source: SosLocationSource } | null>(null)
  const [notified, setNotified] = useState<{ ok: boolean; name: string | null } | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (!open) {
      started.current = false
      setSteps({ locate: 'idle', notify: 'idle', call: 'idle' })
      setLocation(null)
      setNotified(null)
    }
  }, [open])

  const contactName = profile?.emergency_contact_name
  const contactPhone = profile?.emergency_contact_phone

  const runSos = async () => {
    if (started.current) return
    started.current = true
    haptic([60, 40, 60])
    setSteps({ locate: 'working', notify: 'idle', call: 'done' })

    let point: LatLng | null = null
    let source: SosLocationSource = 'gps'
    let accuracy: number | null = null
    try {
      const fix = await getCurrentPosition(5000)
      point = { lat: fix.lat, lng: fix.lng }
      accuracy = fix.accuracy
    } catch {
      const last = getLastKnownPosition()
      const home = kinship.data?.find((k) => k.lat != null && k.lng != null)
      if (last) {
        point = { lat: last.lat, lng: last.lng }
        source = 'last_known'
      } else if (home?.lat != null && home.lng != null) {
        point = { lat: home.lat, lng: home.lng }
        source = 'home'
      }
    }
    setSteps((s) => ({ ...s, locate: point ? 'done' : 'failed', notify: point ? 'working' : 'failed' }))
    if (!point) return
    setLocation({ point, source })
    try {
      const res = await sosService.trigger({ lat: point.lat, lng: point.lng, accuracy, source })
      setNotified({ ok: res.notified, name: res.contactName ?? contactName ?? null })
      setSteps((s) => ({ ...s, notify: res.notified ? 'done' : 'failed' }))
    } catch {
      setSteps((s) => ({ ...s, notify: 'failed' }))
    }
  }

  const active = steps.call !== 'idle'

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && close()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Content asChild forceMount aria-describedby="sos-desc">
              <motion.div
                className="fixed inset-0 z-[80] flex flex-col overflow-y-auto text-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ background: 'radial-gradient(140% 90% at 50% 0%, #e2453c 0%, #b3261e 55%, #7d1712 100%)' }}
              >
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute top-[18%] left-1/2 size-[520px] -translate-x-1/2 rounded-full border border-white/15"
                  animate={{ scale: [0.7, 1.15], opacity: [0.6, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
                />
                <div className="relative mx-auto flex w-full max-w-lg flex-1 flex-col px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-base font-bold">
                      <ShieldAlert className="size-5" /> 緊急求助
                    </span>
                    <Dialog.Close
                      className="grid size-12 place-items-center rounded-full bg-white/15 transition-colors hover:bg-white/25 focus-visible:ring-4 focus-visible:ring-white/50 focus-visible:outline-none"
                      aria-label="關閉緊急求助"
                    >
                      <X className="size-6" />
                    </Dialog.Close>
                  </div>

                  <div className="mt-10 text-center">
                    <Dialog.Title className="font-serif text-[40px] leading-tight font-black tracking-wide whitespace-pre-line md:text-5xl">
                      {active ? '保持冷靜，\n協助正在路上' : '需要緊急協助嗎？'}
                    </Dialog.Title>
                    <Dialog.Description id="sos-desc" className="mx-auto mt-4 max-w-sm text-lg leading-relaxed text-white/90">
                      {active
                        ? '我們已撥打 119，並把您的位置傳給緊急聯絡人。'
                        : `按下後會撥打 119，同時把您的位置傳給${contactName ? ` ${contactName}` : '緊急聯絡人'}。`}
                    </Dialog.Description>
                  </div>

                  <div className="mt-10 space-y-3">
                    <a
                      href="tel:119"
                      onClick={() => void runSos()}
                      className="flex h-20 w-full items-center justify-center gap-3 rounded-3xl bg-white text-2xl font-black text-danger-strong shadow-[0_20px_50px_-12px_rgba(0,0,0,0.45)] transition-transform focus-visible:ring-4 focus-visible:ring-white/60 focus-visible:outline-none active:scale-[0.98]"
                    >
                      <PhoneCall className="size-8" strokeWidth={2.5} />
                      {active ? '再次撥打 119' : '立即撥打 119'}
                    </a>
                    {contactPhone && (
                      <a
                        href={`tel:${contactPhone}`}
                        className="flex h-16 w-full items-center justify-center gap-3 rounded-3xl border-2 border-white/40 text-lg font-bold transition-colors hover:bg-white/10 focus-visible:ring-4 focus-visible:ring-white/50 focus-visible:outline-none"
                      >
                        <Phone className="size-6" />
                        撥給 {contactName ?? '緊急聯絡人'}（{formatPhone(contactPhone)}）
                      </a>
                    )}
                  </div>

                  {active && (
                    <motion.ol
                      className="mt-8 space-y-3 rounded-3xl bg-black/20 p-5 backdrop-blur"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      aria-live="polite"
                    >
                      <StepRow state={steps.call} icon={<PhoneCall className="size-5" />} label="撥打 119" detail="若沒有跳出撥號畫面，請直接用電話撥打 119" />
                      <StepRow
                        state={steps.locate}
                        icon={<MapPin className="size-5" />}
                        label="取得目前位置"
                        detail={
                          location ? (
                            <a href={googleMapsPinUrl(location.point)} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                              {location.source === 'gps' ? '精確定位' : location.source === 'last_known' ? '最近一次定位' : '長輩住家（約略）'}・在地圖上查看
                            </a>
                          ) : steps.locate === 'failed' ? (
                            '無法取得定位，請口頭告知 119 您的地址'
                          ) : (
                            '定位中…'
                          )
                        }
                      />
                      <StepRow
                        state={steps.notify}
                        icon={<MessageSquareText className="size-5" />}
                        label={`通知${notified?.name ?? contactName ?? '緊急聯絡人'}`}
                        detail={
                          steps.notify === 'done'
                            ? '已傳送含地圖連結的簡訊'
                            : steps.notify === 'failed'
                              ? contactPhone
                                ? '簡訊未送出，請改用上方按鈕直接撥打'
                                : '尚未設定緊急聯絡人（可在「我的」設定）'
                              : '傳送中…'
                        }
                      />
                    </motion.ol>
                  )}

                  <div className="mt-auto pt-8">
                    <Dialog.Close className="h-14 w-full rounded-2xl text-lg font-bold text-white/90 transition-colors hover:bg-white/10 focus-visible:ring-4 focus-visible:ring-white/50 focus-visible:outline-none">
                      {active ? '我沒事了，關閉' : '取消，我按錯了'}
                    </Dialog.Close>
                  </div>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}

function StepRow({ state, icon, label, detail }: { state: StepState; icon: React.ReactNode; label: string; detail: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={cn(
          'mt-0.5 grid size-9 shrink-0 place-items-center rounded-full',
          state === 'done' ? 'bg-white text-danger-strong' : state === 'failed' ? 'bg-white/20 text-white' : 'bg-white/15 text-white',
        )}
      >
        {state === 'working' ? <Spinner className="size-5" /> : state === 'done' ? <Check className="size-5" strokeWidth={3} /> : icon}
      </span>
      <span className="min-w-0">
        <span className="block text-lg font-bold">{label}</span>
        <span className="block text-[15px] leading-snug text-white/80">{detail}</span>
      </span>
    </li>
  )
}
