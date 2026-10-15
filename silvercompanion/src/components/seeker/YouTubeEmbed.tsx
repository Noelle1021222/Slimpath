import { Play } from 'lucide-react'
import { useState } from 'react'
import { UserAvatar } from '@/components/ui/avatar'
import { youTubeEmbedUrl } from '@/lib/youtube'

/**
 * Spec 4.2.2 — responsive 16:9 player. The YouTube iframe (~1 MB of script)
 * only loads after a tap, keeping the profile page fast on mobile data.
 */
export function YouTubeEmbed({ videoId, name, avatar }: { videoId: string; name: string; avatar?: string | null }) {
  const [playing, setPlaying] = useState(false)
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-3xl bg-hero shadow-soft">
      {playing ? (
        <iframe
          className="absolute inset-0 size-full"
          src={youTubeEmbedUrl(videoId, true)}
          title={`${name} 的自我介紹影片`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 flex flex-col justify-end p-6 text-left text-white focus-visible:ring-4 focus-visible:ring-[var(--ring)] focus-visible:outline-none md:p-8"
          style={{ background: 'radial-gradient(120% 120% at 85% 10%, #e9803f 0%, #8e3510 45%, #2b1f18 100%)' }}
        >
          <span className="absolute top-1/2 left-1/2 grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-[#b5481b] shadow-lift transition-transform duration-300 group-hover:scale-110 md:size-24">
            <span className="absolute inset-0 animate-sos-ring rounded-full bg-white/60" aria-hidden />
            <Play className="relative ml-1 size-9 fill-current md:size-10" />
          </span>
          <span className="relative flex items-center gap-3">
            <UserAvatar name={name} src={avatar} size="md" ring />
            <span>
              <span className="block text-sm font-bold tracking-[0.2em] text-white/70">VIDEO・3 MIN</span>
              <span className="block font-serif text-2xl font-black md:text-3xl">3 分鐘認識{name}</span>
              <span className="sr-only">（播放自我介紹影片）</span>
            </span>
          </span>
        </button>
      )}
    </div>
  )
}
