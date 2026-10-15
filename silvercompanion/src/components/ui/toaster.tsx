import { Toaster as Sonner } from 'sonner'
import { useIsDesktop } from '@/hooks/useMediaQuery'

export function Toaster() {
  const desktop = useIsDesktop()
  return (
    <Sonner
      position={desktop ? 'bottom-right' : 'top-center'}
      closeButton
      richColors
      duration={5000}
      gap={10}
      offset={desktop ? 24 : 16}
      toastOptions={{
        classNames: {
          toast: '!rounded-2xl !border !border-line !px-5 !py-4 !shadow-lift !text-base',
          title: '!text-base !font-bold',
          description: '!text-[15px] !leading-relaxed',
          closeButton: '!size-7 !border-line',
          actionButton: '!h-10 !shrink-0 !rounded-xl !bg-primary !px-4 !text-sm !font-bold !text-on-primary',
          cancelButton: '!h-10 !shrink-0 !rounded-xl !px-4 !text-sm !font-bold',
        },
      }}
    />
  )
}
