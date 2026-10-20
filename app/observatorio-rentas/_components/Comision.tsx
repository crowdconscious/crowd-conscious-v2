'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { OBS_DEMO_PASSCODE, OBS_INFLATION_12M_PCT, OBS_INITIATIVE_DATE, OBS_THRESHOLDS as T } from '@/lib/observatorio-rentas/config'
import { aggregate, coloniaRisk, alcaldiaAggregates, alerts, fmtInt, fmtPct, fmtWeek, isWatch, type Seed } from '@/lib/observatorio-rentas/model'
import { MapHome } from './MapHome'
import { OBS_BASE, useObs } from './ObsShell'
import { HBars, NNote, Panel, RentVsInflation, RiskChip, SimTag, WatchBadge, RISK_COLOR } from './ui'

export const KEY = 'obs-comision-ok'
type Tab = 'tablero' | 'ley' | 'alertas' | 'reportes' | 'invi'
const TABS: [Tab, string][] = [['tablero', 'Tablero'], ['ley', 'Antes y después de la ley'], ['alertas', 'Alertas'], ['reportes', 'Centro de reportes'], ['invi', 'Vivienda INVI y corto plazo']]

function specPerWeek(seed: Seed) {
  return seed.meta.weeks.map((w, i) => ({ w, count: seed.spec_per_week[i] }))
}

function Bars({ rows }: { rows: { w: string; count: number | null }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count ?? 0))
  return (
    <figure>
      <div className="flex items-end gap-[3px] h-36" role="img" aria-label="Colonias con señal de especulación por semana">
        {rows.map((r) => <div key={r.w} title={`${fmtWeek(r.w)}: ${r.count ?? 'n/d'}`} className="flex-1 rounded-t" style={{ height: `${((r.count ?? 0) / max) * 100}%`, background: '#2BB3C0', opacity: r.count == null ? 0.2 : 1 }} />)}
      </div>
      <figcaption className="flex justify-between text-xs obs-muted mt-1"><span>{fmtWeek(rows[0].w)}</span><span>Colonias con señal por semana (último: {rows[rows.length - 1].count})</span><span>{fmtWeek(rows[rows.length - 1].w)}</span></figcaption>
    </figure>
  )
}

