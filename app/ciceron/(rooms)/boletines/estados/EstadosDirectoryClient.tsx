'use client'

import { useMemo, useState } from 'react'
import { copy } from '@/lib/ciceron/copy/es-MX'
import type {
  BulletinAccessType,
  StateDirectoryEntry,
  UrlVerificationStatus,
} from '@/lib/ciceron/boletines/state-directory'

function accessLabel(t: BulletinAccessType): string {
  return copy.boletines.statesAccess[t]
}

function urlStatusLabel(t: UrlVerificationStatus): string {
  return copy.boletines.statesUrlStatus[t]
}

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
}

export function EstadosDirectoryClient({
  states,
  federal,
}: {
  states: StateDirectoryEntry[]
  federal: StateDirectoryEntry[]
}) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = normalize(query.trim())
    if (!q) return states
    return states.filter(
      (s) =>
        normalize(s.stateName).includes(q) ||
        normalize(s.stateCode).includes(q) ||
        normalize(s.displayName).includes(q)
    )
  }, [query, states])

  return (
    <div>
      <label className="cic-field" style={{ display: 'block', marginBottom: 16 }}>
        <span className="cic-muted" style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem' }}>
          {copy.boletines.statesSearchLabel}
        </span>
        <input
          type="search"
          className="cic-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={copy.boletines.statesSearchPlaceholder}
          aria-label={copy.boletines.statesSearchLabel}
          autoComplete="off"
          style={{ width: '100%', maxWidth: 420 }}
        />
      </label>

      <section className="cic-section" aria-labelledby="bol-estados">
        <h2 id="bol-estados" className="cic-h2">
          {copy.boletines.statesColEntidad}
          <span className="cic-muted" style={{ fontWeight: 500, fontSize: '0.9rem', marginLeft: 8 }}>
            ({filtered.length})
          </span>
        </h2>
        {filtered.length === 0 ? (
          <p className="cic-muted">{copy.boletines.statesEmptySearch}</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="cic-table">
              <thead>
                <tr>
                  <th scope="col">{copy.boletines.statesColEntidad}</th>
                  <th scope="col">{copy.boletines.statesColFuente}</th>
                  <th scope="col">{copy.boletines.statesColAcceso}</th>
                  <th scope="col">{copy.boletines.statesColAccion}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.sourceKey} className="cic-table-card-row">
                    <td data-label={copy.boletines.statesColEntidad}>
                      <strong>{s.stateName}</strong>
                      {s.urlStatus !== 'ok' ? (
                        <div className="cic-muted" style={{ fontSize: '0.8rem', marginTop: 4 }}>
                          {urlStatusLabel(s.urlStatus)}
                        </div>
                      ) : null}
                    </td>
                    <td data-label={copy.boletines.statesColFuente}>
                      <div>{s.displayName}</div>
                      {s.note ? (
                        <div className="cic-muted" style={{ fontSize: '0.8rem', marginTop: 4 }}>
                          {s.note}
                        </div>
                      ) : null}
                    </td>
                    <td data-label={copy.boletines.statesColAcceso}>
                      <span className="cic-bol-status is-neutral" style={{ whiteSpace: 'normal' }}>
                        {accessLabel(s.accessType)}
                      </span>
                    </td>
                    <td data-label={copy.boletines.statesColAccion}>
                      <a
                        href={s.landingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cic-btn cic-btn-secondary"
                        style={{ fontSize: '0.85rem', display: 'inline-block' }}
                      >
                        {copy.boletines.statesOpenSource}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="cic-section" aria-labelledby="bol-federal">
        <h2 id="bol-federal" className="cic-h2">
          {copy.boletines.statesFederalTitle}
        </h2>
        <ul className="cic-stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {federal.map((f) => (
            <li key={f.sourceKey} className="cic-card" style={{ margin: 0 }}>
              <strong>{f.displayName}</strong>
              <p className="cic-muted" style={{ fontSize: '0.9rem', margin: '6px 0' }}>
                {accessLabel(f.accessType)}
                {f.note ? ` · ${f.note}` : ''}
              </p>
              <a
                href={f.landingUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {copy.boletines.statesOpenSource}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <p className="cic-muted" style={{ marginTop: 28, fontSize: '0.85rem' }}>
        {copy.boletines.statesCredit}
      </p>
    </div>
  )
}
