'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { formatDateTimeEs } from '@/lib/ciceron/copy/format-date'
import type { ClientNeedNoteView } from '@/lib/ciceron/client-notes/data'
import { markClientNeedNoteReadAction } from '@/app/ciceron/actions-client-notes'

export function NotesInbox({ rows }: { rows: ClientNeedNoteView[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()

  if (rows.length === 0) {
    return <p className="cic-muted">{copy.adminVentas.notesEmpty}</p>
  }

  return (
    <div style={{ overflowX: 'auto', marginTop: 12 }}>
      <table className="cic-table">
        <thead>
          <tr>
            <th scope="col">{copy.adminVentas.notesFirm}</th>
            <th scope="col">{copy.adminVentas.notesContext}</th>
            <th scope="col">{copy.adminVentas.notesBody}</th>
            <th scope="col">{copy.adminVentas.notesDate}</th>
            <th scope="col">{copy.adminVentas.notesStatus}</th>
            <th scope="col">{copy.adminVentas.notesMarkRead}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.firmName ?? r.firmId.slice(0, 8)}</td>
              <td>{r.context}</td>
              <td style={{ maxWidth: 360, whiteSpace: 'pre-wrap' }}>{r.body}</td>
              <td className="cic-muted" style={{ fontSize: '0.85rem' }}>
                {formatDateTimeEs(r.createdAt)}
              </td>
              <td>
                {r.status === 'leido'
                  ? copy.adminVentas.notesStatusLeido
                  : copy.adminVentas.notesStatusNuevo}
              </td>
              <td>
                {r.status === 'nuevo' ? (
                  <button
                    type="button"
                    className="cic-btn cic-btn-secondary"
                    disabled={pending}
                    onClick={() => {
                      start(async () => {
                        await markClientNeedNoteReadAction(r.id)
                        router.refresh()
                      })
                    }}
                  >
                    {copy.adminVentas.notesMarkRead}
                  </button>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
