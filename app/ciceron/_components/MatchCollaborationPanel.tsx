import Link from 'next/link'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { copy } from '@/lib/ciceron/copy/es-MX'
import {
  loadAssignmentsForMatch,
  loadFirmMembers,
  loadMatchComments,
  loadMattersForMatchClient,
} from '@/lib/ciceron/collaboration/data'
import type { DemoPersona } from '@/lib/ciceron/demo/personas'
import { MatchAssignControl } from './MatchAssignControl'
import { MatchCommentThread } from './MatchCommentThread'
import { WhatsAppShareButton } from './WhatsAppShareButton'

/** Server composition panel — keeps monitor-dof page edits minimal. */
export async function MatchCollaborationPanel({
  persona,
  matchId,
  compact = false,
  whatsapp,
}: {
  persona: DemoPersona
  matchId: string
  compact?: boolean
  whatsapp?: {
    clientName: string
    headline: string
    detail?: string
    officialUrl?: string
  }
}) {
  const [members, matters, assignments, comments] = await Promise.all([
    loadFirmMembers(persona),
    loadMattersForMatchClient(persona, matchId),
    loadAssignmentsForMatch(persona, matchId),
    loadMatchComments(persona, matchId),
  ])

  return (
    <section
      className="cic-section"
      aria-label={copy.collab.panelLabel}
      style={{
        marginTop: 8,
        paddingTop: 8,
        borderTop: '1px solid color-mix(in srgb, currentColor 10%, transparent)',
      }}
    >
      {whatsapp ? (
        <div style={{ marginBottom: 12 }}>
          <WhatsAppShareButton
            clientName={whatsapp.clientName}
            headline={whatsapp.headline}
            detail={whatsapp.detail}
            sourceLabel="Diario Oficial de la Federación"
            officialUrl={whatsapp.officialUrl}
          />
          <p className="cic-muted" style={{ fontSize: '0.75rem', marginTop: 6 }}>
            {copy.whatsapp.sendNote}
          </p>
        </div>
      ) : null}
      <MatchAssignControl
        matchId={matchId}
        members={members}
        matters={matters}
        assignments={assignments}
      />
      {!compact ? (
        <MatchCommentThread
          matchId={matchId}
          matters={matters}
          members={members}
          comments={comments}
          currentActorId={persona.id}
        />
      ) : (
        <p style={{ marginTop: 12, fontSize: '0.85rem' }}>
          <Link href={`${CICERON_BASE}/monitor-dof/${matchId}`}>
            {copy.collab.openThread}
          </Link>
        </p>
      )}
    </section>
  )
}
