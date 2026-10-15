import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react'
import { useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * 伴 = 亻(人) + 半. Strokes in standard order (筆順): 丿 丨 丶 丿 一 一 丨.
 * Drawn on a 米字格 practice square over faint red guide strokes (描紅),
 * the way every Taiwanese child learned to write — usually with a grandparent
 * guiding their hand.
 */
const STROKES: { d: string; person?: boolean; label: [number, number] }[] = [
  { d: 'M70 24 C 62 50, 50 76, 28 102', person: true, label: [80, 24] },
  { d: 'M54 64 L 54 184', person: true, label: [40, 120] },
  { d: 'M100 38 L 116 66', label: [92, 30] },
  { d: 'M168 34 L 150 66', label: [178, 32] },
  { d: 'M92 92 L 172 88', label: [82, 92] },
  { d: 'M80 134 L 188 128', label: [70, 136] },
  { d: 'M132 24 L 132 190', label: [144, 18] },
]

/** 0 before `from`, 1 after `to`, linear in between. */
function ramp(v: number, from: number, to: number) {
  return Math.min(1, Math.max(0, (v - from) / (to - from)))
}

const DRAW_START = 0.06
const DRAW_END = 0.6
const SPAN = (DRAW_END - DRAW_START) / STROKES.length

const LINES: { at: number; node: ReactNode }[] = [
  { at: 0.02, node: '小時候，他們握著我們的手，' },
  { at: 0.2, node: '一筆一劃，教我們寫字。' },
  {
    at: 0.42,
    node: (
      <>
        <span className="text-accent">「伴」</span>，是一個人，
        <br />
        加上另一半。
      </>
    ),
  },
  { at: 0.66, node: '現在，換我們陪他們。' },
]

export function StrokeStory() {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })

  return (
    <section
      id="story"
      data-nav="dark"
      ref={ref}
      className={cn('grain relative bg-hero text-hero-ink', reduce ? 'py-24' : 'h-[300vh] md:h-[340vh]')}
      aria-labelledby="story-title"
    >
      <div className={cn('flex flex-col items-center justify-center overflow-hidden', !reduce && 'sticky top-0 h-[100dvh]')}>
        <div className="mx-auto grid w-full max-w-[1320px] items-center gap-10 px-4 md:px-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <PracticeSheet progress={scrollYProgress} reduce={!!reduce} />
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <h2 id="story-title" className="sr-only">
              「伴」的意思：一個人，加上另一半
            </h2>
            <div className="space-y-3 font-serif text-[1.65rem] leading-[1.5] font-bold md:space-y-5 md:text-[2.6rem] md:leading-[1.4]">
              {LINES.map((l, i) => (
                <StoryLine key={i} progress={scrollYProgress} at={l.at} reduce={!!reduce}>
                  {l.node}
                </StoryLine>
              ))}
            </div>
            <Equation progress={scrollYProgress} reduce={!!reduce} />
          </div>
        </div>
      </div>
    </section>
  )
}

function StoryLine({ progress, at, reduce, children }: { progress: MotionValue<number>; at: number; reduce: boolean; children: ReactNode }) {
  // Function transformers keep these on the JS path (motion would otherwise try a native
  // scroll timeline, which mis-measures a sticky, multi-screen section).
  const k = useTransform(progress, (v) => ramp(v, at, at + 0.08))
  const opacity = useTransform(k, (t) => 0.12 + 0.88 * t)
  const y = useTransform(k, (t) => 18 * (1 - t))
  const filter = useTransform(k, (t) => `blur(${(6 * (1 - t)).toFixed(2)}px)`)
  return (
    <motion.p className="text-white" style={reduce ? undefined : { opacity, y, filter }}>
      {children}
    </motion.p>
  )
}

