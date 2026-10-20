'use client'

import { OBS_COLORS as C, OBS_INSUFFICIENT, OBS_LEGAL_CAP_PCT, OBS_MIN_N, OBS_VOLUNTARY_NOTE } from '@/lib/observatorio-rentas/config'
import { RISK_LABEL, fmtInt, fmtMoney, fmtPct, fmtWeek, type HistBin, type RiskCategory, type WeeklyPoint } from '@/lib/observatorio-rentas/model'

export const RISK_COLOR: Record<RiskCategory, string> = { within: C.within, near: C.near, above: C.above, nodata: C.nodata }

export function SimTag({ children = 'Datos simulados' }: { children?: React.ReactNode }) {
  return <span className="obs-sim inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">{children}</span>
}

/** Light diagonal «SIMULACIÓN» mark so any screenshot is self-labelled. */
export function SimWatermark() {
  return <div className="obs-watermark" aria-hidden><span>SIMULACIÓN</span></div>
}

export function Panel({ title, children, className = '', right, watermark = true }: { title?: string; children: React.ReactNode; className?: string; right?: React.ReactNode; watermark?: boolean }) {
  return (
    <section className={`obs-panel p-4 relative overflow-hidden ${className}`}>
      {watermark && <SimWatermark />}
      {title && (
        <div className="flex items-center gap-2 mb-3">
          <h2 className="obs-label">{title}</h2>
          <span className="ml-auto">{right}</span>
        </div>
      )}
      {children}
    </section>
  )
}

export function Kpi({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="obs-panel p-3" style={{ background: C.panel2 }}>
      <div className="obs-label !text-[10px]">{label}</div>
      <div className="obs-h text-2xl mt-1">{value}</div>
      {sub && <div className="text-xs obs-muted mt-1">{sub}</div>}
    </div>
  )
}

/** Renders a report-based figure or the density-honesty placeholder. */
export function NGuard({ n, children }: { n: number; children: React.ReactNode }) {
  if (n < OBS_MIN_N) return <span className="text-sm font-semibold obs-muted">{OBS_INSUFFICIENT}</span>
  return <>{children}</>
}

export function NNote({ n, kind = 'reportes' }: { n: number; kind?: string }) {
  return (
    <p className="text-xs obs-muted mt-2">
      n = {fmtInt(n)} {kind} · {OBS_VOLUNTARY_NOTE}
    </p>
  )
}

export function RiskChip({ risk }: { risk: RiskCategory }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: RISK_COLOR[risk] + '22', color: risk === 'nodata' ? '#C9D4D7' : RISK_COLOR[risk], border: `1px solid ${RISK_COLOR[risk]}66` }}>
      <span aria-hidden className="inline-block w-2 h-2 rounded-full" style={{ background: RISK_COLOR[risk] }} />
      {RISK_LABEL[risk]}
    </span>
  )
}

export function WatchBadge() {
  return <span className="inline-block rounded-full px-2 py-0.5 text-xs font-bold" style={{ border: `1.5px solid ${C.turquoise}`, color: C.turquoise }}>A vigilar</span>
}

/** Weekly asking rent (indexed) vs inflation line. */
export function RentVsInflation({ weekly, inflation, height = 200, title }: { weekly: WeeklyPoint[]; inflation: number; height?: number; title: string }) {
  const W = 640, H = height, P = { l: 52, r: 14, t: 12, b: 26 }
  const base = weekly[0]?.rent || 1
  const idx = weekly.map((p) => (p.rent / base) * 100)
  const infl = weekly.map((_, i) => 100 * (1 + (inflation / 100) * (i / 52)))
  const all = [...idx, ...infl]
  const min = Math.floor(Math.min(...all) - 0.5), max = Math.ceil(Math.max(...all) + 0.5)
  const x = (i: number) => P.l + (i / (weekly.length - 1)) * (W - P.l - P.r)
  const y = (v: number) => P.t + (1 - (v - min) / (max - min)) * (H - P.t - P.b)
  const line = (arr: number[]) => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const ticks = [min, (min + max) / 2, max]
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={title}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="#1F2A2E" />
            <text x={P.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#9AA8AD">{t.toFixed(0)}</text>
          </g>
        ))}
        {[0, Math.floor(weekly.length / 2), weekly.length - 1].map((i) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="11" fill="#9AA8AD">{fmtWeek(weekly[i].w)}</text>
        ))}
        <path d={line(infl)} fill="none" stroke="#9AA8AD" strokeDasharray="5 4" strokeWidth="2" />
        <path d={line(idx)} fill="none" stroke={C.mint} strokeWidth="2.5" />
      </svg>
      <figcaption className="flex flex-wrap gap-4 text-xs obs-muted mt-1">
        <span><span style={{ color: C.mint }}>━</span> Renta anunciada (índice, semana 1 = 100) · última: {fmtMoney(weekly[weekly.length - 1].rent)}</span>
        <span>┅ Inflación {fmtPct(inflation)} anual (referencia)</span>
      </figcaption>
    </figure>
  )
}

export function RenewalHistogram({ hist, title }: { hist: HistBin[]; title: string }) {
  const W = 640, H = 190, P = { l: 36, r: 10, t: 12, b: 30 }
  const max = Math.max(1, ...hist.map((b) => b.count))
  const bw = (W - P.l - P.r) / hist.length
  const capIdx = hist.findIndex((b) => b.from === OBS_LEGAL_CAP_PCT)
  const capX = P.l + capIdx * bw
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={title}>
        {hist.map((b, i) => {
          const h = (b.count / max) * (H - P.t - P.b)
          const over = b.from >= OBS_LEGAL_CAP_PCT
          return (
            <g key={i}>
              <rect x={P.l + i * bw + 3} y={H - P.b - h} width={bw - 6} height={h} rx="3" fill={over ? C.above : C.within} opacity="0.85" />
              <text x={P.l + i * bw + bw / 2} y={H - P.b - h - 4} textAnchor="middle" fontSize="11" fill="#C9D4D7">{b.count}</text>
              <text x={P.l + i * bw + bw / 2} y={H - 10} textAnchor="middle" fontSize="10" fill="#9AA8AD">{b.to == null ? `≥${b.from}%` : `${b.from}–${b.to}%`}</text>
            </g>
          )
        })}
        <line x1={capX} x2={capX} y1={P.t - 4} y2={H - P.b} stroke="#fff" strokeWidth="2" strokeDasharray="4 3" />
        <text x={capX + 4} y={P.t + 8} fontSize="11" fill="#fff">Tope {fmtPct(OBS_LEGAL_CAP_PCT, 2)}</text>
      </svg>
      <figcaption className="text-xs obs-muted">Distribución de aumentos en renovación (número de reportes por rango).</figcaption>
    </figure>
  )
}

export function HBars({ rows, max = 100, unit = '%', title }: { rows: { label: string; value: number; color?: string }[]; max?: number; unit?: string; title: string }) {
  return (
    <ul aria-label={title} className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="text-sm">
          <div className="flex justify-between gap-2"><span>{r.label}</span><span className="font-bold tabular-nums">{unit === '%' ? fmtPct(r.value) : fmtInt(r.value)}</span></div>
          <div className="h-2 rounded bg-[#1F2A2E] mt-1"><div className="h-2 rounded" style={{ width: `${Math.min(100, (r.value / max) * 100)}%`, background: r.color ?? C.turquoise }} /></div>
        </li>
      ))}
    </ul>
  )
}
