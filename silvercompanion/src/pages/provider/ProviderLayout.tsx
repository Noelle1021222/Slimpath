import { AppShell } from '@/components/common/AppShell'
import { ChatSheet } from '@/components/common/ChatSheet'
import { SOSModal } from '@/components/common/SOSModal'
import { TrackingHost } from '@/components/common/TrackingHost'
import { TrackingPublisher } from '@/components/provider/TrackingPublisher'
import { useRealtimeBridge } from '@/hooks/useRealtimeBridge'

export default function ProviderLayout() {
  useRealtimeBridge()
  return (
    <>
      <AppShell role="provider" />
      <TrackingPublisher />
      <ChatSheet />
      <SOSModal />
      <TrackingHost />
    </>
  )
}
