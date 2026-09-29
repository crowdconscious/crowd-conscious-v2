'use client'

/**
 * Mapa canvas for the simulation replay viewer — Tasks 4b / 4c.
 *
 * Full-CDMX alcaldía outlines (INEGI 09mun) frame the view; Cuauhtémoc +
 * Miguel Hidalgo keep AGEB detail and a stronger fill so they read as the
 * active sample. Agent dots share the playback clock with Columnas via
 * votedCount / beat. Imperative circle updates avoid re-rendering 150 React
 * nodes per vote.
 *
 * Real-vote AGEB shading is intentionally omitted: market_votes carry no
 * location, so we never invent local real results.
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import type {
  SimulationReplayPayload,
  SimulationViewerBeat,
} from '@/types/simulation-replay'
import {
  AGEB_GEOJSON_PUBLIC_PATH,
  INEGI_AGEB_ATTRIBUTION_ES,
  type AgebFeatureCollection,
} from '@/lib/sim-viewer/ageb-geo'
import {
  CDMX_ALCALDIAS_GEOJSON_PUBLIC_PATH,
  CDMX_SAMPLE_CAPTION_ES,
  isActiveAlcaldia,
  type CdmxAlcaldiaFeatureCollection,
} from '@/lib/sim-viewer/cdmx-alcaldias'
import { isPersonaMappable } from '@/lib/sim-viewer/map-availability'
import {
  jitteredMapPoint,
  mapDotSeed,
} from '@/lib/sim-viewer/map-jitter'
import {
  neutralDotStyle,
  votedDotStyle,
} from '@/lib/sim-viewer/map-option-color'
import { createCdmxProjection } from '@/lib/sim-viewer/map-projection'
import { personaDisplayLabel } from '@/lib/sim-viewer/persona-label'
import { SimMark } from '@/components/sim-viewer/SimMark'

type Props = {
  data: SimulationReplayPayload
  beat: SimulationViewerBeat
  votedCount: number
  compact?: boolean
  phoneScale?: boolean
  mobileLayout?: boolean
  selectedPersonaKey?: string | null
  onDotActivate?: (personaKey: string) => void
  /** Personas omitted from the map (no mappable AGEB / coords). */
  missingLocationCount?: number
}

type ProjectedDot = {
  index: number
  personaKey: string
  optionId: string
  sequenceIndex: number
  x: number
  y: number
  label: string
}

/** Desktop reference width where map dots were tuned. */
const DESKTOP_DOT_REF_PX = 900
/** Zoomed-out CDMX framing: keep a readable floor on phone. */
const MOBILE_DOT_PX = 6.5
const DESKTOP_DOT_PX = 7
const DESKTOP_DOT_MIN_PX = 5.5
const CAPTURE_DOT_PX = 12

let cachedAgeb: AgebFeatureCollection | null = null
let cachedCdmx: CdmxAlcaldiaFeatureCollection | null = null
let geoLoadPromise: Promise<{
  ageb: AgebFeatureCollection
  cdmx: CdmxAlcaldiaFeatureCollection
}> | null = null

function loadMapGeojson(): Promise<{
  ageb: AgebFeatureCollection
  cdmx: CdmxAlcaldiaFeatureCollection
}> {
  if (cachedAgeb && cachedCdmx) {
    return Promise.resolve({ ageb: cachedAgeb, cdmx: cachedCdmx })
  }
  if (!geoLoadPromise) {
    geoLoadPromise = Promise.all([
      fetch(AGEB_GEOJSON_PUBLIC_PATH).then(async (res) => {
        if (!res.ok) {
          throw new Error(`Failed to load AGEB GeoJSON (${res.status})`)
        }
        return res.json() as Promise<AgebFeatureCollection>
      }),
      fetch(CDMX_ALCALDIAS_GEOJSON_PUBLIC_PATH).then(async (res) => {
        if (!res.ok) {
          throw new Error(`Failed to load CDMX alcaldías GeoJSON (${res.status})`)
        }
        return res.json() as Promise<CdmxAlcaldiaFeatureCollection>
      }),
    ])
      .then(([ageb, cdmx]) => {
        cachedAgeb = ageb
        cachedCdmx = cdmx
        return { ageb, cdmx }
      })
      .catch((err) => {
        geoLoadPromise = null
        throw err
      })
  }
  return geoLoadPromise
}

function shortAlcaldiaLabel(nombre: string): string {
  // Keep accents; only shorten the longest official names for phone density.
  if (nombre === 'Cuajimalpa de Morelos') return 'Cuajimalpa'
  if (nombre === 'La Magdalena Contreras') return 'Magdalena C.'
  if (nombre === 'Venustiano Carranza') return 'V. Carranza'
  if (nombre === 'Gustavo A. Madero') return 'G. A. Madero'
  return nombre
}

