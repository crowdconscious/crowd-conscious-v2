'use client'

import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { CICERON_BULLETIN_CLOCK } from '@/lib/ciceron/config'
import {
  MEXICO_ISO_TO_BOARD,
  MEXICO_MAP_VIEWBOX,
  MEXICO_STATE_PATHS,
} from '@/lib/ciceron/boletines/mexico-state-paths'
import {
  buildMapProgress,
  formatMapProgressLabel,
  mapStatusForState,
  type MapBoardStatus,
  type MapLegendStatus,
} from '@/lib/ciceron/boletines/map-progress-pure'
import {
  findStatePanelDetail,
  type MapStatePanelDetail,
} from '@/lib/ciceron/boletines/map-state-panel-pure'
import { copy } from '@/lib/ciceron/copy/es-MX'

export type CoordinatorMapRow = {
  stateCode: string
  stateName: string
  status: MapBoardStatus
  statusLabel: string
}

const LEGEND_ORDER: MapLegendStatus[] = [
  'revisado',
  'revision_pendiente',
  'fallo',
  'sin_publicacion',
]

export function CoordinatorMexicoMap({
  board,
  details = [],
}: {
  board: CoordinatorMapRow[]
  details?: MapStatePanelDetail[]
}) {
  const panelTitleId = useId()
  const [selectedCode, setSelectedCode] = useState<string | null>(null)

  const byCode = useMemo(
    () => new Map(board.map((r) => [r.stateCode, r.status] as const)),
    [board]
  )
  const nameByCode = useMemo(
    () => new Map(board.map((r) => [r.stateCode, r.stateName] as const)),
    [board]
  )
  const progress = buildMapProgress({
    board,
    respaldoHm: CICERON_BULLETIN_CLOCK.respaldo,
  })
  const progressLabel = formatMapProgressLabel(progress, {
    of: copy.boletines.mapProgressOf,
    reviewed: copy.boletines.mapProgressReviewed,
    missing: copy.boletines.mapProgressMissing,
    respaldo: copy.boletines.mapProgressRespaldo,
  })
  const pct =
    progress.total === 0 ? 0 : Math.round((progress.reviewed / progress.total) * 100)

  const selected = selectedCode
    ? findStatePanelDetail(details, selectedCode)
    : null

  const close = useCallback(() => setSelectedCode(null), [])

  useEffect(() => {
    if (!selectedCode) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedCode, close])

  function selectState(boardCode: string) {
    setSelectedCode(boardCode)
  }

  return (
    <section className="cic-section cic-coord-map" aria-labelledby="coord-map-title">
      <h2 id="coord-map-title" className="cic-h2">
        {copy.boletines.mapTitle}
      </h2>
      <p className="cic-muted cic-coord-map-lead">{copy.boletines.mapLead}</p>
      <p className="cic-muted cic-coord-map-hint">{copy.boletines.mapClickHint}</p>

      <div className="cic-coord-progress" role="group" aria-label={progressLabel}>
        <div
          className="cic-coord-progress-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-valuenow={progress.reviewed}
          aria-valuetext={progressLabel}
        >
          <div className="cic-coord-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="cic-coord-progress-label">{progressLabel}</p>
      </div>

      <ul className="cic-coord-map-legend" aria-label="Leyenda">
        {LEGEND_ORDER.map((key) => (
          <li key={key} className={`cic-coord-map-legend-item is-${key}`}>
            <span className="cic-coord-map-swatch" aria-hidden="true" />
            <span>{copy.boletines.mapLegend[key]}</span>
          </li>
        ))}
      </ul>

      <div className={`cic-coord-map-layout${selected ? ' has-panel' : ''}`}>
        <div className="cic-coord-map-frame">
          <svg
            className="cic-coord-map-svg"
            viewBox={MEXICO_MAP_VIEWBOX}
            role="list"
            aria-label={copy.boletines.mapAria}
          >
            <title>{copy.boletines.mapAria}</title>
            {MEXICO_STATE_PATHS.map((state) => {
              const boardCode = MEXICO_ISO_TO_BOARD[state.id] ?? state.id
              const legend = mapStatusForState(byCode, boardCode)
              const label = nameByCode.get(boardCode) ?? state.name
              const statusWord = copy.boletines.mapLegend[legend]
              const isSelected = selectedCode === boardCode
              return (
                <path
                  key={state.id}
                  d={state.d}
                  className={`cic-coord-map-state is-${legend}${isSelected ? ' is-selected' : ''}`}
                  tabIndex={0}
                  role="listitem"
                  aria-label={`${label}: ${statusWord}. ${copy.boletines.mapOpenPanel}`}
                  aria-pressed={isSelected}
                  onClick={() => selectState(boardCode)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      selectState(boardCode)
                    }
                  }}
                >
                  <title>{`${label}: ${statusWord}`}</title>
                </path>
              )
            })}
          </svg>
        </div>

        {selected ? (
          <aside
            className="cic-coord-state-panel"
            role="dialog"
            aria-modal="false"
            aria-labelledby={panelTitleId}
          >
            <div className="cic-coord-state-panel-head">
              <h3 id={panelTitleId} className="cic-h2" style={{ margin: 0, fontSize: '1.05rem' }}>
                {selected.stateName}
              </h3>
              <button type="button" className="cic-linkish" onClick={close}>
                {copy.boletines.mapPanelClose}
              </button>
            </div>
            <p className="cic-demo-inline" style={{ margin: '4px 0 10px' }}>
              {copy.demoLabel}
            </p>
            <dl className="cic-coord-state-dl">
              <div>
                <dt>{copy.boletines.colEstado}</dt>
                <dd>
                  <span className={`cic-bol-status is-${selected.status === 'fallo' ? 'critical' : selected.status === 'revisado' ? 'good' : 'warning'}`}>
                    {selected.statusLabel}
                  </span>
                </dd>
              </div>
              <div>
                <dt>{copy.boletines.mapPanelSource}</dt>
                <dd>{selected.sourceName || '—'}</dd>
              </div>
              <div>
                <dt>{copy.boletines.mapPanelLastConsult}</dt>
                <dd>
                  {selected.lastConsultHm
                    ? copy.boletines.mapPanelLastConsultValue(selected.lastConsultHm)
                    : copy.boletines.mapPanelNeverConsulted}
                </dd>
              </div>
              <div>
                <dt>{copy.boletines.mapPanelReviewer}</dt>
                <dd>{selected.reviewerName ?? copy.boletines.mapPanelNoReviewer}</dd>
              </div>
              <div>
                <dt>{copy.boletines.colCoincidencias}</dt>
                <dd>{selected.hitsExact}</dd>
              </div>
              <div>
                <dt>{copy.boletines.colPosibles}</dt>
                <dd>{selected.hitsPossible}</dd>
              </div>
            </dl>
            <h4 className="cic-coord-state-matters-title">{copy.boletines.mapPanelMatters}</h4>
            {selected.matters.length === 0 ? (
              <p className="cic-muted" style={{ fontSize: '0.9rem' }}>
                {copy.boletines.mapPanelNoMatters}
              </p>
            ) : (
              <ul className="cic-coord-state-matters">
                {selected.matters.map((m) => (
                  <li key={m.id}>
                    <strong>{m.label}</strong>
                    <span className="cic-muted">
                      {' · '}
                      {m.matchKind === 'exact'
                        ? copy.boletines.matchExact
                        : copy.boletines.matchPossible}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="cic-bol-notice" role="note" style={{ marginTop: 12 }}>
              {copy.boletines.informative}
            </p>
          </aside>
        ) : null}
      </div>
    </section>
  )
}
