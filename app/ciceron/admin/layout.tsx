import { redirect } from 'next/navigation'
import { CiceronShell } from '../_components/CiceronShell'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { CICERON_SEED } from '@/lib/ciceron/db/seed-ids'
import { isProspectDemoSession } from '@/lib/ciceron/demo/rail-visibility'
import {
  getCiceronDemoSessionFull,
  sessionMeta,
  switchablePersonasForFirm,
} from '@/lib/ciceron/demo/session'
import { loadGuidedStory } from '@/lib/ciceron/demo/guided-story'

export default async function CiceronAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getCiceronDemoSessionFull()
  if (!session) redirect(CICERON_BASE)
  if (session.persona.role !== 'admin') {
    redirect(`${CICERON_BASE}/hoy`)
  }

  const persona = session.persona
  const guidedStory = await loadGuidedStory(session)
  const switchable = switchablePersonasForFirm(persona.firmId).map((p) => ({
    id: p.id,
    role: p.role,
    displayName: p.displayName,
  }))

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
        switchablePersonas: switchable,
        guidedStory,
        isProspectSession,
      }}
    >
      {children}
    </CiceronShell>
  )
}
