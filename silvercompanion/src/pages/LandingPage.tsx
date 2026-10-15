import { MotionConfig } from 'motion/react'
import { useEffect } from 'react'
import { Faq, FinalCta, LandingFooter } from '@/components/landing/Closing'
import { DayTimeline } from '@/components/landing/DayTimeline'
import { Hero } from '@/components/landing/Hero'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { LandingNav } from '@/components/landing/LandingNav'
import { CompanionSection, DualPaths } from '@/components/landing/Paths'
import { SafetyBento } from '@/components/landing/SafetyBento'
import { ServiceMarquee, ServicesIndex } from '@/components/landing/ServicesIndex'
import { StrokeStory } from '@/components/landing/StrokeStory'

/**
 * The public front door. One long, quiet story: the worry (hero), what we do
 * (services), why it matters (伴), how it works, who it is for, how we keep
 * everyone safe, what a day feels like — then the questions people really ask.
 */
export default function LandingPage() {
  // The marketing site always wears the warm family theme, even for a signed-in companion.
  useEffect(() => {
    const root = document.documentElement
    const previous = root.dataset.theme
    root.dataset.theme = 'seeker'
    return () => {
      if (previous) root.dataset.theme = previous
    }
  }, [])

  return (
    <MotionConfig reducedMotion="user">
      <a href="#main" className="sr-only z-50 rounded-xl bg-ink px-4 py-3 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        跳到主要內容
      </a>
      <LandingNav />
      <main id="main" className="overflow-x-clip bg-bg">
        <Hero />
        <ServiceMarquee />
        <ServicesIndex />
        <StrokeStory />
        <HowItWorks />
        <DualPaths />
        <CompanionSection />
        <SafetyBento />
        <DayTimeline />
        <Faq />
        <FinalCta />
      </main>
      <LandingFooter />
    </MotionConfig>
  )
}
