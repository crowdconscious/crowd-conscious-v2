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
import { loadBulletinBoard } from '@/lib/ciceron/boletines/demo-data'
import { countDeadlinesInCurrentWeek } from '@/lib/ciceron/deadlines/week-window-pure'
import { loadDeadlines } from '@/lib/ciceron/demo/data'
import { loadGuidedStory } from '@/lib/ciceron/demo/guided-story'
import { personaHomeKind } from '@/lib/ciceron/demo/persona-home-pure'
import {
  PRO_DEMO_CLIENTS,
  mergeProClientsWithHits,
  type ProPersonaRole,
} from '@/lib/ciceron/demo/pro-assistant-pure'
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
  const [m365, reviewBadge, guidedStory, inviteMintedAdmin, bulletins, { deadlines }] =
    await Promise.all([
      loadM365Status(persona),
      loadReviewBadgeCount(persona),
      loadGuidedStory(session),
      inviteMintedForAdmin(session.inviteCodeId),
      loadBulletinBoard(persona),
      loadDeadlines(persona),
    ])

  const proClients = mergeProClientsWithHits(
    PRO_DEMO_CLIENTS,
    bulletins.hits.map((h) => ({
      id: h.id,
      clientName: h.clientName,
      courtName: h.courtName,
      expedienteNumber: h.expedienteNumber,
      summary: h.summary,
      publicationDate: h.publicationDate,
      caseFileId: h.caseFileId,
      matterId: h.matterId,
      stateName: h.stateName,
    }))
  )
  const dueAts = deadlines.map((d) => d.dueAt).filter((v): v is string => Boolean(v))
  const proPlazosSoonCount = countDeadlinesInCurrentWeek(dueAts)
  const proClientsMovedCount = new Set(
    bulletins.hits.map((h) => h.clientName).filter(Boolean)
  ).size

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
        proRole: personaHomeKind(persona.role, persona.id) as ProPersonaRole,
        proClients,
        proPlazosSoonCount,
        proClientsMovedCount,
      }}
    >
      {children}
    </CiceronShell>
  )
}