function LawTimeline({ seed }: { seed: Seed }) {
  const W = 760, H = 240, P = { l: 60, r: 120, t: 24, b: 30 }
  const pts = seed.city_weekly
  const vals = pts.map((p) => p.rent)
  const min = Math.min(...vals) * 0.99, max = Math.max(...vals) * 1.01
  const n = pts.length
  const x = (i: number) => P.l + (i / (n - 1)) * (W - P.l - P.r)
  const y = (v: number) => P.t + (1 - (v - min) / (max - min)) * (H - P.t - P.b)
  const t0 = new Date(pts[0].w).getTime(), t1 = new Date(pts[n - 1].w).getTime()
  const ix = (iso: string) => ((new Date(iso).getTime() - t0) / (t1 - t0)) * (n - 1)
  const mx = x(ix(OBS_INITIATIVE_DATE))
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Renta anunciada en la ciudad alrededor del envío de la iniciativa">
        <path d={pts.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.rent)}`).join('')} fill="none" stroke="#3DDC97" strokeWidth="2.5" />
        {[min, max].map((v) => <text key={v} x={P.l - 6} y={y(v) + 4} fontSize="11" textAnchor="end" fill="#9AA8AD">${Math.round(v).toLocaleString('es-MX')}</text>)}
        <line x1={mx} x2={mx} y1={P.t - 10} y2={H - P.b} stroke="#2BB3C0" strokeWidth="2" />
        <text x={mx - 6} y={P.t - 12} fontSize="11" textAnchor="end" fill="#2BB3C0">14 oct 2026 · iniciativa enviada</text>
        <line x1={W - P.r + 60} x2={W - P.r + 60} y1={P.t} y2={H - P.b} stroke="#9AA8AD" strokeDasharray="4 4" />
        <text x={W - P.r + 60} y={H - P.b + 16} fontSize="11" textAnchor="middle" fill="#9AA8AD">Publicación de la ley</text>
        <text x={W - P.r + 60} y={H - P.b + 28} fontSize="10" textAnchor="middle" fill="#9AA8AD">(pendiente)</text>
        {[0, Math.floor(n / 2), n - 1].map((i) => <text key={i} x={x(i)} y={H - 8} fontSize="11" textAnchor="middle" fill="#9AA8AD">{fmtWeek(pts[i].w)}</text>)}
      </svg>
      <figcaption className="text-xs obs-muted">Renta mediana anunciada en la ciudad (26 semanas). Cuando se publique la ley, la línea punteada marcará el inicio de la evaluación.</figcaption>
    </figure>
  )
}

export function Comision() {
  const { data } = useObs()
  const seed = data!
  const [ok, setOk] = useState(false)
  const [code, setCode] = useState('')
  const [err, setErr] = useState(false)
  const sp = useSearchParams()
  const [tab, setTab] = useState<Tab>((sp.get('tab') as Tab) || 'tablero')
  useEffect(() => { const t = sp.get('tab') as Tab | null; if (t) setTab(t) }, [sp])
  const [busy, setBusy] = useState<string | null>(null)
  useEffect(() => { setOk(sessionStorage.getItem(KEY) === '1') }, [sp])
  const aggs = useMemo(() => alcaldiaAggregates(seed), [seed])
  const city = useMemo(() => aggregate('cdmx', 'CDMX', seed.colonias), [seed])
  const al = useMemo(() => alerts(seed), [seed])
  const spec = useMemo(() => specPerWeek(seed), [seed])

  if (!ok) {
    return (
      <div className="max-w-md mx-auto mt-10">
        <Panel title="Espacio de la Comisión">
          <p className="text-sm mb-3">Espacio privado de la Comisión de Vivienda. Ingresa la clave de demostración.</p>
          <form onSubmit={(e) => { e.preventDefault(); if (code.trim() === OBS_DEMO_PASSCODE) { sessionStorage.setItem(KEY, '1'); setOk(true) } else setErr(true) }} className="space-y-3">
            <label className="block text-sm">Clave<input className="obs-input mt-1" type="password" autoComplete="off" value={code} onChange={(e) => { setCode(e.target.value); setErr(false) }} /></label>
            {err && <p role="alert" className="text-sm" style={{ color: '#E5604D' }}>Clave incorrecta.</p>}
            <button className="obs-btn obs-btn-primary w-full justify-center" type="submit">Entrar</button>
          </form>
          <p className="text-xs obs-muted mt-3">Clave de demostración, no es un control de acceso real.</p>
        </Panel>
      </div>
    )
  }

  const run = async (k: string, fn: (r: typeof import('./reports')) => Promise<void> | void) => { setBusy(k); try { await fn(await import('./reports')) } finally { setBusy(null) } }
  const sorted = [...aggs].sort((a, b) => b.pct_renewals_above_cap - a.pct_renewals_above_cap)
  const invi = seed.colonias.filter((c) => c.near_invi_housing).sort((a, b) => b.short_term_listings - a.short_term_listings)

  return (
    <div className="space-y-4" data-tour="comision">
      <div className="flex flex-wrap items-end gap-3">
        <div><p className="obs-label">Espacio de la Comisión de Vivienda</p><h1 className="obs-h text-2xl sm:text-3xl">Tablero ejecutivo</h1></div>
        <SimTag />
        <button className="obs-btn ml-auto text-xs" onClick={() => { sessionStorage.removeItem(KEY); setOk(false) }}>Salir</button>
      </div>
      <div role="tablist" aria-label="Secciones del espacio" className="flex flex-wrap gap-1.5">
        {TABS.map(([id, l]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} data-tour={`tab-${id}`} className="rounded-lg px-3 py-1.5 text-sm font-semibold" style={{ background: tab === id ? '#2BB3C0' : '#141C1F', color: tab === id ? '#07090A' : '#C9D4D7' }}>{l}{id === 'alertas' && ` (${al.length})`}</button>)}
      </div>

      {tab === 'tablero' && (
        <>
          <MapHome commission />
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Renta anunciada vs inflación · CDMX · 26 semanas"><RentVsInflation weekly={seed.city_weekly} inflation={OBS_INFLATION_12M_PCT} title="Renta anunciada en la ciudad frente a la inflación" /></Panel>
            <Panel title="Señal de especulación por semana"><Bars rows={spec} /></Panel>
            <Panel title="% de renovaciones sobre el tope por alcaldía" className="lg:col-span-2">
              <HBars title="% de renovaciones sobre el tope por alcaldía" rows={sorted.map((a) => ({ label: a.nombre, value: a.pct_renewals_above_cap, color: RISK_COLOR[a.risk] }))} max={Math.max(...sorted.map((a) => a.pct_renewals_above_cap))} />
              <NNote n={city.renewal_reports_n} />
            </Panel>
          </div>
        </>
      )}
      {tab === 'ley' && <Panel title="Antes y después de la ley"><LawTimeline seed={seed} /><p className="text-sm mt-3">Desde el envío de la iniciativa, el índice semanal permite separar dos efectos: alzas de precio de entrada (anuncios) y cumplimiento en renovaciones (reportes). Variación de 4 semanas en la ciudad: <strong>{fmtPct(city.asking_change_4w)}</strong>.</p></Panel>}
      {tab === 'alertas' && (
        <Panel title="Colonias que cambiaron de categoría en las últimas 4 semanas">
          <ul className="divide-y" style={{ borderColor: '#1F2A2E' }}>
            {al.map((x, i) => (
              <li key={i} className="py-2.5 flex flex-wrap items-center gap-2 text-sm" style={{ borderColor: '#1F2A2E' }}>
                <Link className="font-semibold underline min-w-[180px]" href={`${OBS_BASE}/ficha/${x.colonia.id}`}>{x.colonia.nombre}</Link>
                <span className="obs-muted">{x.colonia.alcaldia}</span>
                <span className="flex items-center gap-1.5">{x.from === 'watch-off' ? <span className="obs-muted">sin señal</span> : <RiskChip risk={x.from} />}<span aria-hidden>→</span>{x.to === 'watch' ? <WatchBadge /> : <RiskChip risk={x.to} />}</span>
                <span className="w-full text-xs obs-muted">Por qué: {x.why}.</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {tab === 'reportes' && (
        <div className="grid gap-3 sm:grid-cols-2" data-tour="reportes">
          {([
            ['boletin', 'Boletín semanal', 'PDF, 2 páginas: cifras principales, mapa, top 10 colonias a vigilar y nota metodológica.', [['Descargar PDF', (r) => r.downloadBoletin(seed)]]],
            ['fichas', 'Ficha por alcaldía', 'PDF, 1 página por alcaldía. También las 16 en un ZIP.', [['Descargar las 16 (ZIP)', (r) => r.downloadAllFichasZip(seed)], ['Cuauhtémoc (PDF)', (r) => r.downloadFicha(seed, '09015')]]],
            ['brief', 'Brief para el dictamen', 'PDF, 4–6 páginas: contexto, brecha de cumplimiento, señal de especulación, intenciones de oferta, limitaciones y anexo metodológico. Tono neutral, sin recomendaciones.', [['Descargar PDF', (r) => r.downloadBrief(seed)]]],
            ['datos', 'Datos abiertos', 'Agregados por colonia, con hoja de diccionario de datos.', [['CSV', (r) => r.downloadCsv(seed)], ['XLSX', (r) => r.downloadXlsx(seed)]]],
          ] as [string, string, string, [string, (r: typeof import('./reports')) => Promise<void> | void][]][]).map(([k, t, d, btns]) => (
            <Panel key={k} title={t} right={<SimTag>Simulación</SimTag>}>
              <p className="text-sm obs-muted">{d}</p>
              <div className="flex flex-wrap gap-2 mt-3">{btns.map(([l, fn]) => <button key={l} data-tour={k === 'brief' ? 'brief' : undefined} className="obs-btn obs-btn-primary" disabled={!!busy} onClick={() => run(k + l, fn)}>{busy === k + l ? 'Generando…' : l}</button>)}</div>
            </Panel>
          ))}
        </div>
      )}
      {tab === 'invi' && (
        <Panel title="Vivienda INVI y renta de corto plazo">
          <p className="text-sm obs-muted mb-3">Colonias cercanas a vivienda del INVI con densidad de anuncios de corto plazo. Sólo agregados por colonia, nunca viviendas individuales.</p>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left obs-label !text-[10px]"><th className="py-2">Colonia</th><th>Alcaldía</th><th className="text-right">Anuncios corto plazo</th><th className="text-right">Intención de pasar a corto plazo</th><th>Cumplimiento</th></tr></thead>
            <tbody>{invi.map((c) => <tr key={c.id} className="border-t" style={{ borderColor: '#1F2A2E' }}><td className="py-1.5">{c.nombre}</td><td className="obs-muted">{c.alcaldia}</td><td className="text-right tabular-nums">{fmtInt(c.short_term_listings)}</td><td className="text-right tabular-nums">{c.landlord_reports_n < 25 ? 'Muestra insuficiente (n<25)' : fmtPct(c.pct_plan_short_term)}</td><td><RiskChip risk={coloniaRisk(c)} />{isWatch(c.asking_change_12m, c.asking_change_4w) && <span className="ml-1"><WatchBadge /></span>}</td></tr>)}</tbody></table></div>
        </Panel>
      )}
    </div>
  )
}
