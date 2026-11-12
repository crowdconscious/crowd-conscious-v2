'use client'

import { useMemo, useState } from 'react'
import { copy } from '@/lib/ciceron/copy/es-MX'
import type { AuditViewerRow } from '@/lib/ciceron/review/types'
import { auditRowsToCsv } from '@/lib/ciceron/review/data-client'

export function AuditViewer({ rows }: { rows: AuditViewerRow[] }) {
  const [actor, setActor] = useState('')
  const [action, setAction] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (actor && !(r.actorName.includes(actor) || r.actorId === actor)) return false
      if (action && r.action !== action) return false
      if (from && Date.parse(r.createdAt) < Date.parse(from)) return false
      if (to && Date.parse(r.createdAt) > Date.parse(to)) return false
      return true
    })
  }, [rows, actor, action, from, to])

  const actions = useMemo(
    () => [...new Set(rows.map((r) => r.action))].sort(),
    [rows]
  )

  function exportCsv() {
    const csv = auditRowsToCsv(filtered)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ciceron-auditoria.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="cic-audit-filters">
        <label className="cic-label">
          {copy.audit.filterActor}
          <input
            className="cic-input"
            value={actor}
            onChange={(e) => setActor(e.target.value)}
          />
        </label>
        <label className="cic-label">
          {copy.audit.filterAction}
          <select
            className="cic-select"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          >
            <option value="">—</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="cic-label">
          {copy.audit.filterFrom}
          <input
            type="date"
            className="cic-input"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="cic-label">
          {copy.audit.filterTo}
          <input
            type="date"
            className="cic-input"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <button type="button" className="cic-btn cic-btn-secondary" onClick={exportCsv}>
          {copy.audit.exportCsv}
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="cic-muted">{copy.audit.empty}</p>
      ) : (
        <div className="cic-table-wrap">
          <table className="cic-table">
            <thead>
              <tr>
                <th>{copy.audit.colWhen}</th>
                <th>{copy.audit.colActor}</th>
                <th>{copy.audit.colAction}</th>
                <th>{copy.audit.colEntity}</th>
                <th>{copy.audit.colOutcome}</th>
                <th>{copy.audit.colPolicy}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.createdAt).toLocaleString('es-MX')}</td>
                  <td>{r.actorName}</td>
                  <td>{r.action}</td>
                  <td>
                    {r.entityType}
                    {r.entityId ? ` · ${r.entityId.slice(0, 8)}` : ''}
                  </td>
                  <td>
                    <span
                      className={
                        r.outcome === 'denied' ? 'cic-outcome-denied' : 'cic-outcome-allowed'
                      }
                    >
                      {r.outcome === 'denied' ? copy.audit.denied : copy.audit.allowed}
                    </span>
                  </td>
                  <td>
                    <span className="cic-muted" style={{ fontSize: '0.8rem' }}>
                      {r.policyId ?? '—'}
                      {r.policyReason ? ` — ${r.policyReason}` : ''}
                    </span>
                  </td>
                  <td>
                    {r.snapshotHref ? (
                      <a className="cic-source" href={r.snapshotHref}>
                        {copy.audit.snapshot}
                      </a>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
