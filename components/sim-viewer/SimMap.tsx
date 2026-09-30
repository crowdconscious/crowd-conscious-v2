'use client'

/**
 * Mapa canvas for the simulation replay viewer — Tasks 4b / 4c.
 *
 * Overview frames all 16 INEGI alcaldías (growth context). On play, the SVG
 * viewBox animates (~1.2s) to Cuauhtémoc + Miguel Hidalgo so the 150 dots
 * stay distinguishable. Neighbouring alcaldías remain faintly visible.
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
import { resolvePersonaMapLocation } from '@/lib/sim-viewer/persona-map-location'
import {
  detailViewBoxFromPoints,
  interpolateViewBox,
  MAP_CAMERA_ZOOM_MS,
  overviewViewBox,
  userSpaceDotRadius,
  viewBoxToString,
  type MapCamera,
  type SvgViewBox,
} from '@/lib/sim-viewer/map-camera'
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
import { useReducedMotion } from '@/hooks/useSimulationPlayback'
import { SimMark } from '@/components/sim-viewer/SimMark'

type Props = {
  data: SimulationReplayPayload
  beat: SimulationViewerBeat
  votedCount: number
  /** Desired framing — parent drives intro/start/endcard; user can override. */
  cameraIntent?: MapCamera
  compact?: boolean
  phoneScale?: boolean
  mobileLayout?: boolean
  selectedPersonaKey?: string | null
  onDotActivate?: (personaKey: string) => void
  /** Personas omitted from the map (no placeable coords even with fallback). */
  missingLocationCount?: number
  /** When AGEB columns are missing, note that dots use colonia/alcaldía approx. */
  usingLocationFallback?: boolean
  /** Hide the zoom control (e.g. while intro covers the stage). */
  hideCameraControl?: boolean
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

const DESKTOP_DOT_REF_PX = 900
/** Detail (zoomed) on-screen diameters. */
const MOBILE_DOT_PX = 5.5
const DESKTOP_DOT_PX = 6.5
const DESKTOP_DOT_MIN_PX = 5
const CAPTURE_DOT_PX = 10
/** Overview (full CDMX): keep the cluster from becoming a solid blob. */
const OVERVIEW_DOT_PX_MOBILE = 1.75
const OVERVIEW_DOT_PX_DESKTOP = 2.25
const OVERVIEW_DOT_PX_CAPTURE = 2.75

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
  if (nombre === 'Cuajimalpa de Morelos') return 'Cuajimalpa'
  if (nombre === 'La Magdalena Contreras') return 'Magdalena C.'
  if (nombre === 'Venustiano Carranza') return 'V. Carranza'
  if (nombre === 'Gustavo A. Madero') return 'G. A. Madero'
  return nombre
}

function walkCoords(
  coords: unknown,
  project: (lng: number, lat: number) => [number, number] | null,
  out: [number, number][],
): void {
  if (!Array.isArray(coords)) return
  if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
    const p = project(coords[0] as number, coords[1] as number)
    if (p) out.push(p)
    return
  }
  for (const c of coords) walkCoords(c, project, out)
}

