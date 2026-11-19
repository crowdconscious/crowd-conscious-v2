'use client'

import { useMemo, useState } from 'react'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { formatDateLongEs, formatDateTimeEs } from '@/lib/ciceron/copy/format-date'

export type CoordinatorBoardCardRow = {
  sourceId: string
  stateCode: string
  stateName: string
  status: string
  statusLabel: string
  tierLabel: string
  sourceUrl: string
  publicationDate: string | null
  bulletinNumber: string | null
  mattersSearched: number
  hitsExact: number
  hitsPossible: number
  runFinishedAt: string | null
  failureMessage: string | null
  /** Optional court labels for the card subtitle (from hits). */
  courtNames: string[]
}

function statusClass(status: string): string {
  if (status === 'fallo') return 'cic-bol-status is-critical'
  if (status === 'manual' || status === 'parcial') return 'cic-bol-status is-warning'
  if (status === 'sin_publicacion') return 'cic-bol-status is-neutral'
  return 'cic-bol-status is-good'
}

type ViewMode = 'cards' | 'table'

/**
 * Coordinator board: status cards by state/court by default, with a table toggle.
 */
export function CoordinatorBoardView({
  board,
  asOfLabel,
  sourceBadge,
  sourceError,
}: {
  board: CoordinatorBoardCardRow[]
  asOfLabel: string
  sourceBadge: string
  sourceError: string | null
}) {
  const [mode, setMode] = useState<ViewMode>('cards')
  const sorted = useMemo(() => board, [board])

  return (
    <section className="cic-section" aria-labelledby="coord-board">
      <div className="cic-coord-board-head">
        <h2 id="coord-board" className="cic-h2">
          {copy.boletines.boardTitle}
        </h2>
        <div
          className="cic-view-toggle"
          role="group"
          aria-label={copy.boletines.boardViewToggleAria}
        >
          <button
            type="button"
            className={`cic-view-toggle-btn${mode === 'cards' ? ' is-active' : ''}`}
            aria-pressed={mode === 'cards'}
            onClick={() => setMode('cards')}
          >
            {copy.boletines.boardViewCards}
          </button>
          <button
            type="button"
            className={`cic-view-toggle-btn${mode === 'table' ? ' is-active' : ''}`}
            aria-pressed={mode === 'table'}
            onClick={() => setMode('table')}
          >
            {copy.boletines.boardViewTable}
          </button>
        </div>
      </div>

      <p className="cic-muted" style={{ fontSize: '0.85rem' }}>
        {asOfLabel}
        {' · '}
        <span role="status" style={{ fontWeight: 600 }}>
          {sourceBadge}
        </span>
      </p>
      {sourceError ? (
        <p className="cic-policy-box is-denied" role="alert">
          {sourceError}
        </p>
      ) : null}

      {mode === 'cards' ? (
        <ul className="cic-coord-status-grid">
          {sorted.map((row) => (
            <li key={row.sourceId} className="cic-coord-status-card">
              <div className="cic-coord-status-card-top">
                <h3 className="cic-coord-status-card-title">{row.stateName}</h3>
                <span className={statusClass(row.status)}>{row.statusLabel}</span>
              </div>
              {row.courtNames.length > 0 ? (
                <p className="cic-muted cic-coord-status-card-courts">
                  {row.courtNames.slice(0, 3).join(' · ')}
                  {row.courtNames.length > 3
                    ? ` · +${row.courtNames.length - 3}`
                    : ''}
                </p>
              ) : (
                <p className="cic-muted cic-coord-status-card-courts">{row.tierLabel}</p>
              )}
              <dl className="cic-coord-status-card-stats">
                <div>
                  <dt>{copy.boletines.colExactas}</dt>
                  <dd>{row.hitsExact}</dd>
                </div>
                <div>
                  <dt>{copy.boletines.colPosibles}</dt>
                  <dd>{row.hitsPossible}</dd>
                </div>
                <div>
                  <dt>{copy.boletines.colBuscados}</dt>
                  <dd>{row.mattersSearched}</dd>
                </div>
              </dl>
              {row.status === 'fallo' && row.failureMessage ? (
                <p className="cic-muted" style={{ margin: '8px 0 0', fontSize: '0.9rem' }}>
                  {row.failureMessage}
                </p>
              ) : null}
              <p style={{ margin: '10px 0 0' }}>
                <a
                  className="cic-btn cic-btn-secondary cic-btn-compact"
                  href={row.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {copy.boletines.openSource}
                </a>
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="cic-table-wrap">
          <table className="cic-table">
            <thead>
              <tr>
                <th scope="col">{copy.boletines.colEntidad}</th>
                <th scope="col">{copy.boletines.colPublicacion}</th>
                <th scope="col">{copy.boletines.colNivel}</th>
                <th scope="col">{copy.boletines.colBuscados}</th>
                <th scope="col">{copy.boletines.colExactas}</th>
                <th scope="col">{copy.boletines.colPosibles}</th>
                <th scope="col">{copy.boletines.colHoraCorrida}</th>
                <th scope="col">{copy.boletines.colEstado}</th>
                <th scope="col">{copy.boletines.colAccion}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.sourceId}>
                  <td>{row.stateName}</td>
                  <td>
                    {row.publicationDate ? formatDateLongEs(row.publicationDate) : '—'}
                    {row.bulletinNumber ? (
                      <span
                        className="cic-muted"
                        style={{
                          display: 'inline-flex',
                          gap: 6,
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          fontSize: '0.8rem',
                        }}
                      >
                        {row.bulletinNumber}
                        <span className="cic-demo-inline" style={{ fontSize: '0.75rem' }}>
                          {copy.demoLabel}
                        </span>
                      </span>
                    ) : null}
                  </td>
                  <td>{row.tierLabel}</td>
                  <td>{row.mattersSearched}</td>
                  <td>{row.hitsExact}</td>
                  <td>{row.hitsPossible}</td>
                  <td>{row.runFinishedAt ? formatDateTimeEs(row.runFinishedAt) : '—'}</td>
                  <td>
                    <span className={statusClass(row.status)}>{row.statusLabel}</span>
                  </td>
                  <td>
                    <a
                      className="cic-btn cic-btn-secondary cic-btn-compact"
                      href={row.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {copy.boletines.openSource}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
