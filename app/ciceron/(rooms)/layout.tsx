import { redirect } from 'next/navigation'
import { CiceronShell } from '../_components/CiceronShell'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { loadM365Status } from '@/lib/ciceron/case-files/data'
import { isProspectDemoSession } from '@/lib/ciceron/demo/rail-visibility'
import {
  getCiceronDemoSessionFull,
  sessionMeta,
  switchablePersonasForFirm,
} from '@/lib/ciceron/demo/session'
import { loadGuidedStory } from '@/lib/ciceron/demo/guided-story'
import { loadReviewBadgeCount } from '@/lib/ciceron/review/data'
import { CICERON_SEED } from '@/lib/ciceron/db/seed-ids'

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
  const [m365, reviewBadge, guidedStory] = await Promise.all([
    loadM365Status(persona),
    loadReviewBadgeCount(persona),
    loadGuidedStory(session),
  ])

  const switchable = switchablePersonasForFirm(persona.firmId).map((p) => ({
    id: p.id,
    role: p.role,
    displayName: p.displayName,
  }))

  // Prospect = non-admin role, or invite that is not an admin mint.
  // Public demo invites never mint admin; runtime admin mints use admin persona.
  const inviteIsAdminMint =
    persona.role === 'admin' && persona.id === CICERON_SEED.personas.admin
  const isProspectSession = isProspectDemoSession({
    role: persona.role,
    inviteIsAdminMint,
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