export function SimMap({
  data,
  beat,
  votedCount,
  cameraIntent = 'overview',
  compact = false,
  phoneScale = false,
  mobileLayout = false,
  selectedPersonaKey = null,
  onDotActivate,
  missingLocationCount = 0,
  usingLocationFallback = false,
  hideCameraControl = false,
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
  const reducedMotion = useReducedMotion()

  const [userCamera, setUserCamera] = useState<MapCamera | null>(null)
  const camera: MapCamera = userCamera ?? cameraIntent

  // When parent intent changes (start / endcard), drop manual override.
  useEffect(() => {
    setUserCamera(null)
  }, [cameraIntent])

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

  // Always project in full-CDMX SVG space; camera zooms via viewBox.
  const projection = useMemo(() => {
    if (!cdmx || size.width < 8 || size.height < 8) return null
    const pad = mobileLayout ? (phoneScale ? 6 : 4) : 12
    return createCdmxProjection(cdmx, size.width, size.height, pad)
  }, [cdmx, size.width, size.height, mobileLayout, phoneScale])

  const overviewVb = useMemo(
    () => overviewViewBox(size.width, size.height),
    [size.width, size.height],
  )

  const detailVb = useMemo(() => {
    if (!projection || size.width < 8) return overviewVb
    const pts: [number, number][] = []
    // Fit the camera to persona placements so the 150 dots spread across the
    // frame; padding keeps neighbouring alcaldía outlines faintly visible.
    for (const vote of data.votes) {
      const persona = vote.persona
      const loc = resolvePersonaMapLocation(persona, geoCodes)
      if (!loc) continue
      const seed = mapDotSeed(data.run.id, persona.personaKey, vote.sequenceIndex)
      const pt = jitteredMapPoint(seed, loc.lat, loc.lng)
      const xy = projection.project(pt.lng, pt.lat)
      if (xy) pts.push(xy)
    }
    if (pts.length < 8 && cdmx) {
      for (const f of cdmx.features) {
        if (!isActiveAlcaldia(f.properties.cvegeo)) continue
        walkCoords(f.geometry.coordinates, projection.project, pts)
      }
    }
    // Padding keeps neighbouring alcaldía outlines faintly in frame; don't
    // force the tall phone aspect or the dots collapse into a thin band.
    const pad = mobileLayout ? 28 : 36
    return detailViewBoxFromPoints(
      pts,
      size.width,
      size.height,
      pad,
      !mobileLayout,
    )
  }, [
    projection,
    cdmx,
    data.votes,
    data.run.id,
    geoCodes,
    size.width,
    size.height,
    mobileLayout,
    overviewVb,
  ])

  const targetVb = camera === 'detail' ? detailVb : overviewVb
  const [viewBox, setViewBox] = useState<SvgViewBox>(() =>
    overviewViewBox(0, 0),
  )
  const viewBoxRef = useRef(viewBox)
  viewBoxRef.current = viewBox
  const viewBoxSeededRef = useRef(false)

  // Seed the viewBox once the SVG has a real size. Start at overview so a
  // detail intent can animate the zoom-in (capture autoplay included).
  useEffect(() => {
    if (size.width < 8 || size.height < 8) return
    if (viewBoxSeededRef.current) return
    viewBoxSeededRef.current = true
    const start = overviewViewBox(size.width, size.height)
    setViewBox(start)
    viewBoxRef.current = start
  }, [size.width, size.height])

  // Keep overview framing aligned with viewport resizes.
  useEffect(() => {
    if (!viewBoxSeededRef.current) return
    if (camera !== 'overview') return
    setViewBox(overviewVb)
    viewBoxRef.current = overviewVb
  }, [overviewVb, camera])

  useEffect(() => {
    if (!viewBoxSeededRef.current) return
    const from = viewBoxRef.current
    const to = targetVb
    if (
      from.x === to.x &&
      from.y === to.y &&
      from.width === to.width &&
      from.height === to.height
    ) {
      return
    }
    if (reducedMotion || MAP_CAMERA_ZOOM_MS <= 0) {
      setViewBox(to)
      viewBoxRef.current = to
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / MAP_CAMERA_ZOOM_MS)
      const next = interpolateViewBox(from, to, t)
      setViewBox(next)
      viewBoxRef.current = next
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [targetVb, reducedMotion])

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
    // AGEB mesh only when zoomed — at full CDMX it densifies the yellow blob.
    if (camera !== 'detail') return []
    const out: { key: string; d: string }[] = []
    for (const f of ageb.features) {
      const d = projection.path(f as never)
      if (!d) continue
      out.push({ key: f.properties.ageb_code, d })
    }
    return out
  }, [projection, ageb, camera])

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

    if (camera === 'overview') {
      // Context names only — Cuau/MH labels collide at full-CDMX scale.
      for (const f of cdmx.features) {
        if (isActiveAlcaldia(f.properties.cvegeo)) continue
        const { label_lat: lat, label_lng: lng, nombre, cvegeo } = f.properties
        const xy = projection.project(lng, lat)
        if (!xy) continue
        labels.push({
          key: cvegeo,
          x: xy[0],
          y: xy[1],
          label: mobileLayout ? shortAlcaldiaLabel(nombre) : nombre,
          active: false,
        })
      }
      return labels
    }

    // Detail: park labels inside the target camera frame so they never
    // clip or collide — MH toward the top, Cuauhtémoc toward the bottom.
    const frame = targetVb
    const topY = frame.y + frame.height * 0.14
    const botY = frame.y + frame.height * 0.86
    const midX = frame.x + frame.width * 0.5
    // Slight horizontal separation mirrors the real geography (MH west, Cuau east).
    labels.push({
      key: '09016',
      x: midX - frame.width * 0.12,
      y: topY,
      label: 'Miguel Hidalgo',
      active: true,
    })
    labels.push({
      key: '09015',
      x: midX + frame.width * 0.12,
      y: botY,
      label: 'Cuauhtémoc',
      active: true,
    })
    return labels
  }, [projection, cdmx, mobileLayout, camera, targetVb])

  const dots = useMemo(() => {
    if (!projection) return [] as ProjectedDot[]
    const out: ProjectedDot[] = []
    for (let i = 0; i < data.votes.length; i++) {
      const vote = data.votes[i]!
      const persona = vote.persona
      const loc = resolvePersonaMapLocation(persona, geoCodes)
      if (!loc) continue
      const seed = mapDotSeed(data.run.id, persona.personaKey, vote.sequenceIndex)
      const pt = jitteredMapPoint(seed, loc.lat, loc.lng)
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

  const detailScreenDotPx = phoneScale
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

  const overviewScreenDotPx = phoneScale
    ? OVERVIEW_DOT_PX_CAPTURE
    : mobileLayout
      ? OVERVIEW_DOT_PX_MOBILE
      : OVERVIEW_DOT_PX_DESKTOP

  // Blend screen diameter with camera animation progress (viewBox zoom ratio).
  const zoomT =
    overviewVb.width <= 0
      ? 0
      : Math.min(
          1,
          Math.max(
            0,
            (overviewVb.width - viewBox.width) /
              Math.max(1, overviewVb.width - detailVb.width),
          ),
        )
  const screenDotPx =
    overviewScreenDotPx + (detailScreenDotPx - overviewScreenDotPx) * zoomT
  const dotR = userSpaceDotRadius(
    screenDotPx,
    viewBox,
    size.width,
    size.height,
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
        if (el.dataset.mappable !== '1') continue
        const oi = optionIndex.get(vote.optionId) ?? 0
        const style = votedDotStyle(oi)
        el.setAttribute('fill', style.fill)
        el.setAttribute('stroke', style.stroke)
        el.dataset.state = 'voted'
        // Glow only when zoomed — overview glow merges into a blob.
        if (camera === 'detail') {
          el.classList.add('sim-map-dot--landed', 'sim-map-dot--glow')
          window.setTimeout(() => {
            el.classList.remove('sim-map-dot--glow')
          }, 450)
        } else {
          el.classList.add('sim-map-dot--landed')
        }
      }
    }
    prevVoted.current = votedCount
  }, [votedCount, data.votes, dots, optionIndex, camera])

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

  // Keep circle radii in sync with camera without remounting.
  useEffect(() => {
    for (const dot of dots) {
      const el = circleRefs.current[dot.index]
      if (!el) continue
      el.setAttribute('r', String(dotR))
    }
  }, [dotR, dots])

  const padCls = phoneScale
    ? 'px-2.5 pb-2 pt-11'
    : mobileLayout
      ? 'px-1 pb-1 pt-8'
      : compact
        ? 'px-1.5 pb-1.5 pt-8'
        : 'px-2 pb-2 pt-9 sm:px-3 sm:pt-10'

  void beat

  const contextLabelSize = phoneScale ? 8 : mobileLayout ? 6.5 : 8
  const activeLabelSize = phoneScale ? 12 : mobileLayout ? 10 : 12

  const showCameraControl = !hideCameraControl
  const cameraBtnLabel =
    camera === 'detail' ? 'Ver toda la CDMX' : 'Acercar'

  return (
    <div
      className={`sim-map relative flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-amber-500/25 bg-gradient-to-b from-[#121820] via-[#0f1419] to-[#0c1015]${
        camera === 'overview' ? ' sim-map--overview' : ' sim-map--detail'
      }`}
      data-sim-map="true"
      data-camera={camera}
      data-mobile={mobileLayout ? '1' : '0'}
      style={
        {
          '--sim-map-dot-size': `${screenDotPx}px`,
        } as CSSProperties
      }
    >
      <SimMark subtitle="reproducción" compact={compact} phoneScale={phoneScale} />

      {showCameraControl ? (
        <button
          type="button"
          data-sim-map-camera="1"
          className={`absolute z-20 rounded border border-slate-500/70 bg-[#0f1419]/90 font-medium text-slate-200 hover:border-slate-400 hover:bg-slate-800/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
            phoneScale
              ? 'left-2.5 top-2.5 px-2 py-1 text-[10px]'
              : mobileLayout
                ? 'left-1.5 top-1.5 px-1.5 py-0.5 text-[9px]'
                : 'left-2 top-2 px-2 py-1 text-[10px] sm:left-3 sm:top-3'
          }`}
          onClick={() =>
            setUserCamera(camera === 'detail' ? 'overview' : 'detail')
          }
        >
          {cameraBtnLabel}
        </button>
      ) : null}

      <div className={`relative flex min-h-0 flex-1 flex-col ${padCls}`}>
        <div ref={wrapRef} className="relative min-h-0 flex-1">
          {geoError ? (
            <div className="flex h-full items-center justify-center px-4 text-center text-[11px] text-slate-500">
              {geoError}
            </div>
          ) : projection && size.width > 0 && size.height > 0 ? (
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox={viewBoxToString(viewBox)}
              width={size.width}
              height={size.height}
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label="Mapa de la simulación — Ciudad de México, muestra Cuauhtémoc y Miguel Hidalgo"
            >
              <g className="sim-map-alcaldias" aria-hidden="true">
                {alcaldiaPaths.map((p) =>
                  p.active ? (
                    <path
                      key={p.key}
                      d={p.d}
                      fill="rgba(148, 163, 184, 0.14)"
                      stroke="rgba(203, 213, 225, 0.75)"
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
                    stroke="rgba(148, 163, 184, 0.32)"
                    strokeWidth={mobileLayout ? 0.4 : 0.5}
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
                    className={l.active ? 'fill-slate-200' : 'fill-slate-600'}
                    style={{
                      fontSize: l.active ? activeLabelSize : contextLabelSize,
                      fontWeight: l.active ? 600 : 500,
                      letterSpacing: l.active ? '0.04em' : '0.02em',
                      textTransform: 'uppercase',
                      opacity: l.active ? 0.8 : 0.42,
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
                      r={dotR}
                      fill={style.fill}
                      stroke={style.stroke}
                      strokeWidth={mobileLayout ? 0.9 : 1.1}
                      vectorEffect="non-scaling-stroke"
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
            ) : usingLocationFallback ? (
              <p
                className="shrink-0 leading-tight text-amber-200/80"
                data-sim-map-fallback="1"
              >
                Ubicaciones aproximadas (colonia/alcaldía)
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
