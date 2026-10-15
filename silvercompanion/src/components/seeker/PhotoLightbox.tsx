import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ResponsiveModal } from '@/components/ui/responsive-modal'

export function PhotoLightbox({
  photos,
  index,
  onIndex,
  onClose,
  caption,
}: {
  photos: string[]
  index: number | null
  onIndex: (i: number) => void
  onClose: () => void
  caption?: string
}) {
  const open = index !== null
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') onIndex(Math.min(photos.length - 1, (index ?? 0) + 1))
      if (e.key === 'ArrowLeft') onIndex(Math.max(0, (index ?? 0) - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, index, photos.length, onIndex])

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(v) => !v && onClose()}
      size="xl"
      title={caption ?? '服務照片'}
      description={open ? `第 ${(index ?? 0) + 1} / ${photos.length} 張` : undefined}
    >
      {open && (
        <div className="relative">
          <img src={photos[index!]} alt={`服務照片 ${index! + 1}`} className="max-h-[66dvh] w-full rounded-3xl bg-surface-2 object-contain" />
          {photos.length > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <Button variant="secondary" size="lg" disabled={index === 0} onClick={() => onIndex(index! - 1)}>
                <ChevronLeft /> 上一張
              </Button>
              <Button variant="secondary" size="lg" disabled={index === photos.length - 1} onClick={() => onIndex(index! + 1)}>
                下一張 <ChevronRight />
              </Button>
            </div>
          )}
        </div>
      )}
    </ResponsiveModal>
  )
}
