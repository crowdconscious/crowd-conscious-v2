import { redirect } from 'next/navigation'
import { CiceronShell } from '../_components/CiceronShell'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { loadM365Status } from '@/lib/ciceron/case-files/data'
import { isProspectDemoSession } from '@/lib/ciceron/demo/rail-visibility'
import {
  getCiceronDemoSessionFull,
  inviteMintedForAdmin,
  sessionMeta,
  switchablePersonasForFirm,
} from '@/lib/ciceron/demo/session'
import { loadGuidedStory } from '@/lib/ciceron/demo/guided-story'
import { loadReviewBadgeCount } from '@/lib/ciceron/review/data'

export default async function CiceronRoomsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getCiceronDemoSessionFull()
  if (!session) {
    redirect(CICERON_BASE)
  }

  const persona = session.persona
  const [m365, reviewBadge, guidedStory, inviteMintedAdmin] = await Promise.all([
    loadM365Status(persona),
    loadReviewBadgeCount(persona),
    loadGuidedStory(session),
    inviteMintedForAdmin(session.inviteCodeId),
  ])

  const switchable = switchablePersonasForFirm(persona.firmId, {
    includeAdmin: inviteMintedAdmin,
  }).map((p) => ({
    id: p.id,
    role: p.role,
    displayName: p.displayName,
  }))

  const isProspectSession = isProspectDemoSession({
    role: persona.role,
    inviteMintedForAdmin: inviteMintedAdmin,
  })

  return (
    <CiceronShell
      meta={{
        ...sessionMeta(persona),
        personaId: persona.id,
        m365Status: m365.status,
        reviewBadge,
        switchablePersonas: switchable,
        guidedStory,
        isProspectSession,
      }}
    >
      {children}
    </CiceronShell>
  )
}