function Equation({ progress, reduce }: { progress: MotionValue<number>; reduce: boolean }) {
  const k = useTransform(progress, (v) => ramp(v, 0.74, 0.84))
  const opacity = useTransform(k, (t) => t)
  const y = useTransform(k, (t) => 16 * (1 - t))
  return (
    <motion.p
      className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/15 pt-6 text-lg text-hero-ink/75 md:mt-14"
      style={reduce ? undefined : { opacity, y }}
    >
      <span className="font-serif text-3xl font-black text-accent">人</span>
      <span className="font-display text-2xl">+</span>
      <span className="font-serif text-3xl font-black text-white">半</span>
      <span className="font-display text-2xl">=</span>
      <span className="font-serif text-3xl font-black text-white">伴</span>
      <span className="w-full text-base md:ml-4 md:w-auto">陪伴，就是讓一個人不再只有一個人。</span>
    </motion.p>
  )
}

function PracticeSheet({ progress, reduce }: { progress: MotionValue<number>; reduce: boolean }) {
  const tilt = useTransform(progress, (v) => -4 + 5.5 * ramp(v, 0, 1))
  return (
    <motion.figure
      className="grain relative mx-auto aspect-square w-[min(78vw,440px)] rounded-[6px] bg-[#fbf3e6] p-[6%] shadow-[0_50px_90px_-30px_rgba(0,0,0,0.7)] lg:w-full lg:max-w-[480px]"
      style={reduce ? { rotate: -2 } : { rotate: tilt }}
    >
      <svg viewBox="0 0 200 200" className="size-full overflow-visible" role="img" aria-label="依筆順寫出「伴」字：左邊是人，右邊是半">
        {/* 米字格 guide lines */}
        <g stroke="#c4541f" fill="none" strokeOpacity=".5">
          <rect x="4" y="4" width="192" height="192" strokeWidth="1.6" />
          <g strokeDasharray="4 5" strokeWidth="1" strokeOpacity=".7">
            <path d="M100 4 V196 M4 100 H196" />
            <path d="M4 4 L196 196 M196 4 L4 196" strokeOpacity=".6" />
          </g>
        </g>
        {/* 描紅: the faint red character to trace over */}
        <g fill="none" stroke="#e58a68" strokeOpacity=".35" strokeWidth="17" strokeLinecap="round" strokeLinejoin="round">
          {STROKES.map((s) => (
            <path key={s.d} d={s.d} />
          ))}
        </g>
        {/* ink */}
        {STROKES.map((s, i) => (
          <InkStroke key={s.d} stroke={s} index={i} progress={progress} reduce={reduce} />
        ))}
      </svg>
      <figcaption className="absolute -bottom-9 left-0 text-sm font-bold tracking-[0.2em] text-hero-ink/55">描紅・筆順示意</figcaption>
    </motion.figure>
  )
}

function InkStroke({ stroke, index, progress, reduce }: { stroke: (typeof STROKES)[number]; index: number; progress: MotionValue<number>; reduce: boolean }) {
  const start = DRAW_START + index * SPAN
  const pathLength = useTransform(progress, (v) => ramp(v, start, start + SPAN * 0.9))
  const labelOpacity = useTransform(progress, (v) => ramp(v, start - 0.01, start + 0.02))
  // The 亻 strokes glow persimmon once the whole character stands.
  const color = useTransform(progress, [DRAW_END, DRAW_END + 0.08], ['#2b1f18', stroke.person ? '#c4541f' : '#2b1f18'])
  return (
    <g>
      <motion.path
        d={stroke.d}
        fill="none"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={reduce ? { pathLength: 1, stroke: stroke.person ? '#c4541f' : '#2b1f18' } : { pathLength, stroke: color }}
      />
      <motion.text
        x={stroke.label[0]}
        y={stroke.label[1]}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="10"
        fontWeight="700"
        fill="#c4541f"
        fontFamily="Fraunces, serif"
        style={reduce ? undefined : { opacity: labelOpacity }}
        aria-hidden
      >
        {index + 1}
      </motion.text>
    </g>
  )
}