export function SimMap({
  data,
  beat,
  votedCount,
  compact = false,
  phoneScale = false,
  mobileLayout = false,
  selectedPersonaKey = null,
  onDotActivate,
  missingLocationCount = 0,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [ageb, setAgeb] = useState<AgebFeatureCollection | null>(cachedAgeb)
  const [cdmx, setCdmx] = useState<CdmxAlcaldiaFeatureCollection | null>(
    cachedCdmx,
  )
  const [geoError, setGeoError] = useState<string | null>(null)
  const circleRefs = useRef<(SVGCircleElement | null)[]>([])
  const prevVoted = useRef(0)

  useEffect(() => {
    let cancelled = false
    void loadMapGeojson()
      .then(({ ageb: a, cdmx: c }) => {
        if (!cancelled) {
          setAgeb(a)
          setCdmx(c)
        }
      })
      .catch(() => {
        if (!cancelled) setGeoError('No se pudo cargar el mapa.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const geoCodes = useMemo(() => {
    if (!ageb) return new Set<string>()
    const set = new Set<string>()
    for (const f of ageb.features) {
      const code = f.properties?.ageb_code
      if (typeof code === 'string' && code.length > 0) set.add(code)
    }
    return set
  }, [ageb])

  const optionIndex = useMemo(() => {
    const map = new Map<string, number>()
    data.pulse.options.forEach((o, i) => map.set(o.id, i))
    return map
  }, [data.pulse.options])

  useEffect(() => {
    const el = wrapRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect
      if (!cr) return
      setSize({
        width: Math.max(0, Math.floor(cr.width)),
        height: Math.max(0, Math.floor(cr.height)),
      })
    })
    ro.observe(el)
    const rect = el.getBoundingClientRect()
    setSize({
      width: Math.max(0, Math.floor(rect.width)),
      height: Math.max(0, Math.floor(rect.height)),
    })
    return () => ro.disconnect()
  }, [])

  // Fit to whole CDMX so the sample alcaldías read inside city context.
  const projection = useMemo(() => {
    if (!cdmx || size.width < 8 || size.height < 8) return null
    // Phone portrait: CDMX is tall — tighter side padding, keep vertical room.
    const pad = mobileLayout ? (phoneScale ? 6 : 4) : 12
    return createCdmxProjection(cdmx, size.width, size.height, pad)
  }, [cdmx, size.width, size.height, mobileLayout, phoneScale])

  const alcaldiaPaths = useMemo(() => {
    if (!projection || !cdmx) {
      return [] as {
        key: string
        d: string
        nombre: string
        active: boolean
      }[]
    }
    const out: {
      key: string
      d: string
      nombre: string
      active: boolean
    }[] = []
    for (const f of cdmx.features) {
      const d = projection.path(f as never)
      if (!d) continue
      const nombre = f.properties.nombre
      out.push({
        key: f.properties.cvegeo,
        d,
        nombre,
        active: isActiveAlcaldia(f.properties.cvegeo),
      })
    }
    return out
  }, [projection, cdmx])

  const agebPaths = useMemo(() => {
    if (!projection || !ageb) return [] as { key: string; d: string }[]
    const out: { key: string; d: string }[] = []
    for (const f of ageb.features) {
      const d = projection.path(f as never)
      if (!d) continue
      out.push({ key: f.properties.ageb_code, d })
    }
    return out
  }, [projection, ageb])

  const alcaldiaLabels = useMemo(() => {
    if (!projection || !cdmx) {
      return [] as {
        key: string
        x: number
        y: number
        label: string
        active: boolean
      }[]
    }
    const labels: {
      key: string
      x: number
      y: number
      label: string
      active: boolean
    }[] = []
    for (const f of cdmx.features) {
      const { label_lat: lat, label_lng: lng, nombre, cvegeo } = f.properties
      const xy = projection.project(lng, lat)
      if (!xy) continue
      const active = isActiveAlcaldia(cvegeo)
      labels.push({
        key: cvegeo,
        x: xy[0],
        y: xy[1],
        label: mobileLayout && !active ? shortAlcaldiaLabel(nombre) : nombre,
        active,
      })
    }
    return labels
  }, [projection, cdmx, mobileLayout])

  const dots = useMemo(() => {
    if (!projection) return [] as ProjectedDot[]
    const out: ProjectedDot[] = []
    for (let i = 0; i < data.votes.length; i++) {
      const vote = data.votes[i]!
      const persona = vote.persona
      if (!isPersonaMappable(persona, geoCodes)) continue
      const seed = mapDotSeed(data.run.id, persona.personaKey, vote.sequenceIndex)
      const pt = jitteredMapPoint(
        seed,
        persona.centroidLat as number,
        persona.centroidLng as number,
      )
      const xy = projection.project(pt.lng, pt.lat)
      if (!xy) continue
      out.push({
        index: i,
        personaKey: persona.personaKey,
        optionId: vote.optionId,
        sequenceIndex: vote.sequenceIndex,
        x: xy[0],
        y: xy[1],
        label: personaDisplayLabel(
          persona.displayName ?? persona.personaKey,
          vote.sequenceIndex,
        ),
      })
    }
    return out
  }, [projection, data.votes, data.run.id, geoCodes])

  const dotPx = phoneScale
    ? CAPTURE_DOT_PX
    : mobileLayout
      ? MOBILE_DOT_PX
      : compact
        ? 6
        : Math.max(
            DESKTOP_DOT_MIN_PX,
            Math.min(
              DESKTOP_DOT_PX,
              size.width > 0
                ? DESKTOP_DOT_PX * (size.width / DESKTOP_DOT_REF_PX)
                : DESKTOP_DOT_PX,
            ),
          )

  // Imperative land / reset — mirrors SimCanvas votedCount handling.
  useEffect(() => {
    const prev = prevVoted.current
    if (votedCount < prev) {
      for (const dot of dots) {
        const el = circleRefs.current[dot.index]
        if (!el) continue
        const n = neutralDotStyle()
        el.setAttribute('fill', n.fill)
        el.setAttribute('stroke', n.stroke)
        el.dataset.state = 'neutral'
        el.classList.remove('sim-map-dot--landed', 'sim-map-dot--glow')
      }
    } else {
      for (let i = prev; i < votedCount; i++) {
        const vote = data.votes[i]
        const el = circleRefs.current[i]
        if (!el || !vote) continue
        // Skip circles that were never mounted (unmappable personas).
        if (el.dataset.mappable !== '1') continue
        const oi = optionIndex.get(vote.optionId) ?? 0
        const style = votedDotStyle(oi)
        el.setAttribute('fill', style.fill)
        el.setAttribute('stroke', style.stroke)
        el.dataset.state = 'voted'
        el.classList.add('sim-map-dot--landed', 'sim-map-dot--glow')
        window.setTimeout(() => {
          el.classList.remove('sim-map-dot--glow')
        }, 450)
      }
    }
    prevVoted.current = votedCount
  }, [votedCount, data.votes, dots, optionIndex])

  // Re-apply landed styles after remount / projection resize.
  useEffect(() => {
    for (const dot of dots) {
      const el = circleRefs.current[dot.index]
      if (!el) continue
      if (votedCount > dot.index) {
        const oi = optionIndex.get(dot.optionId) ?? 0
        const style = votedDotStyle(oi)
        el.setAttribute('fill', style.fill)
        el.setAttribute('stroke', style.stroke)
        el.dataset.state = 'voted'
        el.classList.add('sim-map-dot--landed')
      } else {
        const n = neutralDotStyle()
        el.setAttribute('fill', n.fill)
        el.setAttribute('stroke', n.stroke)
        el.dataset.state = 'neutral'
        el.classList.remove('sim-map-dot--landed', 'sim-map-dot--glow')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync on geometry identity
  }, [dots, data.run.id])

  const padCls = phoneScale
    ? 'px-2.5 pb-2 pt-11'
    : mobileLayout
      ? 'px-1 pb-1 pt-8'
      : compact
        ? 'px-1.5 pb-1.5 pt-8'
        : 'px-2 pb-2 pt-9 sm:px-3 sm:pt-10'

  void beat // reserved for future settle/reveal map chrome

  const contextLabelSize = phoneScale ? 8 : mobileLayout ? 6.5 : 8
  const activeLabelSize = phoneScale ? 11 : mobileLayout ? 8 : 10

  return (
    <div
      className="sim-map relative flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-amber-500/25 bg-gradient-to-b from-[#121820] via-[#0f1419] to-[#0c1015]"
      data-sim-map="true"
      data-mobile={mobileLayout ? '1' : '0'}
      style={
        {
          '--sim-map-dot-size': `${dotPx}px`,
        } as CSSProperties
      }
    >
      <SimMark subtitle="reproducción" compact={compact} phoneScale={phoneScale} />

      <div className={`relative flex min-h-0 flex-1 flex-col ${padCls}`}>
        <div ref={wrapRef} className="relative min-h-0 flex-1">
          {geoError ? (
            <div className="flex h-full items-center justify-center px-4 text-center text-[11px] text-slate-500">
              {geoError}
            </div>
          ) : projection && size.width > 0 && size.height > 0 ? (
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox={`0 0 ${size.width} ${size.height}`}
              width={size.width}
              height={size.height}
              role="img"
              aria-label="Mapa de la simulación — Ciudad de México, muestra Cuauhtémoc y Miguel Hidalgo"
            >
              <g className="sim-map-alcaldias" aria-hidden="true">
                {alcaldiaPaths.map((p) =>
                  p.active ? (
                    <path
                      key={p.key}
                      d={p.d}
                      fill="rgba(148, 163, 184, 0.12)"
                      stroke="rgba(203, 213, 225, 0.7)"
                      strokeWidth={mobileLayout ? 1.1 : 1.4}
                      vectorEffect="non-scaling-stroke"
                      data-alcaldia={p.nombre}
                      data-active="1"
                    />
                  ) : (
                    <path
                      key={p.key}
                      d={p.d}
                      fill="rgba(148, 163, 184, 0.03)"
                      stroke="rgba(100, 116, 139, 0.35)"
                      strokeWidth={mobileLayout ? 0.55 : 0.7}
                      vectorEffect="non-scaling-stroke"
                      data-alcaldia={p.nombre}
                      data-active="0"
                    />
                  ),
                )}
              </g>

              <g className="sim-map-agebs" aria-hidden="true">
                {agebPaths.map((p) => (
                  <path
                    key={p.key}
                    d={p.d}
                    fill="none"
                    stroke="rgba(148, 163, 184, 0.28)"
                    strokeWidth={mobileLayout ? 0.35 : 0.45}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </g>

              <g className="sim-map-alcaldia-labels" aria-hidden="true">
                {alcaldiaLabels.map((l) => (
                  <text
                    key={l.key}
                    x={l.x}
                    y={l.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={l.active ? 'fill-slate-300' : 'fill-slate-600'}
                    style={{
                      fontSize: l.active ? activeLabelSize : contextLabelSize,
                      fontWeight: l.active ? 600 : 500,
                      letterSpacing: l.active ? '0.04em' : '0.02em',
                      textTransform: 'uppercase',
                      opacity: l.active ? 0.72 : 0.42,
                      pointerEvents: 'none',
                    }}
                  >
                    {l.label}
                  </text>
                ))}
              </g>

              <g className="sim-map-dots">
                {dots.map((dot) => {
                  const selected = selectedPersonaKey === dot.personaKey
                  const landed = votedCount > dot.index
                  const oi = optionIndex.get(dot.optionId) ?? 0
                  const style = landed
                    ? votedDotStyle(oi)
                    : neutralDotStyle()
                  return (
                    <circle
                      key={dot.personaKey}
                      ref={(el) => {
                        circleRefs.current[dot.index] = el
                      }}
                      cx={dot.x}
                      cy={dot.y}
                      r={dotPx / 2}
                      fill={style.fill}
                      stroke={style.stroke}
                      strokeWidth={mobileLayout ? 1 : 1.25}
                      className={`sim-map-dot${landed ? ' sim-map-dot--landed' : ''}${
                        selected ? ' sim-map-dot--selected' : ''
                      }`}
                      data-persona-key={dot.personaKey}
                      data-sequence={dot.sequenceIndex}
                      data-mappable="1"
                      data-state={landed ? 'voted' : 'neutral'}
                      data-selected={selected ? '1' : undefined}
                      role="button"
                      tabIndex={0}
                      aria-label={`Inspeccionar persona ${dot.label}`}
                      aria-pressed={selected}
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onDotActivate?.(dot.personaKey)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onDotActivate?.(dot.personaKey)
                        }
                      }}
                    />
                  )
                })}
              </g>
            </svg>
          ) : (
            <div className="flex h-full items-center justify-center text-[11px] text-slate-500">
              Cargando mapa…
            </div>
          )}
        </div>

        <div
          className={`mt-1 flex shrink-0 flex-col gap-0.5 text-slate-500 ${
            phoneScale
              ? 'text-[10px]'
              : mobileLayout
                ? 'text-[9px]'
                : 'text-[9px] sm:text-[10px]'
          }`}
        >
          <p
            className="leading-tight text-slate-400"
            data-sim-map-sample-caption="1"
          >
            {CDMX_SAMPLE_CAPTION_ES}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
            <p className="min-w-0 leading-tight">{INEGI_AGEB_ATTRIBUTION_ES}</p>
            {missingLocationCount > 0 ? (
              <p className="shrink-0 leading-tight text-slate-500">
                {missingLocationCount} agente
                {missingLocationCount === 1 ? '' : 's'} sin ubicación
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
