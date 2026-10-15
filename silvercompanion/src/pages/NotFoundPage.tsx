import { Link } from 'react-router'
import { LogoMark } from '@/components/common/Logo'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-bg px-6 text-center">
      <div className="max-w-md">
        <div className="relative mx-auto w-fit">
          <LogoMark className="size-24 animate-float" />
        </div>
        <p className="mt-8 font-display text-7xl font-semibold text-primary">404</p>
        <h1 className="mt-2 text-3xl">這一頁走丟了</h1>
        <p className="mt-3 text-lg text-ink-2">可能是網址打錯，或頁面已經搬家。我們陪您回到熟悉的地方。</p>
        <Button asChild size="lg" className="mt-8">
          <Link to="/">回到首頁</Link>
        </Button>
      </div>
    </div>
  )
}
