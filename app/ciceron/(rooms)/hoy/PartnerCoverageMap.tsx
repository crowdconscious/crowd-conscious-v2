'use client'

import Link from 'next/link'
import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import {
  MEXICO_ISO_TO_BOARD,
  MEXICO_MAP_VIEWBOX,
  MEXICO_STATE_PATHS,
} from '@/lib/ciceron/boletines/mexico-state-paths'
import {
  partnerCoverageByState,
  partnerCoverageStatus,
  partnerStateMatchesHref,
  type PartnerCoverageStatus,
} from '@/lib/ciceron/boletines/partner-coverage-status-pure'
import { pickDefaultStateCode } from '@/lib/ciceron/boletines/map-state-panel-pure'
import type { CoordinatorMapRow } from '../boletines/CoordinatorMexicoMap'
import { copy } from '@/lib/ciceron/copy/es-MX'

const LEGEND: PartnerCoverageStatus[] = ['al_dia', 'con_novedades', 'por_verificar']

const FULL_NAME_BY_BOARD = (() => {
  const map = new Map<string, string>()
  for (const s of MEXICO_STATE_PATHS) {
    const board = MEXICO_ISO_TO_BOARD[s.id] ?? s.id
    map.set(board, s.name)
  }
  return map
})()

function fullStateName(boardCode: string, fallback?: string | null): string {
  return FULL_NAME_BY_BOARD.get(boardCode) ?? fallback?.trim() ?? boardCode
}

/**
 * Socio home hero: reuses the Mexico SVG paths from the coordinator map
 * with partner-facing status (al día / con novedades / por verificar)
 * and a click-through to that state's matches.
 */
export function PartnerCoverageMap({ board }: { board: CoordinatorMapRow[] }) {
  const titleId = useId()
  const coverage = useMemo(() => partnerCoverageByState(board), [board])
  const defaultCode = useMemo(
    () =>
      pickDefaultStateCode(
        board.map((r) => ({
          stateCode: r.stateCode,
          status: r.status,
          hitsExact: r.hitsExact,
          hitsPossible: r.hitsPossible,
        }))
      ),
    [board]
  )
  const [selectedCode, setSelectedCode] = useState<string | null>(defaultCode)
  const [userPicked, setUserPicked] = useState(false)

  useEffect(() => {
    if (!userPicked) setSelectedCode(defaultCode)
  }, [defaultCode, userPicked])

  const selected = useMemo(() => {
    if (!selectedCode) return null
    const row = board.find((r) => r.stateCode === selectedCode)
    const status = coverage.get(selectedCode) ?? 'por_verificar'
    return {
      stateCode: selectedCode,
      stateName: fullStateName(selectedCode, row?.stateName),
      status,
      statusLabel: copy.hoy.partnerCoverage.legend[status],
      hitsExact: row?.hitsExact ?? 0,
      hitsPossible: row?.hitsPossible ?? 0,
      href: partnerStateMatchesHref(selectedCode),
    }
  }, [selectedCode, board, coverage])

  const close = useCallback(() => {
    setUserPicked(true)
    setSelectedCode(null)
  }, [])

  useEffect(() => {
    if (!selectedCode) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedCode, close])

  function selectState(boardCode: string) {
    setUserPicked(true)
    setSelectedCode(boardCode)
  }

  return (
    <section className="cic-section cic-coord-map cic-partner-coverage" aria-labelledby={titleId}>
      <h2 id={titleId} className="cic-h2">
        {copy.hoy.partnerCoverage.title}
      </h2>
      <p className="cic-muted cic-coord-map-lead">{copy.hoy.partnerCoverage.lead}</p>

      <ul className="cic-coord-map-legend" aria-label={copy.hoy.partnerCoverage.legendAria}>
        {LEGEND.map((key) => (
          <li key={key} className={`cic-coord-map-legend-item is-partner-${key}`}>
            <span className="cic-coord-map-swatch" aria-hidden="true" />
            <span>{copy.hoy.partnerCoverage.legend[key]}</span>
          </li>
        ))}
      </ul>

      <div className={`cic-coord-map-layout${selected ? ' has-panel' : ''}`}>
        <div className="cic-coord-map-frame">
          <svg
            className="cic-coord-map-svg"
            viewBox={MEXICO_MAP_VIEWBOX}
            role="list"
            aria-label={copy.hoy.partnerCoverage.mapAria}
          >
            <title>{copy.hoy.partnerCoverage.mapAria}</title>
            {MEXICO_STATE_PATHS.map((state) => {
              const boardCode = MEXICO_ISO_TO_BOARD[state.id] ?? state.id
              const row = board.find((r) => r.stateCode === boardCode)
              const status = row
                ? partnerCoverageStatus(row)
                : coverage.get(boardCode) ?? 'por_verificar'
              const label = fullStateName(boardCode, state.name)
              const statusWord = copy.hoy.partnerCoverage.legend[status]
              const isSelected = selectedCode === boardCode
              return (
                <path
                  key={state.id}
                  d={state.d}
                  className={`cic-coord-map-state is-partner-${status}${isSelected ? ' is-selected' : ''}`}
                  tabIndex={0}
                  role="listitem"
                  aria-label={`${label}: ${statusWord}. ${copy.hoy.partnerCoverage.openMatches}`}
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
            aria-labelledby={`${titleId}-panel`}
          >
            <div className="cic-coord-state-panel-head">
              <h3
                id={`${titleId}-panel`}
                className="cic-h2"
                style={{ margin: 0, fontSize: '1.05rem' }}
              >
                {selected.stateName}
              </h3>
              <button type="button" className="cic-linkish" onClick={close}>
                {copy.boletines.mapPanelClose}
              </button>
            </div>
            <p className="cic-demo-inline" style={{ margin: '4px 0 10px' }}>
              {copy.demoLabel}
            </p>
            <p style={{ margin: '0 0 12px' }}>
              <span className={`cic-bol-status is-partner-${selected.status}`}>
                {selected.statusLabel}
              </span>
            </p>
            <p className="cic-muted" style={{ margin: '0 0 12px', fontSize: '0.95rem' }}>
              {copy.hoy.partnerCoverage.hitsLine(selected.hitsExact, selected.hitsPossible)}
            </p>
            <p style={{ margin: 0 }}>
              <Link href={selected.href} className="cic-btn cic-btn-compact">
                {copy.hoy.partnerCoverage.openMatches}
              </Link>
            </p>
          </aside>
        ) : (
          <aside className="cic-coord-state-panel cic-coord-state-prompt" role="status">
            <p style={{ margin: 0 }}>{copy.hoy.partnerCoverage.prompt}</p>
          </aside>
        )}
      </div>
    </section>
  )
}
