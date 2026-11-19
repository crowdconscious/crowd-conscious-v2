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

/** Server composition panel — keeps monitor-dof page edits minimal. */
export async function MatchCollaborationPanel({
  persona,
  matchId,
  compact = false,
}: {
  persona: DemoPersona
  matchId: string
  compact?: boolean
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
