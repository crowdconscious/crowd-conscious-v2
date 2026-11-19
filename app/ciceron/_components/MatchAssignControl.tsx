'use client'

import { useFormStatus } from 'react-dom'
import { copy } from '@/lib/ciceron/copy/es-MX'
import {
  assignMatchAction,
  updateAssignmentStatusAction,
} from '@/lib/ciceron/collaboration/actions'
import type {
  FirmMemberOption,
  MatchAssignment,
  MatterOption,
} from '@/lib/ciceron/collaboration/types'

function AssignSubmit() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      className="cic-btn"
      disabled={pending}
      style={{ fontSize: '0.85rem', padding: '8px 12px' }}
    >
      {pending ? copy.components.loading : copy.collab.assign}
    </button>
  )
}

export function MatchAssignControl({
  matchId,
  members,
  matters,
  assignments,
}: {
  matchId: string
  members: FirmMemberOption[]
  matters: MatterOption[]
  assignments: MatchAssignment[]
}) {
  const defaultMatter = matters[0]?.id ?? ''
  const defaultAssignee =
    members.find((m) => m.role === 'asociado')?.id ?? members[0]?.id ?? ''

  return (
    <div className="cic-stack" style={{ marginTop: 12 }}>
      <h3 className="cic-h3" style={{ fontSize: '1rem', margin: 0 }}>
        {copy.collab.assignTitle}
      </h3>

      {matters.length === 0 ? (
        <p className="cic-muted" style={{ fontSize: '0.85rem', margin: 0 }}>
          {copy.collab.noMatters}
        </p>
      ) : (
        <form
          action={assignMatchAction}
          style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'end' }}
        >
          <input type="hidden" name="matchId" value={matchId} />
          <label style={{ flex: '1 1 140px' }}>
            <span className="cic-muted" style={{ fontSize: '0.75rem' }}>
              {copy.collab.assignee}
            </span>
            <select
              name="assignee"
              className="cic-input"
              defaultValue={defaultAssignee}
              style={{ marginTop: 4 }}
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName}
                </option>
              ))}
            </select>
          </label>
          <label style={{ flex: '1 1 140px' }}>
            <span className="cic-muted" style={{ fontSize: '0.75rem' }}>
              {copy.collab.matter}
            </span>
            <select
              name="matterId"
              className="cic-input"
              defaultValue={defaultMatter}
              style={{ marginTop: 4 }}
            >
              {matters.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </label>
          <label style={{ flex: '0 1 140px' }}>
            <span className="cic-muted" style={{ fontSize: '0.75rem' }}>
              {copy.collab.dueAt}
            </span>
            <input
              type="date"
              name="dueAt"
              className="cic-input"
              style={{ marginTop: 4 }}
            />
          </label>
          <AssignSubmit />
        </form>
      )}

      {assignments.length > 0 ? (
        <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0' }}>
          {assignments.map((a) => {
            const member = members.find((m) => m.id === a.assigneeActor)
            return (
              <li
                key={a.id}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  alignItems: 'center',
                  marginBottom: 8,
                  fontSize: '0.9rem',
                }}
              >
                <span>
                  {member?.displayName ?? a.assigneeActor.slice(0, 8)} —{' '}
                  {copy.collab.status[a.status]}
                  {a.dueAt ? ` · ${copy.collab.duePrefix} ${a.dueAt}` : ''}
                </span>
                <form action={updateAssignmentStatusAction} style={{ display: 'inline-flex', gap: 4 }}>
                  <input type="hidden" name="assignmentId" value={a.id} />
                  <input type="hidden" name="matchId" value={matchId} />
                  {a.status !== 'en_curso' ? (
                    <button
                      type="submit"
                      name="status"
                      value="en_curso"
                      className="cic-btn cic-btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                    >
                      {copy.collab.markInProgress}
                    </button>
                  ) : null}
                  {a.status !== 'hecho' ? (
                    <button
                      type="submit"
                      name="status"
                      value="hecho"
                      className="cic-btn cic-btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                    >
                      {copy.collab.markDone}
                    </button>
                  ) : null}
                </form>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
