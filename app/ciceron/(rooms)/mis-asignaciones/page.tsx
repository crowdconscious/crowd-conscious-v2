import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { loadMyAssignments } from '@/lib/ciceron/collaboration/data'
import { updateAssignmentStatusAction } from '@/lib/ciceron/collaboration/actions'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'

export default async function MisAsignacionesPage() {
  const persona = await getCiceronDemoSession()
  if (!persona) redirect(CICERON_BASE)

  const assignments = await loadMyAssignments(persona)

  return (
    <div>
      <h1 className="cic-h1">{copy.collab.myAssignmentsTitle}</h1>
      <p className="cic-lead">{copy.collab.myAssignmentsLead}</p>

      {assignments.length === 0 ? (
        <p className="cic-muted">{copy.collab.myAssignmentsEmpty}</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: '24px 0 0' }}>
          {assignments.map((a) => (
            <li
              key={a.id}
              style={{
                marginBottom: 16,
                paddingBottom: 16,
                borderBottom: '1px solid color-mix(in srgb, currentColor 12%, transparent)',
              }}
            >
              <p style={{ margin: '0 0 4px', fontSize: '0.85rem' }} className="cic-muted">
                {a.clientName}
                {a.matterTitle ? ` · ${a.matterTitle}` : ''}
                {' · '}
                {copy.collab.status[a.status]}
                {a.dueAt ? ` · ${copy.collab.duePrefix} ${a.dueAt}` : ''}
              </p>
              <p style={{ margin: '0 0 8px' }}>
                <Link href={`${CICERON_BASE}/monitor-dof/${a.matchId}`}>
                  {a.matchTitle ?? a.matchId}
                </Link>
              </p>
              <form
                action={updateAssignmentStatusAction}
                style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}
              >
                <input type="hidden" name="assignmentId" value={a.id} />
                <input type="hidden" name="matchId" value={a.matchId} />
                {a.status !== 'en_curso' ? (
                  <button
                    type="submit"
                    name="status"
                    value="en_curso"
                    className="cic-btn cic-btn-secondary"
                    style={{ fontSize: '0.85rem', padding: '6px 10px' }}
                  >
                    {copy.collab.markInProgress}
                  </button>
                ) : null}
                {a.status !== 'hecho' ? (
                  <button
                    type="submit"
                    name="status"
                    value="hecho"
                    className="cic-btn"
                    style={{ fontSize: '0.85rem', padding: '6px 10px' }}
                  >
                    {copy.collab.markDone}
                  </button>
                ) : null}
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
