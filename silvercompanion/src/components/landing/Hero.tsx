import { ArrowDown, ArrowRight, BadgeCheck, CreditCard, Navigation, ShieldAlert } from 'lucide-react'
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from 'motion/react'
import { useId, type PointerEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { LogoMark } from '@/components/common/Logo'
import { MoodFace } from '@/components/common/MoodFace'
import { UserAvatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useEntry } from '@/hooks/useEntry'
import { cn } from '@/lib/utils'
import { MiniMap } from './art'
import { EASE_OUT } from './content'

const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`

const TRUST = [
  { icon: <BadgeCheck />, label: '實名＋良民證審核' },
  { icon: <Navigation />, label: '即時位置分享' },
  { icon: <ShieldAlert />, label: '一鍵 SOS' },
  { icon: <CreditCard />, label: 'LINE Pay 付款保障' },
]

export function Hero() {
  const { seekerHref, providerHref, canPreview, preview, busy } = useEntry()
  const reduce = useReducedMotion()

  // Pointer parallax: three depths drift at different speeds.
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const sx = useSpring(px, { stiffness: 40, damping: 16 })
  const sy = useSpring(py, { stiffness: 40, damping: 16 })
  const back = useParallax(sx, sy, -22)
  const mid = useParallax(sx, sy, 16)
  const front = useParallax(sx, sy, 34)

  // The persimmon sinks a little as the page scrolls, like an afternoon sun.
  const { scrollY } = useScroll()
  const fruitY = useTransform(scrollY, (y) => Math.min(y, 1000) * 0.26)
  const fruitRotate = useTransform(scrollY, (y) => Math.min(y, 1000) * 0.014)

  const onPointerMove = (e: PointerEvent) => {
    if (reduce || e.pointerType !== 'mouse') return
    px.set(e.clientX / window.innerWidth - 0.5)
    py.set(e.clientY / window.innerHeight - 0.5)
  }

  return (
    <section
      onPointerMove={onPointerMove}
      className="relative isolate min-h-[100dvh] overflow-hidden pt-28 pb-20 md:pt-36 lg:pb-28"
      aria-labelledby="hero-title"
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -z-10 hidden lg:top-[5vw] lg:-right-[13vw] lg:block lg:w-[52vw]"
        style={reduce ? undefined : { y: fruitY, rotate: fruitRotate }}
      >
        <motion.div
          initial={reduce ? false : { y: 160, opacity: 0, scale: 0.92 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 1.8, ease: EASE_OUT }}
        >
          <motion.div style={reduce ? undefined : back}>
            <GiantPersimmon />
          </motion.div>
        </motion.div>
      </motion.div>

      <div className="mx-auto grid max-w-[1320px] gap-x-8 px-4 md:px-10 lg:grid-cols-12">
        <motion.p
          className="flex items-center gap-2.5 text-[15px] font-bold tracking-[0.12em] text-ink-2 lg:col-span-12"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE_OUT }}
        >
          <span className="relative flex size-2.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-accent opacity-60" />
            <span className="relative size-2.5 rounded-full bg-primary" />
          </span>
          台灣的銀髮陪伴媒合平台
        </motion.p>

        <h1
          id="hero-title"
          className="mt-5 font-serif text-[2.875rem] leading-[1.12] font-black tracking-[-0.01em] text-ink sm:text-[4rem] lg:col-span-12 lg:text-[5.5rem] lg:leading-[1.08] xl:text-[6.75rem]"
        >
          <Line delay={0.1}>
            你不在
            <br className="lg:hidden" />
            身邊的時候，
          </Line>
          <Line delay={0.25}>
            有人
            <span className="relative inline-block text-primary">
              陪著
              <BrushUnderline />
            </span>
            他們。
          </Line>
        </h1>

        <motion.div
          className="mt-8 max-w-xl lg:col-span-6 lg:mt-12"
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.5 }}
        >
          <p className="text-lg leading-[1.9] text-ink-2 md:text-xl md:leading-[1.9]">
            銀髮伴替爸媽媒合經過實名與良民證審核的陪伴者——陪聊天、陪看診、陪散步。出發、抵達、今天過得好不好，你都會即時知道。
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="xl" className="group">
              <Link to={seekerHref}>
                幫爸媽找陪伴 <ArrowRight className="transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild size="xl" variant="secondary">
              <Link to={providerHref}>成為陪伴者</Link>
            </Button>
          </div>
          {canPreview && (
            <p className="mt-5 flex flex-wrap items-center gap-x-1 gap-y-1 text-[15px] text-ink-3">
              不想註冊？先看示範：
              <PreviewLink onClick={() => void preview('seeker')} busy={busy === 'seeker'}>
                家屬版
              </PreviewLink>
              ・
              <PreviewLink onClick={() => void preview('provider')} busy={busy === 'provider'}>
                陪伴者版
              </PreviewLink>
            </p>
          )}
          <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-6 text-[15px] font-bold text-ink-2">
            {TRUST.map((t) => (
              <li key={t.label} className="flex items-center gap-2 [&_svg]:size-[18px] [&_svg]:shrink-0 [&_svg]:text-primary">
                {t.icon}
                {t.label}
              </li>
            ))}
          </ul>
        </motion.div>

        <div className="relative mt-14 lg:col-span-6 lg:mt-6">
          <LiveCards mid={mid} front={front} reduce={!!reduce} />
        </div>
      </div>

      <a
        href="#services"
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 rounded-full px-4 py-2 text-sm font-bold tracking-[0.2em] text-ink-3 transition-colors hover:text-ink md:flex"
      >
        往下看看
        <ArrowDown className="size-4 animate-bounce" />
      </a>
    </section>
  )
}

function useParallax(sx: MotionValue<number>, sy: MotionValue<number>, depth: number) {
  return { x: useTransform(sx, (v) => v * depth), y: useTransform(sy, (v) => v * depth * 0.75) }
}

function Line({ children, delay }: { children: ReactNode; delay: number }) {
  const reduce = useReducedMotion()
  return (
    <span className="block overflow-hidden pb-[0.08em]">
      <motion.span className="block" initial={reduce ? false : { y: '105%' }} animate={{ y: 0 }} transition={{ duration: 1.1, ease: EASE_OUT, delay }}>
        {children}
      </motion.span>
    </span>
  )
}

/** A dry-brush stroke under 陪著, drawn in once the headline has landed. */
function BrushUnderline() {
  const reduce = useReducedMotion()
  return (
    <svg viewBox="0 0 200 24" preserveAspectRatio="none" className="absolute -bottom-[0.06em] left-[-4%] h-[0.22em] w-[108%] overflow-visible" aria-hidden>
      <motion.path
        d="M4 15 C 48 7, 104 5, 196 10"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="9"
        strokeLinecap="round"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1], delay: 1.05 }}
      />
      <motion.path
        d="M30 20 C 80 15, 130 14, 176 17"
        fill="none"
        stroke="var(--accent-2)"
        strokeWidth="3"
        strokeLinecap="round"
        opacity=".8"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1], delay: 1.35 }}
      />
    </svg>
  )
}

function PreviewLink({ children, onClick, busy }: { children: ReactNode; onClick: () => void; busy: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex min-h-11 items-center gap-1 rounded-full px-2 font-bold text-primary-ink underline decoration-primary/30 decoration-2 underline-offset-4 transition-colors hover:decoration-primary disabled:opacity-60"
    >
      {busy ? '進入中…' : children}
    </button>
  )
}

/** 柿柿如意 — the logo's persimmon, grown to the size of an afternoon sun. */
function GiantPersimmon() {
  // Unique ids: the fruit is drawn twice (wide screens and phones), and duplicate
  // gradient ids would resolve to the copy hidden by display:none.
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 400 400" className="w-full drop-shadow-[0_60px_80px_rgba(196,84,31,0.28)]">
      <defs>
        <radialGradient id={`${id}-gp-body`} cx="36%" cy="34%" r="78%">
          <stop offset="0" stopColor="#ffd7a3" />
          <stop offset="0.28" stopColor="#f6a45e" />
          <stop offset="0.62" stopColor="#e7783a" />
          <stop offset="1" stopColor="#b9481c" />
        </radialGradient>
        <radialGradient id={`${id}-gp-shine`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#fff" stopOpacity=".55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-gp-leaf-a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5d8a4c" />
          <stop offset="1" stopColor="#2f5a2e" />
        </linearGradient>
        <linearGradient id={`${id}-gp-leaf-b`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#77a05a" />
          <stop offset="1" stopColor="#3e6b3a" />
        </linearGradient>
      </defs>
      <path d="M200 92c86 0 160 54 160 132 0 80-68 136-160 136S40 304 40 224c0-78 74-132 160-132Z" fill={`url(#${id}-gp-body)`} />
      <ellipse cx="128" cy="168" rx="58" ry="30" fill={`url(#${id}-gp-shine)`} transform="rotate(-30 128 168)" />
      <path d="M200 112c-14-48-62-76-116-68 14 46 62 76 116 68Z" fill={`url(#${id}-gp-leaf-a)`} />
      <path d="M200 112c14-48 62-76 116-68-14 46-62 76-116 68Z" fill={`url(#${id}-gp-leaf-b)`} />
      <path d="M200 114V46" stroke="#2f5a2e" strokeWidth="14" strokeLinecap="round" />
    </svg>
  )
}

