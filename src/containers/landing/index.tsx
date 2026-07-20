/**
 * The marketing landing page — a table of contents for the sections below it,
 * plus a floating launcher that keeps the assistant one click away at any scroll
 * position.
 *
 * Every "Ask ACSE AI" affordance funnels through the single `askAcseAi` handler
 * from `useLanding`, so there is exactly one place that decides what handing off
 * to the copilot means.
 */

import {
  AssistantLauncher,
  BillingSection,
  ContactSection,
  Footer,
  Hero,
  Navbar,
  PlatformSection,
  UseCasesSection,
} from '@/containers/landing/components'
import { useLanding } from '@/containers/landing/hooks/useLanding'
import { addLead } from '@/redux/demoSlice'
import { useAppDispatch } from '@/redux/hooks'

export default function Landing() {
  const { askAcseAi } = useLanding()
  const dispatch = useAppDispatch()

  return (
    <div className="min-h-screen bg-background">
      <Navbar onAskAcseAi={askAcseAi} />
      <main>
        <Hero onAskAcseAi={askAcseAi} />
        <PlatformSection />
        <UseCasesSection onAskAcseAi={askAcseAi} />
        <BillingSection onAskAcseAi={askAcseAi} />
        <ContactSection onSubmitLead={(lead) => dispatch(addLead(lead))} />
      </main>
      <Footer />

      <AssistantLauncher onAskAcseAi={askAcseAi} />
    </div>
  )
}
