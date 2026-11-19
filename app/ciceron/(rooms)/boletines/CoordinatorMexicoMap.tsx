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

export function CoordinatorMexicoMap({ board }: { board: CoordinatorMapRow[] }) {
  const byCode = new Map(board.map((r) => [r.stateCode, r.status] as const))
  const nameByCode = new Map(board.map((r) => [r.stateCode, r.stateName] as const))
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

  return (
    <section className="cic-section cic-coord-map" aria-labelledby="coord-map-title">
      <h2 id="coord-map-title" className="cic-h2">
        {copy.boletines.mapTitle}
      </h2>
      <p className="cic-muted cic-coord-map-lead">{copy.boletines.mapLead}</p>

      <div
        className="cic-coord-progress"
        role="group"
        aria-label={progressLabel}
      >
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

      <div className="cic-coord-map-frame">
        <svg
          className="cic-coord-map-svg"
          viewBox={MEXICO_MAP_VIEWBOX}
          role="img"
          aria-label={copy.boletines.mapAria}
        >
          <title>{copy.boletines.mapAria}</title>
          {MEXICO_STATE_PATHS.map((state) => {
            const boardCode = MEXICO_ISO_TO_BOARD[state.id] ?? state.id
            const legend = mapStatusForState(byCode, boardCode)
            const label =
              nameByCode.get(boardCode) ??
              state.name
            const statusWord = copy.boletines.mapLegend[legend]
            return (
              <path
                key={state.id}
                d={state.d}
                className={`cic-coord-map-state is-${legend}`}
                tabIndex={0}
              >
                <title>{`${label}: ${statusWord}`}</title>
              </path>
            )
          })}
        </svg>
      </div>
    </section>
  )
}
