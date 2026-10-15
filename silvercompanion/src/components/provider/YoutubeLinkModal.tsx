import { CheckCircle2, CircleAlert, Trash2, Youtube } from 'lucide-react'
import { useEffect, useState } from 'react'
import { YouTubeEmbed } from '@/components/seeker/YouTubeEmbed'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ResponsiveModal } from '@/components/ui/responsive-modal'
import { useUpdateProvider } from '@/hooks/useProviderMutations'
import { parseYouTubeId } from '@/lib/youtube'
import { useUserStore } from '@/store/useUserStore'
import type { ProviderDetails } from '@/types'

/** Spec 4.3.1 — paste any YouTube link; the 11-character id is extracted live. */
export function YoutubeLinkModal({ open, onOpenChange, details }: { open: boolean; onOpenChange: (open: boolean) => void; details: ProviderDetails }) {
  const name = useUserStore((s) => s.profile?.nickname ?? s.profile?.full_name ?? '')
  const [url, setUrl] = useState('')
  const update = useUpdateProvider('自我介紹影片已更新')
  useEffect(() => {
    if (open) setUrl(details.youtube_video_id ? `https://youtu.be/${details.youtube_video_id}` : '')
  }, [open, details.youtube_video_id])
  const id = parseYouTubeId(url)

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="自我介紹影片"
      description="3 分鐘的自我介紹，讓家屬更快認識您、更放心預約。"
      footer={
        <div className="flex gap-3">
          {details.youtube_video_id && (
            <Button variant="dangerSoft" size="lg" onClick={() => update.mutate({ youtube_video_id: null }, { onSuccess: () => onOpenChange(false) })}>
              <Trash2 /> 移除
            </Button>
          )}
          <Button
            size="lg"
            className="flex-1"
            disabled={!id || id === details.youtube_video_id}
            loading={update.isPending}
            onClick={() => update.mutate({ youtube_video_id: id }, { onSuccess: () => onOpenChange(false) })}
          >
            <Youtube /> 儲存影片
          </Button>
        </div>
      }
    >
      <Field
        label="YouTube 影片網址"
        hint="支援 youtube.com/watch、youtu.be、Shorts、直播與內嵌連結"
        error={url && !id ? '看不出是哪支影片，請確認網址是否完整。' : null}
      >
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtu.be/…" inputMode="url" autoComplete="off" />
      </Field>
      <p className="mt-3 flex items-center gap-2 text-[15px]">
        {id ? (
          <>
            <CheckCircle2 className="size-5 text-success" /> 已辨識影片 ID：<code className="rounded-lg bg-surface-2 px-2 py-0.5 font-mono text-sm">{id}</code>
          </>
        ) : (
          <>
            <CircleAlert className="size-5 text-ink-3" /> <span className="text-ink-3">貼上網址後會自動辨識</span>
          </>
        )}
      </p>
      {id && (
        <div className="mt-5">
          <YouTubeEmbed videoId={id} name={name} />
        </div>
      )}
    </ResponsiveModal>
  )
}