type Layer = { x: MotionValue<number>; y: MotionValue<number> }

/** Three glimpses of the product, floating in front of the persimmon. */
function LiveCards({ mid, front, reduce }: { mid: Layer; front: Layer; reduce: boolean }) {
  const enter = (delay: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 40, scale: 0.96 }, animate: { opacity: 1, y: 0, scale: 1 }, transition: { duration: 1, ease: EASE_OUT, delay } }

  return (
    <div className="relative mx-auto grid max-w-md gap-4 sm:max-w-lg lg:block lg:h-[520px] lg:max-w-none">
      <div className="pointer-events-none absolute -top-16 -right-28 -z-10 w-[118%] sm:-right-48 lg:hidden" aria-hidden>
        <GiantPersimmon />
      </div>
      {/* Arrival notification */}
      <motion.div className="lg:absolute lg:top-0 lg:right-4 lg:w-[330px]" style={reduce ? undefined : front} {...enter(0.9)}>
        <div
          className={cn('rounded-[26px] border border-white/70 bg-white/85 p-4 shadow-lift backdrop-blur-xl lg:rotate-[2.5deg]', !reduce && 'lg:animate-float')}
        >
          <div className="flex items-center gap-2 text-sm text-ink-3">
            <LogoMark className="size-6" />
            <span className="font-bold text-ink-2">銀髮伴</span>
            <span className="ml-auto">現在</span>
          </div>
          <p className="mt-2 text-lg font-black">小君已抵達媽媽家</p>
          <p className="text-[15px] text-ink-2">09:10 準時抵達，陪同就醫服務開始。</p>
        </div>
      </motion.div>

      {/* Live map */}
      <motion.div className="lg:absolute lg:top-[92px] lg:left-0 lg:w-[400px]" style={reduce ? undefined : mid} {...enter(0.7)}>
        <div className="overflow-hidden rounded-[30px] border border-line bg-surface shadow-lift lg:-rotate-[2deg]">
          <div className="flex items-center gap-3 p-4 pb-3">
            <UserAvatar name="小君" size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-base font-black">小君正在前往</p>
              <p className="text-sm text-ink-3">陪同就醫・媽媽家</p>
            </div>
            <span className="rounded-full bg-primary-soft px-3 py-1 text-sm font-black text-primary-ink">約 6 分鐘</span>
          </div>
          <MiniMap animate={!reduce} />
          <p className="flex items-center justify-between px-4 py-3 text-sm font-bold text-ink-2">
            <span>距離 1.2 公里</span>
            <span className="flex items-center gap-1.5 text-success">
              <span className="size-2 animate-pulse-dot rounded-full bg-success" /> 即時更新中
            </span>
          </p>
        </div>
      </motion.div>

      {/* Care log */}
      <motion.div className="lg:absolute lg:right-0 lg:bottom-0 lg:w-[350px]" style={reduce ? undefined : front} {...enter(1.1)}>
        <div
          className={cn(
            'rounded-[28px] border border-line bg-surface p-5 shadow-lift lg:rotate-[1.5deg]',
            !reduce && 'lg:animate-[float_7s_ease-in-out_1.2s_infinite]',
          )}
        >
          <div className="flex items-center gap-3">
            <MoodFace mood="happy" className="size-11" label={false} />
            <div>
              <p className="text-base font-black">今天的聯絡簿</p>
              <p className="text-sm font-bold text-success">媽媽的心情：開心</p>
            </div>
          </div>
          <p className="mt-3 font-serif text-[17px] leading-[1.8] text-ink">「醫師說血壓控制得很好，藥量不變。回程吃了碗熱湯麵，她說好久沒出門吃飯了。」</p>
          <div className="mt-3 flex items-center gap-2">
            <img src={asset('demo/hospital.svg')} alt="" className="size-14 rounded-xl object-cover" />
            <img src={asset('demo/tea.svg')} alt="" className="size-14 rounded-xl object-cover" />
            <span className="ml-auto text-sm text-ink-3">— 陪伴者 小君</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
