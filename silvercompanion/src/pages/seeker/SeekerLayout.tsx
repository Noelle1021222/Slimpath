import { AppShell } from '@/components/common/AppShell'
import { ChatSheet } from '@/components/common/ChatSheet'
import { SOSModal } from '@/components/common/SOSModal'
import { TrackingHost } from '@/components/common/TrackingHost'
import { useRealtimeBridge } from '@/hooks/useRealtimeBridge'

export default function SeekerLayout() {
  useRealtimeBridge()
  return (
    <>
      <AppShell role="seeker" />
      <ChatSheet />
      <SOSModal />
      <TrackingHost />
    </>
  )
}
