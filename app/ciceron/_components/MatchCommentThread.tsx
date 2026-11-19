'use client'

import { useMemo, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { copy } from '@/lib/ciceron/copy/es-MX'
import {
  addMatchCommentAction,
  deleteMatchCommentAction,
} from '@/lib/ciceron/collaboration/actions'
import { filterMentionCandidates } from '@/lib/ciceron/collaboration/mentions-pure'
import type {
  FirmMemberOption,
  MatchComment,
  MatterOption,
} from '@/lib/ciceron/collaboration/types'

function CommentSubmit() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      className="cic-btn"
      disabled={pending}
      style={{ fontSize: '0.85rem', padding: '8px 12px' }}
    >
      {pending ? copy.components.loading : copy.collab.postComment}
    </button>
  )
}

export function MatchCommentThread({
  matchId,
  matters,
  members,
  comments,
  currentActorId,
}: {
  matchId: string
  matters: MatterOption[]
  members: FirmMemberOption[]
  comments: MatchComment[]
  currentActorId: string
}) {
  const [body, setBody] = useState('')
  const defaultMatter = matters[0]?.id ?? ''

  const mentionQuery = useMemo(() => {
    const at = body.lastIndexOf('@')
    if (at < 0) return null
    const slice = body.slice(at + 1)
    if (/\s/.test(slice)) return null
    return slice
  }, [body])

  const candidates =
    mentionQuery !== null
      ? filterMentionCandidates(mentionQuery, members)
      : []

  function insertMention(name: string) {
    const at = body.lastIndexOf('@')
    if (at < 0) return
    setBody(`${body.slice(0, at)}@${name} `)
  }

  return (
    <div className="cic-stack" style={{ marginTop: 16 }}>
      <h3 className="cic-h3" style={{ fontSize: '1rem', margin: 0 }}>
        {copy.collab.commentsTitle}
      </h3>

      {comments.length === 0 ? (
        <p className="cic-muted" style={{ fontSize: '0.85rem', margin: 0 }}>
          {copy.collab.noComments}
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {comments.map((c) => (
            <li
              key={c.id}
              style={{
                borderTop: '1px solid color-mix(in srgb, currentColor 12%, transparent)',
                padding: '10px 0',
              }}
            >
              <p style={{ margin: '0 0 4px', fontSize: '0.8rem' }} className="cic-muted">
                <strong style={{ color: 'inherit' }}>{c.authorName}</strong>
                {' · '}
                {new Date(c.createdAt).toLocaleString('es-MX', {
                  timeZone: 'America/Mexico_City',
                })}
                {c.editedAt ? ` · ${copy.collab.edited}` : ''}
              </p>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{c.body}</p>
              {c.authorActor === currentActorId ? (
                <form action={deleteMatchCommentAction} style={{ marginTop: 6 }}>
                  <input type="hidden" name="commentId" value={c.id} />
                  <input type="hidden" name="matchId" value={matchId} />
                  <button
                    type="submit"
                    className="cic-btn cic-btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                  >
                    {copy.collab.deleteComment}
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {matters.length === 0 ? (
        <p className="cic-muted" style={{ fontSize: '0.85rem' }}>
          {copy.collab.noMatters}
        </p>
      ) : (
        <form action={addMatchCommentAction} className="cic-stack">
          <input type="hidden" name="matchId" value={matchId} />
          <label>
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
          <label>
            <span className="cic-muted" style={{ fontSize: '0.75rem' }}>
              {copy.collab.commentBody}
            </span>
            <textarea
              name="body"
              className="cic-input"
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={copy.collab.mentionHint}
              style={{ marginTop: 4, width: '100%' }}
              required
            />
          </label>
          {candidates.length > 0 ? (
            <ul
              role="listbox"
              aria-label={copy.collab.mentionList}
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                border: '1px solid color-mix(in srgb, currentColor 18%, transparent)',
              }}
            >
              {candidates.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="cic-btn cic-btn-secondary"
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      borderRadius: 0,
                      fontSize: '0.85rem',
                    }}
                    onClick={() => insertMention(c.displayName)}
                  >
                    @{c.displayName}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <CommentSubmit />
        </form>
      )}
    </div>
  )
}
